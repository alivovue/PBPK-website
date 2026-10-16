const fs = require('node:fs');
const path = require('node:path');
const { createTfIdfRetriever } = require('../tfidf-retriever');
const { fuseRankedCandidates } = require('../hybrid-retriever');

const root = path.resolve(__dirname, '../../..');
const corpus = JSON.parse(fs.readFileSync(path.join(root, 'backend/chatbot/data/materials.json'), 'utf8'));
const golden = JSON.parse(fs.readFileSync(path.join(__dirname, 'golden-set-performance-tuning.json'), 'utf8'));
const modeArg = process.argv.find((arg) => arg.startsWith('--mode='));
const mode = modeArg ? modeArg.split('=')[1] : 'tfidf';
const semanticUrl = process.env.INDOBERT_URL || 'http://127.0.0.1:3010';
const rankConstantArg = process.argv.find((arg) => arg.startsWith('--rrf-k='));
const rankConstant = rankConstantArg ? Number(rankConstantArg.split('=')[1]) : 10;
const semanticWeightArg = process.argv.find((arg) => arg.startsWith('--semantic-weight='));
const semanticWeight = semanticWeightArg ? Number(semanticWeightArg.split('=')[1]) : 0.1;
if (!['tfidf', 'indobert', 'hybrid', 'both'].includes(mode) || !Number.isFinite(rankConstant) || rankConstant < 1 || !Number.isFinite(semanticWeight) || semanticWeight < 0) {
  process.stderr.write('Mode valid: --mode=tfidf|indobert|hybrid|both; opsi: --rrf-k=10 --semantic-weight=0.5\n');
  process.exit(2);
}

const retrieveTfidf = createTfIdfRetriever(corpus);
async function retrieveIndobert(question, limit = 3) {
  const response = await fetch(`${semanticUrl}/search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: question }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error(`IndoBERT service returned HTTP ${response.status}`);
  const body = await response.json();
  return (body.matches || []).slice(0, limit);
}
async function retrieveHybrid(question) {
  const [semanticMatches, lexicalMatches] = await Promise.all([
    retrieveIndobert(question, 10),
    Promise.resolve(retrieveTfidf(question, 10)),
  ]);
  if ((semanticMatches[0]?.score ?? 0) >= 0.32) {
    return fuseRankedCandidates({ semanticMatches, lexicalMatches, limit: 3, rankConstant, semanticWeight });
  }
  return lexicalMatches.slice(0, 3);
}

async function evaluateRetriever(name, retrieve) {
  const scoredQuestions = [];
  const outOfScopeQuestions = [];
  const ambiguousQuestions = [];
  for (const item of golden.questions) {
    const matches = await retrieve(item.question);
    const pages = matches.map((match) => match.document?.page ?? match.page);
    const topScore = matches[0]?.score ?? null;
    if (item.expected_pages.length) {
      const rank = pages.findIndex((page) => item.expected_pages.includes(page));
      scoredQuestions.push({ ...item, pages, rank: rank < 0 ? null : rank + 1 });
    } else if (item.kind === 'out_of_scope') {
      const accepted = (name === 'IndoBERT semantic service' || name.startsWith('Hybrid RRF')) && (topScore ?? 0) < 0.32 ? [] : pages;
      outOfScopeQuestions.push({ ...item, pages: accepted, topScore });
    } else if (item.kind === 'ambiguous') {
      ambiguousQuestions.push({ ...item, pages });
    }
  }

  const hits1 = scoredQuestions.filter((item) => item.rank === 1).length;
  const hits3 = scoredQuestions.filter((item) => item.rank !== null).length;
  const reciprocalRankSum = scoredQuestions.reduce((sum, item) => sum + (item.rank ? 1 / item.rank : 0), 0);
  const outOfScopeHits = outOfScopeQuestions.filter((item) => item.pages.length > 0).length;
  const summary = {
    mode: name,
    evaluated: scoredQuestions.length,
    hitAt1: Number((hits1 / scoredQuestions.length).toFixed(3)),
    hitAt3: Number((hits3 / scoredQuestions.length).toFixed(3)),
    mrrAt3: Number((reciprocalRankSum / scoredQuestions.length).toFixed(3)),
    outOfScopeRetrieved: `${outOfScopeHits}/${outOfScopeQuestions.length}`,
  };

  console.log(`\n## ${name}`);
  console.log(`Hit@1 ${(summary.hitAt1 * 100).toFixed(1)}% | Hit@3 ${(summary.hitAt3 * 100).toFixed(1)}% | MRR@3 ${summary.mrrAt3.toFixed(3)} | out-of-scope candidates ${summary.outOfScopeRetrieved}`);
  for (const kind of [...new Set(scoredQuestions.map((item) => item.kind))]) {
    const group = scoredQuestions.filter((item) => item.kind === kind);
    const groupHits = group.filter((item) => item.rank !== null).length;
    console.log(`${kind}: Hit@3 ${(100 * groupHits / group.length).toFixed(1)}% (${groupHits}/${group.length})`);
  }
  for (const item of scoredQuestions) {
    const expected = item.expected_pages.join('/');
    console.log(`${item.rank ? 'HIT ' : 'MISS'} ${item.id} ${item.kind} expected=${expected} got=${item.pages.join(',') || '-'}`);
  }
  for (const item of [...outOfScopeQuestions, ...ambiguousQuestions]) {
    console.log(`REVIEW ${item.id} ${item.kind} candidates=${item.pages.join(',') || '-'}`);
  }
  return summary;
}

(async () => {
  const summaries = [];
  if (mode === 'tfidf' || mode === 'both') summaries.push(await evaluateRetriever('TF-IDF production fallback', async (question) => retrieveTfidf(question)));
  if (mode === 'indobert' || mode === 'both') {
    try {
      const health = await fetch(`${semanticUrl}/health`, { signal: AbortSignal.timeout(2_000) });
      if (!health.ok) throw new Error(`health endpoint returned HTTP ${health.status}`);
      summaries.push(await evaluateRetriever('IndoBERT semantic service', retrieveIndobert));
    } catch (error) {
      throw new Error(`IndoBERT service belum siap di ${semanticUrl}. Jalankan backend/server.js lebih dulu. Detail: ${error.message}`);
    }
  }
  if (mode === 'hybrid' || mode === 'both') {
    try {
      const health = await fetch(`${semanticUrl}/health`, { signal: AbortSignal.timeout(2_000) });
      if (!health.ok) throw new Error(`health endpoint returned HTTP ${health.status}`);
      summaries.push(await evaluateRetriever(`Hybrid RRF (k=${rankConstant}, sem=${semanticWeight})`, retrieveHybrid));
    } catch (error) {
      throw new Error(`IndoBERT service belum siap di ${semanticUrl}. Jalankan backend/server.js lebih dulu. Detail: ${error.message}`);
    }
  }
  if (summaries.length > 1) {
    console.log('\n## Ringkasan perbandingan');
    console.table(summaries);
  }
})().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
