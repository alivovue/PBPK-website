const STOP_WORDS = new Set(`yang dan di ke dari untuk dengan adalah itu ini atau pada sebagai dalam dapat bisa akan karena kalau maka tentang oleh juga lebih tidak dari apa bagaimana buat jadi database basis data`.split(' '));
const QUERY_SYNONYMS = {
  indeks: ['index', 'indexing', 'search', 'key'],
  index: ['indeks', 'indexing', 'search', 'key'],
  query: ['queries', 'querying', 'sql'],
  transaksi: ['transaction', 'transactions'],
  perangkat: ['hardware'],
  keras: ['hardware'],
  benchmark: ['benchmarks', 'throughput', 'response', 'tpc'],
  cepat: ['performance', 'tuning'],
  lambat: ['performance', 'tuning', 'bottleneck'],
};

function tokenize(text) {
  return (text.toLocaleLowerCase('id').match(/[\p{L}\p{N}]+/gu) || [])
    .filter((word) => word.length > 1 && !STOP_WORDS.has(word));
}

function createTfIdfRetriever(chunks) {
  const documents = chunks.map((chunk) => {
    const terms = tokenize(chunk.text);
    const frequencies = new Map();
    for (const term of terms) frequencies.set(term, (frequencies.get(term) || 0) + 1);
    return { ...chunk, frequencies, length: terms.length };
  });
  const documentFrequency = new Map();
  for (const document of documents) {
    for (const term of document.frequencies.keys()) {
      documentFrequency.set(term, (documentFrequency.get(term) || 0) + 1);
    }
  }

  return function retrieve(query, limit = 3) {
    const originalTerms = tokenize(query);
    const queryTerms = [...new Set(originalTerms.flatMap((term) => [term, ...(QUERY_SYNONYMS[term] || [])]))];
    if (!queryTerms.length) return [];
    return documents.map((document) => {
      let score = 0;
      for (const term of queryTerms) {
        const frequency = document.frequencies.get(term) || 0;
        if (frequency) {
          const idf = Math.log(1 + documents.length / (1 + documentFrequency.get(term)));
          score += idf * (1 + Math.log(frequency));
        }
      }
      return { document, score };
    }).filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, Math.max(0, limit));
  };
}

module.exports = { createTfIdfRetriever };
