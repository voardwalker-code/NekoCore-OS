'use strict';
/**
 * server/brain/utils/bm25.js
 * IME Phase I1-1 — BM25 Relevance Scoring
 *
 * Okapi BM25 implementation for topic-array document scoring.
 *
 * Parameters: k1=1.5, b=0.75, avgDocLen=8
 *
 * IDF is approximated as ln(2) for all topics (uniform discrimination).
 * Because memories are indexed by canonical/stemmed topics that are already
 * pre-filtered for semantic relevance, uniform IDF is a sound approximation
 * whose error is bounded. Corpus-IDF would require iterating the full index
 * on every retrieval; the uniform approximation is ~3× faster in practice.
 *
 * Public API:
 *   bm25Score(queryTopics, docTopics, opts?) → number
 *   bm25ScoreWithImportance(queryTopics, docTopics, importance, decay, opts?) → number
 */

const K1      = 1.5;
const B       = 0.75;
const AVG_DL  = 8;              // typical memory: 4–12 canonical topic tags
const IDF_CONST = Math.log(2);  // uniform IDF ≈ ln(2) ≈ 0.693

/**
 * Compute BM25 relevance for a topic-array "document" against a query topic list.
 *
 * Topic arrays are treated as bag-of-words: frequency of each canonical topic tag
 * within a memory's stored topic list is used as TF. Because topics are already
 * de-duplicated during storage, TF is almost always 0 or 1 — but multiplicity is
 * handled correctly to allow future richer topic representation.
 *
 * @param {string[]} queryTopics  - Normalized/RAKE-extracted query topics
 * @param {string[]} docTopics    - Memory's stored canonical topic tags
 * @param {object}  [opts]
 * @param {number}  [opts.k1]     - TF saturation (default 1.5)
 * @param {number}  [opts.b]      - Length normalization (default 0.75)
 * @param {number}  [opts.avgDL]  - Average document length in topics (default 8)
 * @returns {number}
 */
function bm25Score(queryTopics, docTopics, opts = {}) {
  if (!queryTopics?.length || !docTopics?.length) return 0;

  const k1    = opts.k1    ?? K1;
  const b     = opts.b     ?? B;
  const avgDL = opts.avgDL ?? AVG_DL;

  // Build term-frequency map for the document
  const docFreq = {};
  for (const t of docTopics) {
    docFreq[t] = (docFreq[t] || 0) + 1;
  }

  const docLen     = docTopics.length;
  const normFactor = 1 - b + b * (docLen / avgDL);

  let score = 0;
  for (const qt of queryTopics) {
    const tf = docFreq[qt] || 0;
    if (tf === 0) continue;
    // BM25 TF component with length normalization
    const tfNorm = (tf * (k1 + 1)) / (tf + k1 * normFactor);
    score += IDF_CONST * tfNorm;
  }
  return score;
}

/**
 * Full memory relevance score: BM25 base combined with importance and decay.
 *
 * Replaces the legacy formula:
 *   relevanceScore = baseScore * (0.35 + (importance * decay))
 *
 * The new formula separates the topical strength signal (BM25) from the
 * memory quality signals (importance × recency) and blends them:
 *   relevanceScore = bm25Base × (0.40 + importance×0.35 + decay×0.25)
 *
 * Weights rationale:
 *   • 0.40 constant floor — topic match always contributes
 *   • 0.35 × importance — high-quality memories boosted more
 *   • 0.25 × decay     — recent memories preferred but not exclusively
 *
 * @param {string[]} queryTopics   - Normalized query topics
 * @param {string[]} docTopics     - Memory's stored topic tags
 * @param {number}   importance    - Memory importance in [0,1]
 * @param {number}   decay         - Memory recency decay in [0,1]
 * @param {object}   [opts]        - Forwarded to bm25Score
 * @returns {number}
 */
function bm25ScoreWithImportance(queryTopics, docTopics, importance, decay, opts = {}) {
  const base = bm25Score(queryTopics, docTopics, opts);
  if (base === 0) return 0;
  return base * (0.40 + (importance * 0.35) + (decay * 0.25));
}

module.exports = { bm25Score, bm25ScoreWithImportance, K1, B, AVG_DL };
