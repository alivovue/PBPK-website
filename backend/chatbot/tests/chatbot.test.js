const test = require('node:test');
const assert = require('node:assert/strict');
const { createChatbot } = require('../chatbot');

test('social messages work when the semantic model is unavailable', async () => {
  const chatbot = createChatbot({ fetchImpl: async () => { throw new Error('offline'); } });
  assert.equal((await chatbot.status()).ready, false);
  assert.match((await chatbot.chat({ message: 'halo AURI' })).reply, /AURI/);
  await assert.rejects(chatbot.chat({ message: 'Apa itu RAID 1?' }));
});

test('the supplied module outline is identified separately from semantic retrieval', async () => {
  const chatbot = createChatbot({ fetchImpl: async () => { throw new Error('offline'); } });
  const reply = await chatbot.chat({ message: 'Apa saja topik di modul ini?' });
  assert.equal(reply.retrieval, 'material-outline');
  assert.equal(reply.sources[0].page, 4);
});

test('lesson context and source metadata survive retrieval and contextual follow-ups', async () => {
  const requests = [];
  const document = { text: 'An index finds records.', title: 'Indeks', lesson_id: 2, topic_id: 1 };
  const chatbot = createChatbot({ fetchImpl: async (_url, options) => {
    requests.push(JSON.parse(options.body));
    return Response.json({ matches: [{ ...document, score: 0.8 }] });
  } });
  const first = await chatbot.chat({ message: 'Apa itu indeks?', documents: [document] });
  assert.equal(first.sources[0].lesson_id, 2);
  assert.match(first.reply, /pelajaran “Indeks”/);
  assert.doesNotMatch(first.reply, /halaman undefined/);
  await chatbot.chat({ message: 'jelaskan lagi', documents: [document], history: [
    { role: 'user', text: 'Apa itu indeks?' }, { role: 'model', text: first.reply, hasSources: true },
  ] });
  assert.equal(requests[0].message, requests[1].message);
  assert.deepEqual(requests[1].documents, [document]);
});

test('empty lesson context and low confidence do not invent supported material', async () => {
  let calls = 0;
  const chatbot = createChatbot({ fetchImpl: async () => { calls += 1; return Response.json({ matches: [{ page: 1, text: 'unrelated', score: 0.1 }] }); } });
  const empty = await chatbot.chat({ message: 'jelaskan materi ini', documents: [] });
  assert.deepEqual(empty.sources, []);
  assert.equal(calls, 0);
  const low = await chatbot.chat({ message: 'terangkan gravitasi' });
  assert.deepEqual(low.sources, []);
  assert.equal(low.confidence, null);
});
