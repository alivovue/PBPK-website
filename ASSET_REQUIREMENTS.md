# Asset Requirements — Grand Convergence Academy

Dokumen ini memetakan seluruh ilustrasi yang diperlukan untuk mengganti placeholder pada prototipe tanpa mengubah struktur komponen. Semua aset harus mengikuti gaya **2D vector game**, garis bentuk tegas, bentuk sedikit kartunis, palet malam–emas–teal, dan atmosfer festival fantasi kuno dengan anomali multisemesta. Hindari tekstur realistis, pencahayaan 3D, dan suasana karnaval ceria.

## Aturan produksi

- Gunakan ruang warna sRGB dan sisakan safe area 6% pada tiap sisi.
- Ilustrasi lingkungan sebaiknya diekspor sebagai WebP; karakter, simbol, dan ikon sebagai PNG transparan.
- Nama berkas di bawah adalah kontrak yang disarankan. ID placeholder yang sama tersedia melalui atribut `data-asset-id` pada UI.
- Karakter battle menghadap ke tengah arena: karakter pemain ke kanan, lawan ke kiri.
- NULL selalu memakai bahasa visual magenta gelap, pecahan geometris, scanline blok, dan ruang negatif. Jangan memakai efek glitch fotografis yang terlalu realistis.

## Identitas dan elemen global

| ID aset | Nama berkas | Lokasi UI | Deskripsi karya | Ukuran / rasio | Transparan |
|---|---|---|---|---|---|
| `BRAND_GC_SIGIL_01` | `brand-gc-sigil.png` | Top bar | Sigil gerbang/kompas yang menyatukan huruf GC, gaya ukiran festival kuno. | 512×512 (1:1) | Ya |
| `CHAR_AURI_BUST_01` | `char-auri-bust.png` | Kartu pesan AURI di hub | Unicorn magis bijaksana, ekspresi ramah, kacamata bundar kecil, hiasan festival teal dan emas; bust 3/4. | 1200×1200 (1:1) | Ya |
| `CHAR_AURI_GUIDE_01` | `char-auri-guide.png` | Tombol bantuan dan popover AURI | Versi kepala/bahu AURI yang terbaca pada ukuran kecil. | 512×512 (1:1) | Ya |
| `ICON_CURRENCY_COIN_01` | `icon-festival-coin.png` | Top bar dan hadiah | Koin festival bermotif portal konsentris. | 256×256 (1:1) | Ya |
| `ICON_CURRENCY_GEM_01` | `icon-aether-gem.png` | Top bar dan hadiah | Kristal aether berpotongan sederhana dengan cahaya teal datar. | 256×256 (1:1) | Ya |

## Lingkungan dan latar

| ID aset | Nama berkas | Lokasi UI | Deskripsi karya | Ukuran / rasio | Transparan |
|---|---|---|---|---|---|
| `ENV_HUB_GATE_01` | `env-hub-grand-gate.webp` | Hero Festival hub | Gerbang batu raksasa, lentera rune, paviliun dunia melayang, langit senja biru gelap; megah dan misterius. | 2400×1350 (16:9) | Tidak |
| `ENV_MATH_WORLD_01` | `env-tower-calculus.webp` | Detail modul Pecahan & Rasio | Menara astronomi dengan jembatan berbentuk pecahan dan pasar antardimensi. | 1600×1000 (8:5) | Tidak |
| `ENV_SCIENCE_WORLD_01` | `env-astra-observatory.webp` | Detail modul Tata Surya | Observatorium kuno terbuka dengan orrery raksasa dan langit penuh portal planet. | 1600×1000 (8:5) | Tidak |
| `ENV_HISTORY_WORLD_01` | `env-time-harbor.webp` | Detail modul Jalur Rempah | Pelabuhan lintas zaman, kapal layar, peta bercahaya, dan gerbang jam batu. | 1600×1000 (8:5) | Tidak |
| `ENV_LANGUAGE_WORLD_01` | `env-thousand-voices-archive.webp` | Detail modul Teks Argumentasi | Perpustakaan vertikal dengan gulungan hidup dan mimbar debat melingkar. | 1600×1000 (8:5) | Tidak |
| `ENV_ARENA_RIFT_01` | `env-rift-arena.webp` | Latar pertarungan 1v1 | Arena batu orthographic side-view, dua posisi bertarung datar, retakan dimensi di belakang, area HUD bersih. | 2560×1440 (16:9) | Tidak |

## Karakter koleksi

Setiap tokoh membutuhkan ilustrasi kartu setengah badan dan potret UI. Arah seni harus konsisten walau berasal dari semesta berbeda.

| ID aset | Nama berkas | Lokasi UI | Deskripsi karya | Ukuran / rasio | Transparan |
|---|---|---|---|---|---|
| `CHAR_AURELIA_CARD_01` | `char-aurelia-card.png` | Koleksi | Penjaga fajar dari Astravia; zirah kain emas, astrolab bercahaya, sikap tenang dan strategis. | 1200×1600 (3:4) | Ya |
| `CHAR_BIMO_CARD_01` | `char-bimo-404-card.png` | Koleksi | Pendekar meme dari jaringan tua; jaket pixel-retro, pedang kursor, ekspresi percaya diri. | 1200×1600 (3:4) | Ya |
| `CHAR_IBN_CARD_01` | `char-ibn-sina-card.png` | Koleksi | Interpretasi penuh hormat terhadap Ibn Sina; manuskrip, instrumen ilmiah, busana historis distilisasi. | 1200×1600 (3:4) | Ya |
| `CHAR_MOMO_CARD_01` | `char-momo-slime-card.png` | Koleksi | Slime pustaka membawa buku sebagai perisai; lucu tetapi cocok dengan dunia fantasi misterius. | 1200×1600 (3:4) | Ya |
| `CHAR_CIPHER_CARD_01` | `char-cipher-9-card.png` | Koleksi terkunci | Saksi anomali bertudung, tubuh tersusun pecahan prisma ungu; identitas sengaja samar. | 1200×1600 (3:4) | Ya |
| `CHAR_KARTINI_CARD_01` | `char-kartini-card.png` | Koleksi terkunci | Interpretasi penuh hormat terhadap R.A. Kartini; kebaya, surat bercahaya, motif ukiran Jepara. | 1200×1600 (3:4) | Ya |
| `CHAR_AURELIA_PORTRAIT_01` | `char-aurelia-portrait.png` | Detail karakter dan HUD battle | Potret kepala/bahu Aurelia dalam bingkai bundar. | 512×512 (1:1) | Ya |
| `CHAR_BIMO_PORTRAIT_01` | `char-bimo-404-portrait.png` | Detail karakter | Potret kepala/bahu Bimo 404. | 512×512 (1:1) | Ya |
| `CHAR_IBN_PORTRAIT_01` | `char-ibn-sina-portrait.png` | Detail karakter | Potret kepala/bahu Ibn Sina. | 512×512 (1:1) | Ya |
| `CHAR_MOMO_PORTRAIT_01` | `char-momo-slime-portrait.png` | Detail karakter | Potret Momo yang tetap terbaca pada ukuran 42 px. | 512×512 (1:1) | Ya |
| `CHAR_CIPHER_PORTRAIT_01` | `char-cipher-9-portrait.png` | Detail karakter terkunci | Potret siluet Cipher-9 dengan pecahan prisma. | 512×512 (1:1) | Ya |
| `CHAR_KARTINI_PORTRAIT_01` | `char-kartini-portrait.png` | Detail karakter terkunci | Potret kepala/bahu R.A. Kartini. | 512×512 (1:1) | Ya |

## Pertarungan dan antagonis

| ID aset | Nama berkas | Lokasi UI | Deskripsi karya | Ukuran / rasio | Transparan |
|---|---|---|---|---|---|
| `CHAR_AURELIA_BATTLE_01` | `char-aurelia-battle-idle.png` | Arena, sisi kiri | Sprite full-body side-view Aurelia dalam pose siap, siluet terbaca dan kaki sejajar ground plane. | 1200×1600 (3:4) | Ya |
| `BOSS_NULL_ECHO_BATTLE_01` | `boss-null-echo-battle.png` | Arena, sisi kanan | Manifestasi humanoid NULL, armor data retak, wajah berupa void geometris, fragmen magenta mengarah ke kiri. | 1200×1600 (3:4) | Ya |
| `BOSS_NULL_RIFT_01` | `boss-null-rift.png` | Kartu event hub | Tangan/siluet NULL muncul dari portal data yang pecah; komposisi vertikal dramatis. | 900×1200 (3:4) | Ya |
| `BOSS_NULL_EXAM_01` | `boss-null-exam-proctor.png` | Kartu Ujian Gerbang Roh Astral | NULL sebagai pengawas ujian—mahkota sinyal, lembar data melayang, gestur mengancam namun tidak horor. | 900×1200 (3:4) | Ya |
| `FX_KNOWLEDGE_STRIKE_01` | `fx-knowledge-strike.png` | Animasi jurus battle mendatang | Sapuan energi berbentuk aksara dan simbol matematika, warna teal. | 1024×512 (2:1) | Ya |
| `FX_NULL_DAMAGE_01` | `fx-null-damage.png` | Dampak serangan battle mendatang | Pecahan blok data magenta/ungu, tepi keras dan flat. | 1024×1024 (1:1) | Ya |

## Pembelajaran, peringkat, dan progres

| ID aset | Nama berkas | Lokasi UI | Deskripsi karya | Ukuran / rasio | Transparan |
|---|---|---|---|---|---|
| `EDU_SOLAR_SYSTEM_DIAGRAM_01` | `edu-solar-system-diagram.webp` | Pelajaran Tata Surya | Diagram delapan planet akurat, label Bahasa Indonesia, orbit jelas, dibingkai seperti artefak observatorium. | 1600×900 (16:9) | Tidak |
| `ICON_LEAGUE_CORE_01` | `icon-league-core.png` | Hero Liga Inti Cendekia | Crest turnamen berupa inti kristal di dalam cincin konvergensi. | 1000×1000 (1:1) | Ya |
| `ICON_RANK_CORE_04` | `icon-rank-core-04.png` | Kartu tingkat kultivasi | Segel Inti Cendekia IV, empat lapis lingkaran rune dan pusat emas. | 1000×1000 (1:1) | Ya |
| `ICON_SUBJECT_MATH_01` | `icon-subject-math.png` | Emblem modul Matematika | Simbol rasio dan geometri dalam medali festival. | 512×512 (1:1) | Ya |
| `ICON_SUBJECT_SCIENCE_01` | `icon-subject-science.png` | Emblem modul IPA | Planet berorbit dengan komet kecil. | 512×512 (1:1) | Ya |
| `ICON_SUBJECT_HISTORY_01` | `icon-subject-history.png` | Emblem modul IPS | Kompas dan gulungan peta silang. | 512×512 (1:1) | Ya |
| `ICON_SUBJECT_LANGUAGE_01` | `icon-subject-language.png` | Emblem modul Bahasa Indonesia | Pena dan dua gelembung argumen seimbang. | 512×512 (1:1) | Ya |
| `BADGE_STEADFAST_FLAME_01` | `badge-steadfast-flame.png` | Pencapaian “Api Tekun” | Api kecil di dalam lentera rune. | 512×512 (1:1) | Ya |
| `BADGE_EXPLORER_01` | `badge-world-explorer.png` | Pencapaian “Penjelajah” | Kompas dengan tiga portal mini. | 512×512 (1:1) | Ya |
| `BADGE_STREAK_7_01` | `badge-streak-seven.png` | Pencapaian “7 Hari” | Angka tujuh yang dibentuk pita api emas. | 512×512 (1:1) | Ya |
| `BADGE_SECRET_01` | `badge-secret.png` | Slot pencapaian rahasia | Siluet segel terkunci; karya penuh baru terlihat setelah pencapaian terbuka. | 512×512 (1:1) | Ya |

## Penggantian placeholder

Komponen placeholder berada di `frontend/src/components/UI.jsx`. Untuk integrasi aset final, pertahankan ID pada `data-asset-id`, lalu ganti isi komponen dengan elemen `<img>` atau `background-image` yang mengambil berkas dari `frontend/public/assets/`. Ukuran container dan responsive behavior sudah ditetapkan di `frontend/src/styles.css`, sehingga gambar hanya perlu memakai `object-fit: cover` untuk lingkungan dan `object-fit: contain` untuk karakter/ikon.
