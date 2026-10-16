# Grand Convergence Academy

Prototipe frontend React untuk RPG edukasi **Grand Convergence — Festival of Worlds**. Seluruh teks antarmuka menggunakan Bahasa Indonesia dan semua ilustrasi masih berupa placeholder flat-color yang siap diganti.

## Docker Compose

Dari root proyek, jalankan:

```bash
docker compose up
```

Frontend tersedia di **http://localhost:3000**. Backend dan dokumentasi API
tersedia di **http://localhost:8000/docs**. Docker Compose membangun image pada
penggunaan pertama; Python, Node.js, dan dependensi model sudah termasuk di image.
Tidak perlu menyalakan backend atau chatbot secara terpisah maupun membuat `.env`.

Frontend menggunakan build produksi yang disajikan Nginx. Permintaan `/api/`,
termasuk WebSocket multiplayer, diteruskan ke service backend melalui jaringan
Compose. Backend berjalan dengan satu worker untuk mempertahankan state multiplayer.

Database yang sudah ada, `backend/database/data/cultivation.db`, dipakai melalui
bind mount. Data tetap tersimpan di host setelah container dihentikan. Jika belum
ada database, backend membuatnya saat startup. Cache model IndoBERT dan signing
secret JWT disimpan di volume Docker terpisah dan dipakai kembali saat restart.

Build pertama mengunduh dependensi CPU PyTorch. Saat pertama dijalankan, AURI
mengunduh bobot model; website dapat dipakai selama model masih dimuat. Status
kesiapan AURI terlihat di panel chat.

```bash
docker compose up -d       # Jalankan di background
docker compose logs -f    # Lihat log
docker compose down       # Hentikan service; database dan volume tetap tersimpan
docker compose up --build # Bangun ulang setelah perubahan source code
```

Opsional: atur `JWT_SECRET_KEY`, `CORS_ORIGINS`, `INDOBERT_MODEL`,
`INDOBERT_THREADS`, atau `AI_REQUEST_TIMEOUT_SECONDS` lewat environment shell
atau file `.env` di root proyek. Tanpa pengaturan tambahan, secret JWT yang acak
dibuat otomatis dan disimpan secara persisten. File `backend/.env` lokal tidak
dimasukkan ke image atau dipakai oleh Compose.

## Menjalankan lokal tanpa Docker

```bash
cd frontend
npm install
npm run dev
```

Build produksi dibuat di folder `frontend/dist`:

```bash
cd frontend
npm run build
```

Lihat [`ASSET_REQUIREMENTS.md`](./ASSET_REQUIREMENTS.md) untuk daftar aset visual final, nama berkas, ukuran, dan kebutuhan transparansi.
