const test = require('node:test');
const assert = require('node:assert/strict');
const { generateWithGemini } = require('../gemini-client');

const source = { page: 12, text: 'RAID meningkatkan keandalan dan kinerja penyimpanan.' };
const answer = (text = 'RAID menggabungkan beberapa disk. [Halaman 12]') => new Response(JSON.stringify({
  candidates: [{ content: { parts: [{ text }] } }],
}), { status: 200, headers: { 'Content-Type': 'application/json' } });
const failure = (status, message) => new Response(JSON.stringify({ error: { message } }), {
  status,
  headers: { 'Content-Type': 'application/json' },
});
const baseInput = {
  question: 'Apa itu RAID?',
  sources: [source],
  history: [],
  apiKey: 'audit-dummy-key',
  model: 'gemini-3.8-flash',
  sleepImpl: async () => {},
};

test('sukses mengirim prompt ke endpoint Google dan memulihkan model jawaban', async () => {
  let captured;
  const result = await generateWithGemini({
    ...baseInput,
    fetchImpl: async (url, options) => {
      captured = { url, options, body: JSON.parse(options.body) };
      return answer();
    },
  });

  assert.equal(result.reply, 'RAID menggabungkan beberapa disk. [Halaman 12]');
  assert.equal(result.model, 'gemini-3.8-flash');
  assert.match(captured.url, /^https:\/\/generativelanguage\.googleapis\.com\/v1beta\/models\/gemini-3\.8-flash:generateContent$/);
  assert.equal(captured.options.headers['x-goog-api-key'], 'audit-dummy-key');
  assert.match(captured.body.contents.at(-1).parts[0].text, /RAID meningkatkan keandalan/);
});

test('503 dari model utama beralih ke model cadangan', async () => {
  const urls = [];
  const result = await generateWithGemini({
    ...baseInput,
    fetchImpl: async (url) => {
      urls.push(url);
      return urls.length === 1 ? failure(503, 'overloaded') : answer('Balasan model cadangan.');
    },
  });

  assert.equal(result.reply, 'Balasan model cadangan.');
  assert.equal(result.model, 'gemini-3.7-flash');
  assert.equal(urls.length, 2);
  assert.match(urls[1], /gemini-3\.7-flash/);
});

test('503 berulang memberi pesan gangguan kapasitas, bukan jawaban palsu', async () => {
  let calls = 0;
  const result = await generateWithGemini({
    ...baseInput,
    fetchImpl: async () => { calls += 1; return failure(503, 'overloaded'); },
  });

  assert.equal(calls, 3);
  assert.match(result.error, /sedang padat \(503\)/);
  assert.equal(result.reply, undefined);
});

test('429 dibedakan sebagai batas kuota/permintaan', async () => {
  const result = await generateWithGemini({
    ...baseInput,
    fetchImpl: async () => failure(429, 'quota exceeded'),
  });

  assert.match(result.error, /kuota Gemini tercapai \(429\)/);
});

test('403 konfigurasi ditampilkan tanpa membocorkan nilai key', async () => {
  const result = await generateWithGemini({
    ...baseInput,
    fetchImpl: async () => failure(403, 'API key is not authorized'),
  });

  assert.match(result.error, /HTTP 403/);
  assert.doesNotMatch(result.error, /audit-dummy-key/);
});

test('timeout jaringan menghasilkan pesan yang bisa ditindaklanjuti', async () => {
  const result = await generateWithGemini({
    ...baseInput,
    fetchImpl: async () => { throw new Error('simulated timeout'); },
  });

  assert.match(result.error, /Koneksi ke Gemini terputus/);
});

test('respons tanpa teks tidak dianggap berhasil', async () => {
  const result = await generateWithGemini({
    ...baseInput,
    fetchImpl: async () => answer('   '),
  });

  assert.match(result.error, /tidak mengembalikan jawaban teks/);
});

test('key kosong tidak pernah memanggil fetch', async () => {
  let called = false;
  const result = await generateWithGemini({
    ...baseInput,
    apiKey: '',
    fetchImpl: async () => { called = true; return answer(); },
  });

  assert.equal(called, false);
  assert.match(result.error, /belum dikonfigurasi/);
});

test('riwayat dibatasi ke 8 pesan dan role yang diizinkan', async () => {
  let body;
  const history = [
    ...Array.from({ length: 9 }, (_, index) => ({ role: index % 2 ? 'model' : 'user', text: `pesan-${index}` })),
    { role: 'system', text: 'jangan ikut dikirim' },
  ];
  await generateWithGemini({
    ...baseInput,
    history,
    fetchImpl: async (_url, options) => { body = JSON.parse(options.body); return answer(); },
  });

  assert.equal(body.contents.length, 9); // delapan pesan lama + pertanyaan baru
  assert.deepEqual(body.contents.slice(0, 8).map((turn) => turn.parts[0].text),
    Array.from({ length: 8 }, (_, index) => `pesan-${index + 1}`));
  assert.ok(body.contents.every((turn) => ['user', 'model'].includes(turn.role)));
});
