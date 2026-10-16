const test = require('node:test');
const assert = require('node:assert/strict');
const { fuseRankedCandidates } = require('../hybrid-retriever');

test('rank fusion menggabungkan kandidat yang sama dari kedua retriever', () => {
  const fused = fuseRankedCandidates({
    semanticMatches: [
      { page: 2, text: 'Shared chunk', score: 0.8 },
      { page: 3, text: 'Semantic only', score: 0.7 },
    ],
    lexicalMatches: [
      { document: { page: 2, text: 'Shared chunk' }, score: 2 },
      { document: { page: 4, text: 'Lexical only' }, score: 1 },
    ],
    rankConstant: 10,
    semanticWeight: 0.1,
    limit: 3,
  });
  assert.deepEqual(fused.map((item) => item.document.page), [2, 4, 3]);
  assert.equal(fused[0].semanticScore, 0.8);
  assert.equal(fused[0].lexicalScore, 2);
});

test('fusion membatasi hasil dan menghindari duplikasi potongan materi', () => {
  const fused = fuseRankedCandidates({
    semanticMatches: [{ page: 7, text: '  Same   chunk ', score: 0.7 }],
    lexicalMatches: [{ document: { page: 7, text: 'same chunk' }, score: 1 }],
    limit: 3,
  });
  assert.equal(fused.length, 1);
  assert.equal(fused[0].document.page, 7);
});

test('bobot semantic nol mempertahankan urutan lexical', () => {
  const fused = fuseRankedCandidates({
    semanticMatches: [{ page: 9, text: 'semantic first', score: 0.9 }],
    lexicalMatches: [
      { document: { page: 2, text: 'lexical first' }, score: 3 },
      { document: { page: 1, text: 'lexical second' }, score: 2 },
    ],
    semanticWeight: 0,
  });
  assert.deepEqual(fused.map((item) => item.document.page), [2, 1, 9]);
});
