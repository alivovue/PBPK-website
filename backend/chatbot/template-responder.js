const { normalize } = require('./chat-intents');

const SOCIAL_REPLIES = {
  greeting: 'Hai! Aku System, teman belajarmu 😊 Kita bisa bahas indeks, query, transaksi, RAID, atau benchmark dari modul ini. Kamu mau mulai dari mana?',
  identity: 'Aku System, asisten belajar di ruang ini. Aku bisa bantu mencari sumber dari modul dan menjelaskan beberapa konsep dengan ringkasan belajar.',
  capabilities: 'Aku bisa ngobrol ringan, mencari bagian modul, memberi penjelasan ringkas untuk topik yang didukung, dan membantu kamu lanjut dari pertanyaan sebelumnya. Coba tanya “apa itu index database?”',
  smalltalk: 'Wkwk, siap nemenin 😄 Mau lanjut belajar atau istirahat sebentar?',
  thanks: 'Sama-sama! Kalau masih ada bagian yang membingungkan, kirim istilah atau pertanyaannya ya 😊',
};

const EXPLANATIONS = [
  {
    test: /\b(?:index|indexes|indices|indeks)\b/u,
    text: 'Bayangkan indeks di belakang buku: kamu mencari kata kunci di indeks untuk tahu lokasi halaman, tanpa memeriksa semua halaman satu per satu. Database memakai struktur indeks agar pencarian data bisa lebih efisien. Indeks membantu akses data, tetapi tetap perlu dikelola bersama tabelnya.',
  },
  {
    test: /\braid\s*1\b|mirroring/u,
    text: 'RAID 1 bekerja dengan mirroring: data disalin ke lebih dari satu disk. Gampangnya seperti punya salinan cadangan yang terus diperbarui. Kalau satu disk bermasalah, salinan pada disk lain dapat membantu menjaga ketersediaan data. Karena ada salinan, kapasitas penyimpanan efektifnya lebih kecil daripada total kapasitas semua disk.',
  },
  {
    test: /\braid\s*5\b|parity/u,
    text: 'RAID 5 menyimpan data bersama informasi parity. Parity membantu sistem membangun kembali data ketika satu disk gagal. Pendekatan ini memakai kapasitas lebih efisien daripada mirroring penuh, tetapi proses penulisan dan pemulihan datanya punya biaya performa.',
  },
  {
    test: /\b(?:transaksi|transaction|contention|kontensi|locking|penguncian)\b/u,
    text: 'Transaksi adalah rangkaian operasi database yang diperlakukan sebagai satu unit kerja. Saat transaksi berjalan lama, sumber daya atau kunci bisa tertahan lebih lama sehingga transaksi lain harus menunggu. Itulah salah satu penyebab contention.',
  },
  {
    test: /\b(?:query|kueri|sql)\b/u,
    text: 'Query adalah permintaan untuk membaca atau mengubah data di database. Query tuning berarti mencari cara agar permintaan itu dikerjakan lebih efisien, misalnya dengan memeriksa pola akses data dan indeks yang dipakai.',
  },
  {
    test: /\b(?:benchmark|tolok ukur|kinerja|performa)\b/u,
    text: 'Benchmark adalah pengujian terukur untuk melihat kinerja sistem pada beban kerja tertentu. Hasilnya berguna untuk membandingkan konfigurasi, selama beban dan cara pengukurannya konsisten.',
  },
];

function buildTemplateReply({ question, intent, sources = [] }) {
  if (SOCIAL_REPLIES[intent]) return SOCIAL_REPLIES[intent];
  if (!sources.length) {
    return 'Aku belum menemukan kutipan modul yang cukup untuk menjelaskan topik itu dengan yakin. Coba sebutkan istilah yang lebih spesifik, misalnya index, query, transaksi, RAID, atau benchmark.';
  }

  const normalizedQuestion = normalize(question);
  const explanation = EXPLANATIONS.find((item) => item.test.test(normalizedQuestion));
  const page = sources[0].page;
  if (explanation) {
    return `${explanation.text}\n\nRingkasan belajar berdasarkan materi yang ditemukan di halaman ${page}. Bagian mana yang mau dibahas lebih dalam?`;
  }

  const excerpt = String(sources[0].text || '').trim();
  return `Aku menemukan bagian yang berkaitan di halaman ${page}. Intinya, materi ini membahas:\n\n“${excerpt}”\n\nAku belum punya ringkasan khusus untuk subtopik ini. Istilah mana yang paling membingungkan?`;
}

module.exports = { buildTemplateReply };
