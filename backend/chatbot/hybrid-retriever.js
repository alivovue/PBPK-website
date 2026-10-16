function candidateKey(document) {
  const text = String(document.text || '').toLocaleLowerCase('id').replace(/\s+/g, ' ').trim();
  return `${document.page ?? ''}\0${text}`;
}

function fuseRankedCandidates({ semanticMatches = [], lexicalMatches = [], limit = 3, rankConstant = 10, semanticWeight = 0.1, lexicalWeight = 1 }) {
  const candidates = new Map();
  const addRankedList = (matches, channel) => {
    matches.forEach((match, index) => {
      const document = match.document || match;
      const key = candidateKey(document);
      if (!candidates.has(key)) {
        candidates.set(key, { document, fusionScore: 0, semanticScore: null, semanticRank: null, lexicalRank: null });
      }
      const candidate = candidates.get(key);
      const weight = channel === 'semantic' ? semanticWeight : lexicalWeight;
      candidate.fusionScore += weight / (rankConstant + index + 1);
      if (channel === 'semantic') {
        candidate.semanticScore = match.score ?? null;
        candidate.semanticRank = index + 1;
      } else {
        candidate.lexicalScore = match.score ?? null;
        candidate.lexicalRank = index + 1;
      }
    });
  };

  addRankedList(semanticMatches, 'semantic');
  addRankedList(lexicalMatches, 'lexical');
  return [...candidates.values()]
    .sort((a, b) => b.fusionScore - a.fusionScore
      || (a.semanticRank ?? Infinity) - (b.semanticRank ?? Infinity)
      || (a.lexicalRank ?? Infinity) - (b.lexicalRank ?? Infinity))
    .slice(0, Math.max(0, limit))
    .map(({ document, fusionScore, semanticScore, lexicalScore }) => ({
      document,
      score: fusionScore,
      semanticScore,
      lexicalScore: lexicalScore ?? null,
    }));
}

module.exports = { fuseRankedCandidates };
