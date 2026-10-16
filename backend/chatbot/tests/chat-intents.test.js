const test = require('node:test');
const assert = require('node:assert/strict');
const { detectChatIntent, normalizeMaterialQuery } = require('../chat-intents');

test('sapaan dikenali dan bisa dijawab tanpa retrieval', () => {
  assert.equal(detectChatIntent('Halo!'), 'greeting');
  assert.equal(detectChatIntent('hai System'), 'greeting');
  assert.equal(detectChatIntent('halow'), 'greeting');
  assert.equal(detectChatIntent('helo'), 'greeting');
  assert.equal(detectChatIntent('heiiii'), 'greeting');
  assert.equal(detectChatIntent('haii'), 'greeting');
  assert.equal(detectChatIntent('hei kak'), 'greeting');
  assert.equal(detectChatIntent('halo hai'), 'greeting');
  assert.equal(detectChatIntent('hallooo'), 'greeting');
  assert.equal(detectChatIntent('Selamat pagiii!'), 'greeting');
  assert.equal(detectChatIntent('hi there'), 'greeting');
  assert.equal(detectChatIntent('hai, apa kabar?'), 'greeting');
});

test('sapaan yang diikuti pertanyaan tidak menelan isi pertanyaan', () => {
  assert.equal(detectChatIntent('halo, materi apa aja?'), 'module-overview');
  assert.equal(detectChatIntent('hai, apa itu index database?'), null);
});

test('pertanyaan katalog materi dikenali', () => {
  assert.equal(detectChatIntent('materi apa aja yang bisa dipelajari?'), 'module-overview');
  assert.equal(detectChatIntent('topik apa saja di modul ini'), 'module-overview');
  assert.equal(detectChatIntent('modulnya ngebahas apa aja?'), 'module-overview');
});

test('ucapan terima kasih dikenali', () => {
  assert.equal(detectChatIntent('Terima kasih ya!'), 'thanks');
  assert.equal(detectChatIntent('makasih'), 'thanks');
  assert.equal(detectChatIntent('makasih banyakk ya'), 'thanks');
  assert.equal(detectChatIntent('trims banyak'), 'thanks');
});

test('pertanyaan konsep tetap diteruskan ke retrieval', () => {
  assert.equal(detectChatIntent('aku mau belajar indeks database'), null);
});

test('intent sosial sederhana dijawab tanpa retrieval materi', () => {
  assert.equal(detectChatIntent('kamu siapa?'), 'identity');
  assert.equal(detectChatIntent('nama kamu siapa'), 'identity');
  assert.equal(detectChatIntent('kamu bisa bantu apa?'), 'capabilities');
  assert.equal(detectChatIntent('apa kabar?'), 'smalltalk');
  assert.equal(detectChatIntent('wkwkwk'), 'smalltalk');
});

test('pertanyaan materi dibersihkan dari basa-basi dan istilah index dinormalisasi', () => {
  assert.equal(normalizeMaterialQuery('aku mau tau tentang index dong'), 'database index indexing search key records pointer');
  assert.equal(normalizeMaterialQuery('hai, jelasin RAID 1 dong'), 'RAID 1 disk mirroring copy redundancy fault tolerance failure');
  assert.equal(detectChatIntent('aku mau tau tentang index dong'), null);
});