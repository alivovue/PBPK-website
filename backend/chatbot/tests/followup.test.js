const test = require('node:test');
const assert = require('node:assert/strict');
const { resolveContextualQuestion } = require('../followup');

const history = [
  { role: 'user', text: 'apa itu index database?' },
  { role: 'model', text: 'System menemukan bagian yang mungkin membantu (halaman 14): kutipan materi.' },
];

test('follow-up “mau” mengulang pencarian topik sebelumnya', () => {
  assert.equal(resolveContextualQuestion('mau', history), 'apa itu index database?');
  assert.equal(resolveContextualQuestion('boleh jelasin dong', history), 'apa itu index database?');
  assert.equal(resolveContextualQuestion('jelasin', history), 'apa itu index database?');
});

test('jawaban afirmatif tanpa kutipan materi bukan follow-up topik', () => {
  assert.equal(resolveContextualQuestion('mau', [
    { role: 'user', text: 'halo' }, { role: 'model', text: 'Hai, ada yang bisa kubantu?' },
  ]), null);
  assert.equal(resolveContextualQuestion('buat latihan', history), null);
});

test('follow-up pendek mewarisi pertanyaan terakhir yang substantif', () => {
  const turns = [
    ...history,
    { role: 'user', text: 'contohnya?' },
    { role: 'model', text: 'Ini kutipan materi yang terkait dengan pertanyaanmu sebelumnya.' },
  ];
  assert.equal(resolveContextualQuestion('kenapa begitu?', turns), 'apa itu index database?');
});

test('follow-up tidak dijalankan tanpa riwayat materi', () => {
  assert.equal(resolveContextualQuestion('iya', [{ role: 'model', text: 'Mau aku bantu?' }]), null);
});

test('follow-up lanjut terhubung ke jawaban yang punya sumber materi', () => {
  const history = [
    { role: 'user', text: 'Apa itu RAID 1?' },
    { role: 'model', text: 'RAID 1 menyimpan salinan data.', hasSources: true },
  ];
  assert.equal(resolveContextualQuestion('jelasin lagi', history), 'Apa itu RAID 1?');
  assert.equal(resolveContextualQuestion('jelasin', history), 'Apa itu RAID 1?');
});
