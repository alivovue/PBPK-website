export const modules = [
  {
    id: 'math', code: 'MAT', title: 'Pecahan & Rasio', world: 'Menara Kalkulus',
    progress: 72, lessons: 8, completed: 5, color: 'amber', icon: 'Sigma',
    description: 'Taklukkan teka-teki pedagang dimensi dan pulihkan keseimbangan rasio.',
    reward: '320 EXP', status: 'Lanjutkan',
  },
  {
    id: 'science', code: 'IPA', title: 'Sistem Tata Surya', world: 'Observatorium Astra',
    progress: 46, lessons: 7, completed: 3, color: 'cyan', icon: 'Orbit',
    description: 'Telusuri orbit yang terganggu oleh serpihan data milik NULL.',
    reward: '280 EXP', status: 'Mulai bab 4',
  },
  {
    id: 'history', code: 'IPS', title: 'Jalur Rempah', world: 'Pelabuhan Kala',
    progress: 18, lessons: 6, completed: 1, color: 'rose', icon: 'Map',
    description: 'Susun ulang rute dagang dunia lama sebelum portal sejarah runtuh.',
    reward: '260 EXP', status: 'Lanjutkan',
  },
  {
    id: 'language', code: 'B. ID', title: 'Teks Argumentasi', world: 'Arsip Seribu Suara',
    progress: 0, lessons: 5, completed: 0, color: 'violet', icon: 'Quill',
    description: 'Asah pendapatmu dan buka segel perpustakaan festival.',
    reward: '240 EXP', status: 'Mulai misi',
  },
]

export const characters = [
  { id: 'aurelia', name: 'Aurelia', title: 'Penjaga Fajar', universe: 'Astravia', role: 'Strategis', level: 18, power: 1280, rarity: 'Legendaris', color: 'gold', owned: true },
  { id: 'bimo', name: 'Bimo 404', title: 'Pendekar Meme', universe: 'Jaringan Tua', role: 'Penyerang', level: 16, power: 1160, rarity: 'Epik', color: 'cyan', owned: true },
  { id: 'ibn', name: 'Ibn Sina', title: 'Sang Polymath', universe: 'Bumi Historis', role: 'Pendukung', level: 14, power: 1095, rarity: 'Epik', color: 'green', owned: true },
  { id: 'momo', name: 'Momo', title: 'Slime Pustaka', universe: 'Rawa Aksara', role: 'Pelindung', level: 11, power: 890, rarity: 'Langka', color: 'rose', owned: true },
  { id: 'cipher', name: 'Cipher-9', title: 'Saksi Anomali', universe: 'Tidak Diketahui', role: 'Pengacau', level: 20, power: 1510, rarity: 'Mitos', color: 'violet', owned: false },
  { id: 'kartini', name: 'R.A. Kartini', title: 'Pelita Pengetahuan', universe: 'Bumi Historis', role: 'Strategis', level: 17, power: 1235, rarity: 'Legendaris', color: 'amber', owned: false },
]

export const quests = [
  { title: 'Pelajar Tekun', detail: 'Selesaikan 2 pelajaran', progress: 1, total: 2, reward: '80 Koin', icon: 'book' },
  { title: 'Pikiran Tajam', detail: 'Jawab benar 10 soal', progress: 7, total: 10, reward: '120 EXP', icon: 'spark' },
  { title: 'Duel Harian', detail: 'Menangkan 1 pertarungan', progress: 0, total: 1, reward: '1 Tiket', icon: 'sword' },
]

export const leaderboard = [
  { rank: 1, name: 'NaraBintang', tier: 'Roh Astral III', rating: 1842, color: 'gold' },
  { rank: 2, name: 'AksaNova', tier: 'Roh Astral II', rating: 1790, color: 'cyan' },
  { rank: 3, name: 'MiraRune', tier: 'Roh Astral II', rating: 1754, color: 'rose' },
  { rank: 4, name: 'Kamu · Raka', tier: 'Inti Cendekia IV', rating: 1648, color: 'violet', current: true },
  { rank: 5, name: 'SoraKecil', tier: 'Inti Cendekia III', rating: 1612, color: 'green' },
]

export const skillNodes = [
  { id: 'logic', label: 'Logika Dasar', x: 50, y: 85, state: 'done' },
  { id: 'focus', label: 'Fokus', x: 24, y: 47, state: 'done' },
  { id: 'analysis', label: 'Analisis', x: 50, y: 47, state: 'active' },
  { id: 'memory', label: 'Memori', x: 76, y: 47, state: 'locked' },
  { id: 'insight', label: 'Wawasan', x: 36, y: 14, state: 'locked' },
  { id: 'synthesis', label: 'Sintesis', x: 64, y: 14, state: 'locked' },
]
