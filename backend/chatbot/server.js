// Private bridge for FastAPI. Browsers use /api/v1/system-ai, never this port.
const http = require('node:http');
const { createChatbot } = require('./chatbot');

const chatbot = createChatbot();
const MAX_BODY_BYTES = 512000;

function sendJson(response, status, value) {
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff',
  });
  response.end(JSON.stringify(value));
}

const server = http.createServer(async (request, response) => {
  if (request.method === 'GET' && request.url === '/api/status') {
    return sendJson(response, 200, await chatbot.status());
  }
  if (request.method !== 'POST' || request.url !== '/api/chat') {
    return sendJson(response, 404, { error: 'Not found' });
  }
  try {
    let length = 0;
    const parts = [];
    for await (const part of request) {
      length += part.length;
      if (length > MAX_BODY_BYTES) {
        return sendJson(response, 413, { error: 'Request too large' });
      }
      parts.push(part);
    }
    const payload = JSON.parse(Buffer.concat(parts).toString('utf8'));
    if (!payload || typeof payload.message !== 'string' || !payload.message.trim() || payload.message.length > 1000
      || (payload.history !== undefined && (!Array.isArray(payload.history) || payload.history.length > 12))
      || (payload.documents !== undefined && (!Array.isArray(payload.documents) || payload.documents.length > 32
        || payload.documents.some(document => !document || typeof document.text !== 'string' || document.text.length > 1600)))) {
      return sendJson(response, 400, { error: 'Invalid chat request' });
    }
    try {
      return sendJson(response, 200, await chatbot.chat(payload));
    } catch (error) {
      console.error(`AURI retrieval failed: ${error.message}`);
      return sendJson(response, 503, { error: 'Pencarian IndoBERT belum siap. Tunggu model dimuat lalu coba lagi.' });
    }
  } catch {
    return sendJson(response, 400, { error: 'Pesan tidak terbaca.' });
  }
});

server.listen(Number(process.env.CHATBOT_PORT || 3001), process.env.CHATBOT_HOST || '127.0.0.1', () => {
  console.log('AURI chatbot bridge ready; public API is served by FastAPI.');
});
server.on('error', error => { console.error(error.message); process.exitCode = 1; });
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    server.close();
    server.closeAllConnections();
  });
}
