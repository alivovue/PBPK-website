const fs = require('node:fs');
const path = require('node:path');
const { resolveContextualQuestion } = require('./followup');
const { detectChatIntent, normalizeMaterialQuery } = require('./chat-intents');
const { buildTemplateReply } = require('./template-responder');

const chunks = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'materials.json'), 'utf8'));
const socialIntents = new Set(['greeting', 'identity', 'capabilities', 'smalltalk', 'thanks']);

function createChatbot({ semanticUrl = process.env.AI_SEMANTIC_URL || 'http://127.0.0.1:3010', fetchImpl = fetch } = {}) {
  const threshold = Number(process.env.INDOBERT_MIN_SCORE || 0.32);

  async function status() {
    try {
      const response = await fetchImpl(`${semanticUrl}/health`, { signal: AbortSignal.timeout(1500) });
      if (!response.ok) throw new Error('Semantic service not ready');
      const health = await response.json();
      return { ready: health.ready === true, retrievalModel: health.model, responder: 'template-local' };
    } catch {
      return { ready: false, retrievalModel: process.env.INDOBERT_MODEL || 'quarkss/indobert-base-stsb', responder: 'template-local' };
    }
  }

  async function chat({ message, history = [], documents }) {
    const intent = detectChatIntent(message);
    const question = resolveContextualQuestion(message, history) || message;
    let sources = [];
    let confidence = null;
    let retrieval = 'chat';
    if (!socialIntents.has(intent)) {
      let matches;
      if (documents === undefined && intent === 'module-overview') {
        retrieval = 'material-outline';
        const outline = chunks.find(chunk => chunk.page === 4);
        matches = outline ? [{ ...outline, score: 1 }] : [];
      } else if (Array.isArray(documents) && documents.length === 0) {
        matches = [];
      } else {
        retrieval = 'indobert-semantic';
        const response = await fetchImpl(`${semanticUrl}/search`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: normalizeMaterialQuery(question), ...(documents === undefined ? {} : { documents }) }),
          signal: AbortSignal.timeout(25000),
        });
        if (!response.ok) throw new Error('Semantic search unavailable');
        matches = (await response.json()).matches;
        if (!Array.isArray(matches)) throw new Error('Invalid semantic search response');
      }
      if (matches[0] && Number(matches[0].score) >= threshold) {
        confidence = Number(matches[0].score);
        sources = matches.slice(0, 3).map(item => ({
          text: item.text, score: Number(Number(item.score).toFixed(4)),
          ...(item.page == null ? {} : { page: item.page }),
          ...(item.title == null ? {} : { title: item.title }),
          ...(item.lesson_id == null ? {} : { lesson_id: item.lesson_id, topic_id: item.topic_id }),
        }));
      }
    }
    return {
      reply: buildTemplateReply({ question, intent, sources, lessonContext: documents !== undefined }),
      sources, retrieval: sources.length ? retrieval : 'chat',
      generator: 'template-local', confidence,
    };
  }
  return { status, chat };
}

module.exports = { createChatbot };
