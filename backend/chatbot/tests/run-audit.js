const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '../../..');
const checks = [];
function record(name, passed, detail = '') {
  checks.push({ name, passed, detail });
  process.stdout.write(`${passed ? 'PASS' : 'FAIL'} ${name}${detail ? ` — ${detail}` : ''}\n`);
}

for (const file of ['backend/server.js', 'backend/chatbot/server.js', 'backend/chatbot/gemini-client.js', 'backend/chatbot/tfidf-retriever.js', 'backend/chatbot/hybrid-retriever.js', 'backend/chatbot/followup.js', 'backend/chatbot/chat-intents.js', 'frontend/app.js', 'backend/chatbot/tests/evaluate-retrieval.js']) {
  const result = spawnSync(process.execPath, ['--check', file], { cwd: root, encoding: 'utf8' });
  record(`Syntax ${file}`, result.status === 0, (result.stderr || result.stdout).trim());
}

const frontendFiles = ['frontend/app.js', 'frontend/index.html', 'frontend/style.css', 'frontend/modes.css'];
const frontendText = frontendFiles.map((file) => fs.readFileSync(path.join(root, file), 'utf8')).join('\n');
record('API key stays out of frontend', !/GEMINI_API_KEY|x-goog-api-key/i.test(frontendText));

const ignoreText = fs.readFileSync(path.join(root, '.gitignore'), 'utf8');
record('backend/.env is ignored', ignoreText.split(/\r?\n/).some((line) => line.trim() === '.env'));
const envExamplePath = path.join(root, 'backend/.env.example');
const envExample = fs.existsSync(envExamplePath) ? fs.readFileSync(envExamplePath, 'utf8') : '';
record('safe Gemini env example exists', envExample.includes('GEMINI_API_KEY=PASTE_NEW_KEY_HERE') && envExample.includes('GEMINI_MODEL='));

const clientText = fs.readFileSync(path.join(root, 'backend/chatbot/gemini-client.js'), 'utf8');
record('Gemini client targets official Google API', clientText.includes('https://generativelanguage.googleapis.com/v1beta'));
record('No configurable external API destination', !/GEMINI_API_BASE_URL|GEMINI_ENDPOINT|GEMINI_URL/.test(clientText));

const goldenSet = JSON.parse(fs.readFileSync(path.join(__dirname, 'golden-set-performance-tuning.json'), 'utf8'));
const materialPages = new Set(JSON.parse(fs.readFileSync(path.join(root, 'backend/chatbot/data/materials.json'), 'utf8')).map((chunk) => chunk.page));
const goldenIds = goldenSet.questions.map((item) => item.id);
const goldenValid = goldenSet.questions.length === 30
  && new Set(goldenIds).size === goldenIds.length
  && goldenSet.questions.every((item) => item.question && ['in_scope', 'paraphrase', 'typo', 'ambiguous', 'out_of_scope'].includes(item.kind)
    && item.expected_pages.every((page) => materialPages.has(page)));
record('Golden set integrity (30 unique questions/pages)', goldenValid);

const tests = spawnSync(process.execPath, ['--test', 'backend/chatbot/tests/gemini-client.test.js'], { cwd: root, encoding: 'utf8' });
process.stdout.write(tests.stdout || '');
if (tests.stderr) process.stderr.write(tests.stderr);
record('Gemini client unit tests', tests.status === 0, `${(tests.stdout.match(/# pass \d+/)?.[0] || '').trim()} ${(tests.stdout.match(/# fail \d+/)?.[0] || '').trim()}`.trim());

const hybridTests = spawnSync(process.execPath, ['--test', 'backend/chatbot/tests/hybrid-retriever.test.js'], { cwd: root, encoding: 'utf8' });
process.stdout.write(hybridTests.stdout || '');
if (hybridTests.stderr) process.stderr.write(hybridTests.stderr);
record('Hybrid rank fusion unit tests', hybridTests.status === 0, `${(hybridTests.stdout.match(/# pass \d+/)?.[0] || '').trim()} ${(hybridTests.stdout.match(/# fail \d+/)?.[0] || '').trim()}`.trim());

const followupTests = spawnSync(process.execPath, ['--test', 'backend/chatbot/tests/followup.test.js'], { cwd: root, encoding: 'utf8' });
process.stdout.write(followupTests.stdout || '');
if (followupTests.stderr) process.stderr.write(followupTests.stderr);
record('Contextual follow-up unit tests', followupTests.status === 0, `${(followupTests.stdout.match(/# pass \d+/)?.[0] || '').trim()} ${(followupTests.stdout.match(/# fail \d+/)?.[0] || '').trim()}`.trim());

const intentTests = spawnSync(process.execPath, ['--test', 'backend/chatbot/tests/chat-intents.test.js'], { cwd: root, encoding: 'utf8' });
process.stdout.write(intentTests.stdout || '');
if (intentTests.stderr) process.stderr.write(intentTests.stderr);
record('Greeting, overview, and thanks unit tests', intentTests.status === 0, `${(intentTests.stdout.match(/# pass \d+/)?.[0] || '').trim()} ${(intentTests.stdout.match(/# fail \d+/)?.[0] || '').trim()}`.trim());

const retrievalEval = spawnSync(process.execPath, ['backend/chatbot/tests/evaluate-retrieval.js', '--mode=tfidf'], { cwd: root, encoding: 'utf8' });
if (retrievalEval.stdout) process.stdout.write(retrievalEval.stdout);
if (retrievalEval.stderr) process.stderr.write(retrievalEval.stderr);
const retrievalMetric = retrievalEval.stdout.match(/Hit@1 .*$/m)?.[0] || '';
record('Golden set TF-IDF baseline', retrievalEval.status === 0, retrievalMetric);

const passed = checks.filter((check) => check.passed).length;
const failed = checks.length - passed;
if (failed) process.exitCode = 1;
