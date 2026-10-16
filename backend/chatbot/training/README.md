# Fine-tune retrieval IndoBERT

Chatbot sekarang memakai `quarkss/indobert-base-stsb`, model sentence-embedding IndoBERT yang **sudah** di-fine-tune untuk kemiripan kalimat. Script di folder ini melanjutkan fine-tuning untuk tugas pencarian materi. Model ini hanya mengambil kutipan materi dan tidak menghasilkan jawaban bebas.

## Persiapkan data berlabel

Buat dua file JSONL yang terpisah: train dan validation. Satu baris untuk satu pertanyaan:

```json
{"query":"indeks itu buat apa?","positive":"Index supports efficient access to records by search key...","negative":"A transaction is a logical unit of database work..."}
```

`positive` harus berupa kutipan materi yang benar-benar menjawab pertanyaan. `negative` adalah kutipan yang tampak mirip/topiknya berdekatan tetapi bukan jawaban. Buat paraphrase pertanyaan dengan bahasa siswa yang berbeda. Jangan menaruh query yang sama di train dan validation. Usahakan setidaknya 50 query train dan 10 validation untuk demo; makin banyak dan beragam lebih baik. Golden set yang ada hanya 30 pertanyaan evaluasi dan bukan dataset train yang cukup.

## Instalasi dan training (Windows PowerShell)

Jalankan dari root proyek:

```powershell
.\.venv\Scripts\python.exe -m pip install -r backend\chatbot\training\requirements.txt
.\.venv\Scripts\python.exe backend\chatbot\training\finetune_embeddings.py `
  --train backend\chatbot\training\train.jsonl `
  --validation backend\chatbot\training\validation.jsonl
```

Opsional: `--epochs 2 --batch-size 8 --learning-rate 2e-5 --output backend/chatbot/models/indobert-demo-01`.
Model awal diunduh dari Hugging Face jika belum tercache. Training di GPU biasanya lebih cepat; CPU tetap bisa jalan namun dapat memakan waktu. Dataset kecil tetap berisiko overfit.

Script menghitung MRR@3 dan Hit@3 pada validation **sebelum dan sesudah** training. Ia hanya mengekspor bobot ke folder output yang baru jika metrik naik; hasil yang gagal tidak mengganti model aktif. Validation harus berisi hard negative agar skor retrieval bermakna. Jangan memilih checkpoint berdasarkan loss train saja.

## Aktifkan hasil setelah lolos evaluasi

Uji hasil di terminal baru tanpa mengubah default model:

```powershell
$env:INDOBERT_MODEL = (Resolve-Path backend\chatbot\models\indobert-demo-01).Path
python -m uvicorn app.main:app --app-dir backend
```

Bandingkan retrieval pada golden set dari terminal lain, pastikan jawabannya tidak lebih buruk, baru putuskan apakah nama model di konfigurasi lokal akan diganti. Jangan commit file bobot; folder `backend/chatbot/models/` di-ignore. Simpan skrip, data berlabel yang boleh dibagikan, metrik, dan versi dependency agar eksperimen bisa diulang.

## Batas template

- Tiny dataset tidak membuat model otomatis “makin pintar”; kualitas label dan hard negative lebih penting daripada jumlah epoch.
- Dataset validasi kecil membuat metrik tidak stabil. Jangan klaim lolos hanya karena satu angka membaik.
- Data materi harus punya izin untuk dipakai dan dibagikan. Hilangkan informasi pribadi dari pertanyaan siswa.
