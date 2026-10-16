const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { generateWithGemini } = require('./gemini-client');
const { createTfIdfRetriever } = require('./tfidf-retriever');
const { fuseRankedCandidates } = require('./hybrid-retriever');
const { resolveAcceptedExplanation } = require('./followup');
const { detectChatIntent } = require('./chat-intents');

const ROOT = path.resolve(__dirname, '../..');
const DATA_FILE = path.join(__dirname, 'data', 'materials.json');

function loadLocalEnv() {
  const envFile = path.resolve(__dirname, '..', '.env');
  if (!fs.existsSync(envFile)) return;
  for (const line of fs.readFileSync(envFile, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (!match || match[1] in process.env) continue;
    process.env[match[1]] = match[2].replace(/^(['"])(.*)\1$/, '$2');
  }
}
loadLocalEnv();

const PORT = Number(process.env.PORT || 3000);
const SEMANTIC_URL = 'http://127.0.0.1:3010';
const SEMANTIC_THRESHOLD = Number(process.env.INDOBERT_MIN_SCORE || 0.32);
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.8-flash';
const MAX_BODY_BYTES = 8_000;
const WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 30;
const chunks = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
const retrieve = createTfIdfRetriever(chunks);
const requestCounts = new Map();
let indobertProcess = null;

async function retrieveSemantic(query) {
  try {
    const response = await fetch(`${SEMANTIC_URL}/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: query }),
      // Semantic search must not leave the chat spinner running for minutes.
      // If the model is still loading, the local lexical search is used instead.
      signal: AbortSignal.timeout(8_000),
    });
    if (!response.ok) return null;
    const result = await response.json();
    if (!Array.isArray(result.matches)) return null;
    return result.matches.map((item) => ({ document: item, score: item.score, semantic: true }));
  } catch {
    return null;
  }
}

function sendJson(response, status, value) {
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  });
  response.end(JSON.stringify(value));
}

function serveStatic(request, response) {
  const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
  const relative = pathname === '/'
    ? 'frontend/index.html'
    : pathname.startsWith('/frontend/')
      ? pathname.slice(1)
      : path.join('frontend', pathname.slice(1));
  const target = path.resolve(ROOT, relative);
  if (!target.startsWith(`${ROOT}${path.sep}`) || !fs.existsSync(target) || !fs.statSync(target).isFile()) {
    response.writeHead(404);
    response.end('Not found');
    return;
  }
  const mime = target.endsWith('.css') ? 'text/css; charset=utf-8'
    : target.endsWith('.js') ? 'text/javascript; charset=utf-8'
      : target.endsWith('.json') ? 'application/json; charset=utf-8'
        : 'text/html; charset=utf-8';
  response.writeHead(200, { 'Content-Type': mime, 'X-Content-Type-Options': 'nosniff' });
  fs.createReadStream(target).pipe(response);
}

const server = http.createServer((request, response) => {
  if (request.method === 'GET' && request.url === '/api/status') {
    return sendJson(response, 200, { backendVersion: 'hybrid-rrf-v1' });
  }
  if (request.method === 'POST' && request.url === '/api/chat') {
    const now = Date.now();
    const client = request.socket.remoteAddress || 'local';
    const recent = (requestCounts.get(client) || []).filter((stamp) => now - stamp < WINDOW_MS);
    if (recent.length >= MAX_REQUESTS_PER_WINDOW) {
      return sendJson(response, 429, { error: 'Beri System jeda sebentar sebelum bertanya lagi.' });
    }
    recent.push(now);
    requestCounts.set(client, recent);

    let body = '';
    request.on('data', (part) => {
      body += part;
      if (Buffer.byteLength(body) > MAX_BODY_BYTES) {
        request.destroy();
      }
    });
    request.on('end', async () => {
      try {
        const payload = JSON.parse(body || '{}');
        const question = typeof payload.message === 'string' ? payload.message.trim() : '';
        const provider = payload.provider === 'gemini' ? 'gemini' : 'indobert';
        if (!question || question.length > 1_000) {
          return sendJson(response, 400, { error: 'Tulis pertanyaan (maksimal 1.000 karakter).' });
        }
        const intent = detectChatIntent(question);
        if (intent === 'greeting') {
          return sendJson(response, 200, {
            reply: 'Hai! Aku System, asisten belajarmu. Aku bisa bantu belajar Performance Tuning: indeks dan skema database, query, transaksi, hardware/RAID, atau benchmark. Kamu ingin mulai dari yang mana?',
            sources: [],
            retrieval: 'chat-intent',
            provider,
          });
        }
        if (intent === 'thanks') {
          return sendJson(response, 200, {
            reply: 'Sama-sama! Semoga makin paham materinya. Kalau mau, kita bisa lanjut belajar konsep lain atau latihan soal 😊',
            sources: [],
            retrieval: 'chat-intent',
            provider,
          });
        }
        if (intent === 'module-overview') {
          const outline = chunks.find((chunk) => chunk.page === 4);
          const sources = outline ? [{ page: outline.page, text: outline.text, score: 1 }] : [];
          const reply = 'Di modul Performance Tuning ini ada beberapa topik utama:\n\n• Overview dan dasar performance tuning\n• Index dan schema tuning\n• Query tuning\n• Transaction tuning\n• Hardware tuning, termasuk RAID dan pengelolaan memori\n• Performance simulation\n• Performance benchmark\n\nMau mulai belajar indeks database, atau ada topik lain yang menarik buatmu?';
          return sendJson(response, 200, { reply, sources, retrieval: 'module-outline', provider });
        }
        const acceptedExplanation = resolveAcceptedExplanation(question, payload.history);
        const retrievalQuestion = acceptedExplanation?.contextQuestion || question;
        const semanticCandidates = await retrieveSemantic(retrievalQuestion);
        const lexicalCandidates = retrieve(retrievalQuestion, 10);
        const semanticConfident = Boolean(semanticCandidates?.length)
          && semanticCandidates[0].score >= SEMANTIC_THRESHOLD;
        const matches = semanticConfident
          ? fuseRankedCandidates({ semanticMatches: semanticCandidates, lexicalMatches: lexicalCandidates, limit: 3, rankConstant: 10, semanticWeight: 0.1 })
          : lexicalCandidates.slice(0, 3);
        const retrieval = semanticConfident ? 'hybrid-rrf' : 'tfidf-fallback';
        if (!matches.length && provider !== 'gemini' && !acceptedExplanation) {
          return sendJson(response, 200, {
            reply: semanticCandidates?.length
              ? 'System belum yakin modul ini membahas pertanyaan tersebut. Coba tanyakan tentang indeks, tuning query, transaksi, perangkat keras/RAID, atau benchmark.'
              : 'System belum menemukan bagian yang cocok di modul ini. Coba sebutkan kata kunci, misalnya indeks, query, transaksi, RAID, atau benchmark.',
            sources: [],
            retrieval,
            confidence: semanticCandidates?.[0]?.score ?? null,
          });
        }
        const sources = matches.map(({ document, score }) => ({ page: document.page, text: document.text, score: Number(score.toFixed(2)) }));
        if (provider === 'gemini' || acceptedExplanation) {
          const generated = await generateWithGemini({ question: acceptedExplanation?.generationQuestion || question, sources, history: payload.history, apiKey: process.env.GEMINI_API_KEY, model: GEMINI_MODEL });
          if (generated.error) return sendJson(response, 502, { error: generated.error });
          return sendJson(response, 200, { reply: generated.reply, sources, retrieval, provider: 'gemini', model: generated.model, followUp: Boolean(acceptedExplanation) });
        }
        const best = matches[0].document;
        const preview = best.text.length > 480 ? `${best.text.slice(0, 477).trimEnd()}...` : best.text;
        return sendJson(response, 200, {
          reply: `System menemukan bagian yang mungkin membantu (halaman ${best.page}).\n\n${preview}\n\nKetik “mau” kalau kamu ingin penjelasan sederhana dengan analogi.`,
          sources,
          retrieval,
          provider,
        });
      } catch {
        return sendJson(response, 400, { error: 'Pesan tidak terbaca. Coba kirim ulang.' });
      }
    });
    return;
  }

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    response.writeHead(405, { Allow: 'GET, HEAD, POST' });
    return response.end();
  }
  return serveStatic(request, response);
});

server.listen(PORT, () => {
  console.log(`System demo siap: http://localhost:${PORT}`);
  console.log('Backend flow: hybrid-rrf-v1');
  console.log(`Materi dimuat: ${chunks.length} potongan dari PDF kuliah.`);
  const python = path.resolve(ROOT, '.venv', 'Scripts', 'python.exe');
  if (fs.existsSync(python) && process.env.INDOBERT_EXTERNAL !== '1') {
    indobertProcess = spawn(python, [path.join(__dirname, 'indobert_service.py')], {
      cwd: ROOT,
      env: { ...process.env, HF_HUB_DISABLE_SYMLINKS_WARNING: '1' },
      stdio: ['ignore', 'inherit', 'inherit'],
      windowsHide: true,
    });
    indobertProcess.on('error', (error) => console.error(`IndoBERT service unavailable; TF-IDF fallback active: ${error.message}`));
    indobertProcess.on('exit', (code) => {
      indobertProcess = null;
      console.warn(`IndoBERT service stopped (${code}); TF-IDF fallback active.`);
    });
  } else if (process.env.INDOBERT_EXTERNAL === '1') {
    console.log(`Menggunakan service IndoBERT eksternal di ${SEMANTIC_URL}.`);
  } else {
    console.log('IndoBERT dependencies not installed; TF-IDF fallback active. See README setup.');
  }
});

function stopChildren() {
  if (indobertProcess) indobertProcess.kill();
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 2_000).unref();
}
process.on('SIGINT', stopChildren);
process.on('SIGTERM', stopChildren);
