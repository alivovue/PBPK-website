# Tes chatbot

Jalankan dari root proyek:

```powershell
node backend/chatbot/tests/run-audit.js
```

Untuk evaluasi retrieval saja, jalankan `node backend/chatbot/tests/evaluate-retrieval.js --mode=tfidf`. Mode `indobert`, `hybrid`, dan `both` memerlukan backend aktif agar service semantic lokal tersedia di `127.0.0.1:3010`.

Tes Gemini menggunakan mock lokal dan tidak membaca `backend/.env` atau menghubungi API Google.
