const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta';

async function generateWithGemini({ question, sources, history = [], apiKey, model, fetchImpl = fetch, sleepImpl = (ms) => new Promise((resolve) => setTimeout(resolve, ms)) }) {
  if (!apiKey) {
    return { error: 'Gemini belum dikonfigurasi. Simpan API key baru di backend/.env sebagai GEMINI_API_KEY, lalu mulai ulang server.' };
  }

  const evidence = sources.map((source, index) =>
    `[Sumber ${index + 1} — halaman ${source.page}]\n${source.text.slice(0, 1_600)}`
  ).join('\n\n');
  const safeHistory = Array.isArray(history) ? history : [];
  const contents = safeHistory
    .filter((turn) => turn && ['user', 'model'].includes(turn.role) && typeof turn.text === 'string')
    .slice(-8)
    .map((turn) => ({ role: turn.role, parts: [{ text: turn.text.slice(0, 1_500) }] }));
  contents.push({
    role: 'user',
    parts: [{ text: `Pertanyaan siswa: ${question}\n\nKutipan materi yang ditemukan oleh pencarian IndoBERT:\n${evidence}` }],
  });

  const modelCandidates = [...new Set([model, 'gemini-3.7-flash'])];
  let lastStatus = 0;
  let lastApiMessage = '';
  for (const candidate of modelCandidates) {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      let response;
      try {
        response = await fetchImpl(`${GEMINI_API_URL}/models/${encodeURIComponent(candidate)}:generateContent`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
          body: JSON.stringify({
            system_instruction: {
              parts: [{ text: 'Kamu adalah System, tutor belajar yang ramah untuk siswa. Jawab dalam bahasa Indonesia yang jelas, alami, dan sesuai usia siswa. Jika ada kutipan materi, gunakan sebagai sumber utama dan sebutkan halaman yang relevan; bedakan dengan jelas bila menambahkan pengetahuan umum. Jika tidak ada kutipan yang cocok, tetap tanggapi sapaan atau pertanyaan umum dengan membantu, tetapi beri tahu siswa bahwa jawaban itu tidak ditemukan di modul. Jangan mengarang nomor halaman atau isi modul. Jelaskan bertahap, gunakan analogi sederhana bila membantu, dan untuk soal latihan berikan petunjuk sebelum jawaban.' }],
            },
            contents,
            generationConfig: { temperature: 0.4, maxOutputTokens: 700 },
          }),
          signal: AbortSignal.timeout(25_000),
        });
      } catch {
        return { error: 'Koneksi ke Gemini terputus atau melewati batas waktu. Coba kirim ulang.' };
      }

      const result = await response.json().catch(() => ({}));
      if (response.ok) {
        const reply = result.candidates?.[0]?.content?.parts
          ?.map((part) => part.text || '')
          .join('')
          .trim();
        if (!reply) return { error: 'Gemini tidak mengembalikan jawaban teks. Coba kirim ulang.' };
        return { reply, model: candidate };
      }

      lastStatus = response.status;
      lastApiMessage = typeof result.error?.message === 'string' ? result.error.message.slice(0, 240) : '';
      if (response.status === 503 && candidate !== modelCandidates.at(-1)) break;
      if (![429, 500, 503].includes(response.status) || attempt === 1) break;
      await sleepImpl(500 * (2 ** attempt));
    }
  }

  if (lastStatus === 503) return { error: 'Layanan Gemini sedang padat (503), termasuk model cadangan. Tunggu sebentar lalu coba lagi.' };
  if (lastStatus === 429) return { error: 'Batas permintaan/kuota Gemini tercapai (429). Periksa kuota API atau coba lagi setelah jeda.' };
  if ([400, 401, 403, 404].includes(lastStatus)) {
    return { error: `Gemini menolak konfigurasi (HTTP ${lastStatus}). Periksa API key baru, akses model, dan nama model. ${lastApiMessage}`.trim() };
  }
  return { error: `Gemini gagal (HTTP ${lastStatus || 'tidak diketahui'}). ${lastApiMessage || 'Coba lagi.'}` };
}

module.exports = { generateWithGemini };
