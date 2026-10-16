const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '../../..');
const checks = [];
function record(name, passed, detail = '') {
  checks.push({ name, passed, detail });
  process.stdout.write(`${passed ? 'PASS' : 'FAIL'} ${name}${detail ? ` — ${detail}` : ''}\n`);
}

for (const file of ['backend/chatbot/server.js', 'backend/chatbot/chatbot.js', 'backend/chatbot/template-responder.js', 'backend/chatbot/tfidf-retriever.js', 'backend/chatbot/hybrid-retriever.js', 'backend/chatbot/followup.js', 'backend/chatbot/chat-intents.js', 'backend/chatbot/tests/evaluate-retrieval.js']) {
  const result = spawnSync(process.execPath, ['--check', file], { cwd: root, encoding: 'utf8' });
  record(`Syntax ${file}`, result.status === 0, (result.stderr || result.stdout).trim());
}

const runtimeFiles = ['backend/chatbot/server.js', 'backend/chatbot/chatbot.js', 'frontend/src/components/AuriChat.jsx', 'frontend/index.html'];
const runtimeText = runtimeFiles.map((file) => fs.readFileSync(path.join(root, file), 'utf8')).join('\n');
record('No generative model dependency in runtime', !/gemini|gemma|ollama|GEMINI_API_KEY|generativelanguage\.googleapis\.com/i.test(runtimeText));
record('No provider switch in frontend', !/data-provider|mode-tabs|tab-gemini/i.test(runtimeText));

const goldenSet = JSON.parse(fs.readFileSync(path.join(__dirname, 'golden-set-performance-tuning.json'), 'utf8'));
const materialPages = new Set(JSON.parse(fs.readFileSync(path.join(root, 'backend/chatbot/data/materials.json'), 'utf8')).map((chunk) => chunk.page));
const goldenIds = goldenSet.questions.map((item) => item.id);
const goldenValid = goldenSet.questions.length === 30
  && new Set(goldenIds).size === goldenIds.length
  && goldenSet.questions.every((item) => item.question && ['in_scope', 'paraphrase', 'typo', 'ambiguous', 'out_of_scope'].includes(item.kind)
    && item.expected_pages.every((page) => materialPages.has(page)));
record('Golden set integrity (30 unique questions/pages)', goldenValid);

for (const [name, file] of [
  ['Integrated chatbot tests', 'chatbot.test.js'],
  ['Hybrid rank fusion unit tests', 'hybrid-retriever.test.js'],
  ['Contextual follow-up unit tests', 'followup.test.js'],
  ['Greeting and chat intent unit tests', 'chat-intents.test.js'],
  ['Local template response unit tests', 'template-responder.test.js'],
]) {
  const result = spawnSync(process.execPath, ['--test', `backend/chatbot/tests/${file}`], { cwd: root, encoding: 'utf8' });
  process.stdout.write(result.stdout || '');
  if (result.stderr) process.stderr.write(result.stderr);
  const pass = result.stdout.match(/(?:# pass|ℹ pass) (\d+)/)?.[1] || '0';
  const fail = result.stdout.match(/(?:# fail|ℹ fail) (\d+)/)?.[1] || '0';
  record(name, result.status === 0, `${pass} passed, ${fail} failed`);
}

const retrievalEval = spawnSync(process.execPath, ['backend/chatbot/tests/evaluate-retrieval.js', '--mode=tfidf'], { cwd: root, encoding: 'utf8' });
if (retrievalEval.stdout) process.stdout.write(retrievalEval.stdout);
if (retrievalEval.stderr) process.stderr.write(retrievalEval.stderr);
const retrievalMetric = retrievalEval.stdout.match(/Hit@1 .*$/m)?.[0] || '';
record('Golden set retrieval baseline', retrievalEval.status === 0, retrievalMetric);

const passed = checks.filter((check) => check.passed).length;
const failed = checks.length - passed;
process.stdout.write(`\nAudit: ${passed}/${checks.length} lulus; ${failed} gagal.\n`);
if (failed) process.exitCode = 1;
