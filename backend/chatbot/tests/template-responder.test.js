const test = require('node:test');
const assert = require('node:assert/strict');
const { buildTemplateReply } = require('../template-responder');

test('basa-basi mendapat respons lokal tanpa model generatif', () => {
  assert.match(buildTemplateReply({ question: 'hai', intent: 'greeting' }), /Hai!/);
  assert.match(buildTemplateReply({ question: 'kamu siapa', intent: 'identity' }), /asisten belajar/);
  assert.match(buildTemplateReply({ question: 'makasih', intent: 'thanks' }), /Sama-sama/);
});

test('penjelasan konsep memakai ringkasan terstruktur dan menyebut halaman sumber', () => {
  const reply = buildTemplateReply({
    question: 'jelasin RAID 1',
    sources: [{ page: 18, text: 'RAID 1 mirrors data across disks.' }],
  });
  assert.match(reply, /mirroring/);
  assert.match(reply, /halaman 18/);
});

test('topik tanpa sumber tidak diberi jawaban seolah-olah didukung modul', () => {
  const reply = buildTemplateReply({ question: 'apa itu query tuning?', sources: [] });
  assert.match(reply, /belum menemukan kutipan modul/);
});

test('kutipan subtopik tanpa template tetap diberikan dengan konteks halaman', () => {
  const reply = buildTemplateReply({
    question: 'apa yang dibahas materi ini?',
    sources: [{ page: 22, text: 'The benchmark test measures system performance.' }],
  });
  assert.match(reply, /halaman 22/);
  assert.match(reply, /benchmark test measures/);
});
