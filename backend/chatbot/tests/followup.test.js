const test = require('node:test');
const assert = require('node:assert/strict');
const { resolveAcceptedExplanation } = require('../followup');

const history = [
  { role: 'user', text: 'apa itu index database?' },
  { role: 'model', text: 'Index membantu pencarian data. Ketik “mau” kalau kamu ingin penjelasan sederhana dengan analogi.' },
];

test('jawaban “mau” mengacu ke pertanyaan terakhir setelah System menawarkan penjelasan', () => {
  assert.deepEqual(resolveAcceptedExplanation('mau', history), {
    contextQuestion: 'apa itu index database?',
    generationQuestion: 'Jelaskan dengan analogi sederhana topik dari pertanyaan siswa sebelumnya: apa itu index database?',
    kind: 'accepted-explanation',
  });
  assert.equal(resolveAcceptedExplanation('boleh jelasin dong', history)?.kind, 'accepted-explanation');
});

test('jawaban afirmatif biasa tidak mengubah pertanyaan menjadi follow-up penjelasan', () => {
  assert.equal(resolveAcceptedExplanation('mau', [{ role: 'user', text: 'halo' }, { role: 'model', text: 'Halo, ada yang bisa kubantu?' }]), null);
  assert.equal(resolveAcceptedExplanation('buat latihan', history), null);
});

test('follow-up tidak diproses jika tidak ada pertanyaan sebelumnya', () => {
  assert.equal(resolveAcceptedExplanation('iya', [{ role: 'model', text: 'Mau aku jelaskan dengan analogi?' }]), null);
});

test('pertanyaan lanjutan pendek mewarisi topik percakapan sebelumnya', () => {
  const nonOfferHistory = [
    { role: 'user', text: 'apa itu index database?' },
    { role: 'model', text: 'Index membantu pencarian data dari tabel.' },
  ];
  assert.deepEqual(resolveAcceptedExplanation('contohnya?', nonOfferHistory), {
    contextQuestion: 'apa itu index database?',
    generationQuestion: 'Jawab pertanyaan lanjutan siswa “contohnya?” dengan konteks topik dari pertanyaan sebelumnya: apa itu index database?',
    kind: 'contextual-follow-up',
  });
  assert.equal(resolveAcceptedExplanation('terus?', nonOfferHistory)?.contextQuestion, 'apa itu index database?');
});

test('beberapa follow-up berturut-turut tetap melekat ke topik terakhir yang substantif', () => {
  const multiTurnHistory = [
    { role: 'user', text: 'apa itu index database?' },
    { role: 'model', text: 'Index membantu mencari data.' },
    { role: 'user', text: 'contohnya?' },
    { role: 'model', text: 'Bayangkan katalog buku.' },
  ];
  assert.equal(resolveAcceptedExplanation('kenapa begitu?', multiTurnHistory)?.contextQuestion, 'apa itu index database?');
});
