"""Fine-tune the existing IndoBERT sentence embedding model for course retrieval."""
from __future__ import annotations

import argparse
import json
import tempfile
from pathlib import Path

import torch
from datasets import Dataset
from sentence_transformers import SentenceTransformer, SentenceTransformerTrainer, SentenceTransformerTrainingArguments
from sentence_transformers.evaluation import InformationRetrievalEvaluator
from sentence_transformers.losses import MultipleNegativesRankingLoss

HERE = Path(__file__).resolve().parent
DEFAULT_MODEL = "quarkss/indobert-base-stsb"


def load_jsonl(path: Path) -> list[dict[str, str]]:
    rows: list[dict[str, str]] = []
    seen_queries: set[str] = set()
    for line_number, line in enumerate(path.read_text(encoding="utf-8").splitlines(), start=1):
        if not line.strip():
            continue
        try:
            row = json.loads(line)
        except json.JSONDecodeError as error:
            raise ValueError(f"{path}:{line_number}: JSON tidak valid: {error.msg}") from error
        if not all(isinstance(row.get(key), str) and row[key].strip() for key in ("query", "positive", "negative")):
            raise ValueError(f"{path}:{line_number}: wajib ada teks query, positive, dan negative")
        query, positive, negative = (row[key].strip() for key in ("query", "positive", "negative"))
        if positive == negative:
            raise ValueError(f"{path}:{line_number}: positive dan negative tidak boleh sama")
        if query in seen_queries:
            raise ValueError(f"{path}:{line_number}: query duplikat; satu query hanya boleh muncul sekali per split")
        seen_queries.add(query)
        rows.append({"query": query, "positive": positive, "negative": negative})
    if len(rows) < 2:
        raise ValueError(f"{path}: perlu minimal dua contoh berlabel")
    return rows


def retrieval_metrics(model: SentenceTransformer, rows: list[dict[str, str]], name: str) -> dict[str, float]:
    corpus_texts = list(dict.fromkeys(
        text for row in rows for text in (row["positive"], row["negative"])
    ))
    corpus_ids = {text: f"d{index}" for index, text in enumerate(corpus_texts)}
    queries = {f"q{index}": row["query"] for index, row in enumerate(rows)}
    corpus = {corpus_ids[text]: text for text in corpus_texts}
    relevant_docs = {
        f"q{index}": {corpus_ids[row["positive"]]}
        for index, row in enumerate(rows)
    }
    evaluator = InformationRetrievalEvaluator(
        queries=queries,
        corpus=corpus,
        relevant_docs=relevant_docs,
        mrr_at_k=[3],
        accuracy_at_k=[1, 3],
        ndcg_at_k=[3],
        map_at_k=[3],
        name=name,
        write_csv=False,
        show_progress_bar=False,
    )
    result = evaluator(model)
    return {key: float(value) for key, value in result.items() if isinstance(value, (int, float))}


def metric(metrics: dict[str, float], suffix: str) -> float:
    key = next((key for key in metrics if key.lower().endswith(suffix)), None)
    if key is None:
        raise RuntimeError(f"Evaluator tidak mengembalikan metrik {suffix}: {list(metrics)}")
    return metrics[key]


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--train", type=Path, required=True, help="JSONL berisi pasangan train")
    parser.add_argument("--validation", type=Path, required=True, help="JSONL terpisah untuk evaluasi")
    parser.add_argument("--model", default=DEFAULT_MODEL, help="Checkpoint Sentence Transformers awal")
    parser.add_argument("--output", type=Path, default=HERE.parent / "models" / "indobert-performance-tuning")
    parser.add_argument("--epochs", type=float, default=2)
    parser.add_argument("--batch-size", type=int, default=8)
    parser.add_argument("--learning-rate", type=float, default=2e-5)
    args = parser.parse_args()

    train_rows = load_jsonl(args.train)
    validation_rows = load_jsonl(args.validation)
    train_queries = {row["query"] for row in train_rows}
    validation_queries = {row["query"] for row in validation_rows}
    overlap = train_queries & validation_queries
    if overlap:
        raise SystemExit(f"Train/validation bocor: {len(overlap)} query muncul di kedua file.")
    if args.batch_size < 2 or args.epochs <= 0 or args.learning_rate <= 0:
        raise SystemExit("batch-size minimal 2; epochs dan learning-rate harus positif.")
    output = args.output.resolve()
    if output.exists():
        raise SystemExit(f"Folder output sudah ada: {output}. Pilih --output baru agar model lama tidak tertimpa.")

    print(f"Train: {len(train_rows)} query unik | validation: {len(validation_rows)} query unik")
    if len(train_rows) < 50 or len(validation_rows) < 10:
        print("PERINGATAN: dataset kecil; hasil demo mudah overfit. Tambahkan paraphrase manusia dan hard negative sebelum dipakai.")
    print(f"Memuat checkpoint: {args.model}")
    model = SentenceTransformer(args.model)
    before = retrieval_metrics(model, validation_rows, "baseline")
    print("Baseline validation:", json.dumps(before, ensure_ascii=False, sort_keys=True))

    columns = {
        "query": [row["query"] for row in train_rows],
        "positive": [row["positive"] for row in train_rows],
        "negative": [row["negative"] for row in train_rows],
    }
    dataset = Dataset.from_dict(columns)
    with tempfile.TemporaryDirectory(prefix="indobert-finetune-") as temporary:
        training_args = SentenceTransformerTrainingArguments(
            output_dir=temporary,
            num_train_epochs=args.epochs,
            per_device_train_batch_size=args.batch_size,
            learning_rate=args.learning_rate,
            warmup_ratio=0.1,
            logging_steps=5,
            save_strategy="no",
            report_to="none",
            seed=42,
            fp16=torch.cuda.is_available(),
            bf16=False,
        )
        trainer = SentenceTransformerTrainer(
            model=model,
            args=training_args,
            train_dataset=dataset,
            loss=MultipleNegativesRankingLoss(model),
        )
        trainer.train()

    after = retrieval_metrics(model, validation_rows, "finetuned")
    print("Fine-tuned validation:", json.dumps(after, ensure_ascii=False, sort_keys=True))
    before_score = (metric(before, "mrr@3"), metric(before, "accuracy@3"))
    after_score = (metric(after, "mrr@3"), metric(after, "accuracy@3"))
    if after_score[0] < before_score[0] or after_score[1] < before_score[1] or after_score == before_score:
        raise SystemExit(
            "Model tidak diekspor: MRR@3 atau Hit@3 validation memburuk, atau keduanya tidak naik. "
            "Perbaiki data atau hyperparameter; jangan ganti model aktif dengan hasil ini."
        )

    output.mkdir(parents=True)
    transformer = model[0]
    transformer.auto_model.save_pretrained(output)
    transformer.tokenizer.save_pretrained(output)
    print(f"Model lolos gate validation dan diekspor ke: {output}")
    print("Uji dulu dengan INDOBERT_MODEL menunjuk folder ini; model default tetap aman.")


if __name__ == "__main__":
    main()
