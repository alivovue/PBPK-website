"""Local semantic search service using an IndoBERT sentence-embedding model."""

from __future__ import annotations

import json
import os
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

import numpy as np
import torch
from transformers import AutoModel, AutoTokenizer


HERE = Path(__file__).resolve().parent
DATA_FILE = HERE / "data" / "materials.json"
MODEL_NAME = os.environ.get("INDOBERT_MODEL", "quarkss/indobert-base-stsb")
HOST = "127.0.0.1"
PORT = int(os.environ.get("INDOBERT_PORT", "3010"))
MAX_BODY = 8_000
TOP_K = 10  # Candidate pool for local hybrid rank fusion; UI still receives three sources.
QUERY_TRANSLATIONS = {
    "raid 1": "mirroring copy data across disks fault tolerant failure rebuild",
    "menjaga data": "mirror copy data across disks fault tolerant recovery",
    "apa itu": "what is",
    "kenapa": "why",
    "mengapa": "why",
    "bagaimana": "how",
    "fungsi": "purpose function",
    "kegunaan": "purpose use",
    "indeks": "index indexing",
    "transaksi": "transaction transactions",
    "panjang": "long",
    "menyebabkan": "cause result in",
    "mengakibatkan": "cause result in",
    "persaingan": "contention conflict",
    "kontensi": "contention",
    "penguncian": "lock locking",
    "kunci": "lock locking",
    "memori": "memory buffer",
    "perangkat keras": "hardware",
    "menjaga": "protect tolerate",
    "melindungi": "protect tolerate",
    "salinan": "copy mirror",
    "cermin": "mirror",
    "kerusakan": "failure fail",
    "rusak": "failure fail",
    "cepat": "fast speed performance",
    "lambat": "slow bottleneck performance",
}

chunks = json.loads(DATA_FILE.read_text(encoding="utf-8"))
print(f"Loading IndoBERT sentence-embedding model: {MODEL_NAME}", flush=True)
tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)
model = AutoModel.from_pretrained(MODEL_NAME)
model.eval()
MAX_LENGTH = min(512, int(getattr(model.config, "max_position_embeddings", 512)))


def encode(texts: list[str]) -> np.ndarray:
    inputs = tokenizer(texts, padding=True, truncation=True, max_length=MAX_LENGTH, return_tensors="pt")
    with torch.inference_mode():
        token_embeddings = model(**inputs).last_hidden_state
        mask = inputs["attention_mask"].unsqueeze(-1).expand(token_embeddings.size()).float()
        pooled = torch.sum(token_embeddings * mask, dim=1) / torch.clamp(mask.sum(dim=1), min=1e-9)
        pooled = torch.nn.functional.normalize(pooled, p=2, dim=1)
    return pooled.cpu().numpy()


print(f"Embedding {len(chunks)} material chunks on startup...", flush=True)
document_embeddings = encode([chunk["text"] for chunk in chunks])
print(f"Semantic retrieval ready at http://{HOST}:{PORT}", flush=True)


class Handler(BaseHTTPRequestHandler):
    def _json(self, status: int, payload: dict) -> None:
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self) -> None:
        if self.path == "/health":
            return self._json(200, {"ready": True, "model": MODEL_NAME, "chunks": len(chunks)})
        return self._json(404, {"error": "Not found"})

    def do_POST(self) -> None:
        if self.path != "/search":
            return self._json(404, {"error": "Not found"})
        try:
            length = int(self.headers.get("Content-Length", "0"))
            if length <= 0 or length > MAX_BODY:
                return self._json(400, {"error": "Invalid request size"})
            payload = json.loads(self.rfile.read(length))
            question = payload.get("message", "")
            if not isinstance(question, str) or not question.strip() or len(question) > 1_000:
                return self._json(400, {"error": "Invalid question"})
            original_query = question.strip()
            translated_query = original_query.lower()
            for source in sorted(QUERY_TRANSLATIONS, key=len, reverse=True):
                translated_query = translated_query.replace(source, QUERY_TRANSLATIONS[source])
            query_variants = [original_query]
            if translated_query != original_query.lower():
                query_variants.append(translated_query)
            query_embeddings = encode(query_variants)
            scores = (document_embeddings @ query_embeddings.T).max(axis=1)
            if "raid 1" in original_query.lower():
                scores += np.array([0.12 if "raid 1" in chunk["text"].lower() else 0.0 for chunk in chunks])
            best_indices = np.argsort(scores)[::-1][:TOP_K]
            matches = [
                {"page": chunks[index]["page"], "text": chunks[index]["text"],
                 "score": round(float(scores[index]), 4)}
                for index in best_indices
            ]
            return self._json(200, {"model": MODEL_NAME, "matches": matches})
        except (ValueError, json.JSONDecodeError):
            return self._json(400, {"error": "Malformed request"})
        except Exception as exc:  # keep service errors visible to the Node fallback
            print(f"Search error: {exc}", flush=True)
            return self._json(500, {"error": "Semantic search failed"})

    def log_message(self, format: str, *args) -> None:
        return


ThreadingHTTPServer((HOST, PORT), Handler).serve_forever()
