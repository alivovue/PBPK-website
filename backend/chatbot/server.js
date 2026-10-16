const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { resolveContextualQuestion } = require('./followup');
const { detectChatIntent, normalizeMaterialQuery } = require('./chat-intents');
const { buildTemplateReply } = require('./template-responder');

const ROOT = path.resolve(__dirname, '../..');
const DATA_FILE = path.join(__dirname, 'data', 'materials.json');
const PORT = Number(process.env.PORT || 3000);
const SEMANTIC_URL = 'http://127.0.0.1:3010';
const SEMANTIC_THRESHOLD = Number(process.env.INDOBERT_MIN_SCORE || 0.32);
const MAX_BODY_BYTES = 8_000;
const WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 30;
const chunks = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
const requestCounts = new Map();
let indobertProcess = null;

async function retrieveSemantic(query) {
  try {
    const response = await fetch(`${SEMANTIC_URL}/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: query }),
      signal: AbortSignal.timeout(8_000),
    });
    if (!response.ok) return null;
    const result = await response.json();
    if (!Array.isArray(result.matches)) return null;
    return result.matches;
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
    return sendJson(response, 200, {
      backendVersion: 'indobert-template-v1',
      retrievalModel: 'quarkss/indobert-base-stsb',
      responder: 'template-local',
    });
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
      if (Buffer.byteLength(body) > MAX_BODY_BYTES) request.destroy();
    });
    request.on('end', async () => {
      try {
        const payload = JSON.parse(body || '{}');
        const question = typeof payload.message === 'string' ? payload.message.trim() : '';
        if (!question || question.length > 1_000) {
          return sendJson(response, 400, { error: 'Tulis pertanyaan (maksimal 1.000 karakter).' });
        }
        const intent = detectChatIntent(question);
        const contextualQuestion = resolveContextualQuestion(question, payload.history);
        let sources = [];
        let confidence = null;

        if (!['greeting', 'identity', 'capabilities', 'smalltalk', 'thanks'].includes(intent)) {
          const retrievalQuestion = normalizeMaterialQuery(contextualQuestion || question);
          let matches;
          if (intent === 'module-overview') {
            const outline = chunks.find((chunk) => chunk.page === 4);
            matches = outline ? [{ ...outline, score: 1 }] : [];
          } else {
            matches = await retrieveSemantic(retrievalQuestion);
            if (!matches) {
              return sendJson(response, 503, {
                error: 'Service pencarian IndoBERT belum siap. Pastikan backend Python sudah selesai memuat model, lalu coba lagi.',
              });
            }
          }

          const best = matches[0];
          if (best && Number(best.score) >= SEMANTIC_THRESHOLD) {
            confidence = Number(best.score);
            sources = matches.slice(0, 3).map((item) => ({
              page: item.page,
              text: item.text,
              score: Number(Number(item.score).toFixed(2)),
            }));
          }
        }

        const reply = buildTemplateReply({ question: contextualQuestion || question, intent, sources });
        return sendJson(response, 200, {
          reply,
          sources,
          retrieval: sources.length ? 'indobert-semantic' : 'chat',
          generator: 'template-local',
          confidence,
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
  console.log('Backend flow: IndoBERT retrieval + Indonesian template explanations');
  console.log(`Materi dimuat: ${chunks.length} potongan dari PDF kuliah.`);
  const python = path.resolve(ROOT, '.venv', 'Scripts', 'python.exe');
  if (fs.existsSync(python) && process.env.INDOBERT_EXTERNAL !== '1') {
    indobertProcess = spawn(python, [path.join(__dirname, 'indobert_service.py')], {
      cwd: ROOT,
      env: { ...process.env, HF_HUB_DISABLE_SYMLINKS_WARNING: '1' },
      stdio: ['ignore', 'inherit', 'inherit'],
      windowsHide: true,
    });
    indobertProcess.on('error', (error) => console.error(`IndoBERT service gagal dimulai: ${error.message}`));
    indobertProcess.on('exit', (code) => {
      indobertProcess = null;
      console.warn(`IndoBERT service berhenti (${code}); chat retrieval tidak tersedia sampai service aktif lagi.`);
    });
  } else if (process.env.INDOBERT_EXTERNAL === '1') {
    console.log(`Menggunakan service IndoBERT eksternal di ${SEMANTIC_URL}.`);
  } else {
    console.log('Python IndoBERT belum terpasang. Ikuti langkah instalasi di README.md.');
  }
});

function stopChildren() {
  if (indobertProcess) indobertProcess.kill();
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 2_000).unref();
}
process.on('SIGINT', stopChildren);
process.on('SIGTERM', stopChildren);
