# Tes chatbot

Jalankan dari root proyek:

```powershell
node backend/chatbot/tests/run-audit.js
```

Untuk evaluasi retrieval, jalankan `node backend/chatbot/tests/evaluate-retrieval.js --mode=indobert`. Service IndoBERT lokal harus aktif di `127.0.0.1:3010`.

Integrasi website memakai FastAPI, bukan static server Node. Lihat
[`app/system_ai/README.md`](../../app/system_ai/README.md) untuk instalasi dan HTTP API.
