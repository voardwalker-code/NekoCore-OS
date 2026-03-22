// ── MA BM25 Relevance Scoring ────────────────────────────────────────────────
// Okapi BM25 for topic-array document scoring.
// Parameters: k1=1.5, b=0.75, avgDocLen=8
// Uniform IDF (ln(2)) — fast, bounded error for pre-filtered topic arrays.
//
// Public API:
//   bm25Score(queryTopics, docTopics, opts?) → number
//   bm25ScoreWithImportance(queryTopics, docTopics, importance, decay, opts?) → number
'use strict';

const K1        = 1.5;
const B         = 0.75;
const AVG_DL    = 8;
const IDF_CONST = Math.log(2);

/**
 * BM25 relevance score for topic arrays.
 * @param {string[]} queryTopics
 * @param {string[]} docTopics
 * @param {object}  [opts] - { k1, b, avgDL }
 * @returns {number}
 */
function bm25Score(queryTopics, docTopics, opts = {}) {
  if (!queryTopics?.length || !docTopics?.length) return 0;

  const k1    = opts.k1    ?? K1;
  const b     = opts.b     ?? B;
  const avgDL = opts.avgDL ?? AVG_DL;

  const docFreq = {};
  for (const t of docTopics) docFreq[t] = (docFreq[t] || 0) + 1;

  const docLen     = docTopics.length;
  const normFactor = 1 - b + b * (docLen / avgDL);

  let score = 0;
  for (const qt of queryTopics) {
    const tf = docFreq[qt] || 0;
    if (tf === 0) continue;
    const tfNorm = (tf * (k1 + 1)) / (tf + k1 * normFactor);
    score += IDF_CONST * tfNorm;
  }
  return score;
}

/**
 * BM25 + importance/decay blend.
 * Score = bm25Base × (0.40 + importance×0.35 + decay×0.25)
 */
function bm25ScoreWithImportance(queryTopics, docTopics, importance, decay, opts = {}) {
  const base = bm25Score(queryTopics, docTopics, opts);
  if (base === 0) return 0;
  return base * (0.40 + (importance * 0.35) + (decay * 0.25));
}

module.exports = { bm25Score, bm25ScoreWithImportance, K1, B, AVG_DL };
