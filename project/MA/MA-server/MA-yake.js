// ── MA YAKE Keyword Extractor ────────────────────────────────────────────────
// Statistical keyword extraction using surface features:
//   WPos, WFreq, WCase, WRel, WDiff. Lower score = more relevant keyword.
//
// Public API:
//   extractKeywords(text, maxKeywords?) → string[]
'use strict';

const STOPWORDS = new Set([
  'a','about','above','after','again','against','all','am','an','and','any','are',
  'as','at','be','because','been','before','being','below','between','both','but',
  'by','can','could','did','do','does','doing','down','during','each','few','for',
  'from','further','get','got','had','has','have','having','he','her','here','hers',
  'herself','him','himself','his','how','i','if','in','into','is','it','its','itself',
  'just','let','like','ll','me','might','more','most','my','myself','no','nor','not',
  'now','of','off','on','once','only','or','other','our','ours','ourselves','out',
  'over','own','re','s','same','shall','she','should','so','some','such','t','than',
  'that','the','their','theirs','them','themselves','then','there','these','they',
  'this','those','through','to','too','under','until','up','ve','very','was','we',
  'were','what','when','where','which','while','who','whom','why','will','with',
  'won','would','you','your','yours','yourself','yourselves','d','m'
]);

const SENTENCE_SPLIT = /[.!?\n]+/;
const WORD_SPLIT = /[\s,;:()\[\]{}"'\/\\]+/;

function tokenize(text) {
  const sentences = text.split(SENTENCE_SPLIT).filter(s => s.trim().length > 0);
  const tokens = [];
  let pos = 0;
  for (let si = 0; si < sentences.length; si++) {
    const words = sentences[si].split(WORD_SPLIT).filter(w => w.length > 0);
    for (const w of words) {
      tokens.push({ word: w, lower: w.toLowerCase(), position: pos, sentenceIndex: si });
      pos++;
    }
  }
  return tokens;
}

function computeWordFeatures(tokens) {
  const totalTokens = tokens.length;
  if (totalTokens === 0) return new Map();

  const stats = new Map();
  for (const t of tokens) {
    if (STOPWORDS.has(t.lower) || t.lower.length < 2) continue;
    if (!stats.has(t.lower)) stats.set(t.lower, { positions: [], upperCount: 0, totalCount: 0, sentences: new Set() });
    const s = stats.get(t.lower);
    s.positions.push(t.position);
    s.totalCount++;
    if (t.word[0] === t.word[0].toUpperCase() && t.word[0] !== t.word[0].toLowerCase()) s.upperCount++;
    s.sentences.add(t.sentenceIndex);
  }

  const freqs = [...stats.values()].map(s => s.totalCount);
  const meanFreq = freqs.reduce((a, b) => a + b, 0) / (freqs.length || 1);
  const stdFreq = Math.sqrt(freqs.reduce((a, b) => a + (b - meanFreq) ** 2, 0) / (freqs.length || 1));

  const features = new Map();
  for (const [word, s] of stats) {
    const medianPos = s.positions[Math.floor(s.positions.length / 2)];
    const wPos  = Math.log(2 + medianPos);
    const wFreq = s.totalCount / (meanFreq + stdFreq + 1);
    const wCase = Math.max(1, s.upperCount) / (1 + Math.log(s.totalCount));
    const wRel  = 1 / (0.5 + (s.sentences.size / (tokens[tokens.length - 1].sentenceIndex + 1 || 1)));
    const posRange = s.positions[s.positions.length - 1] - s.positions[0];
    const wDiff = 1 / (1 + posRange / (totalTokens || 1));
    const score = (wPos * wRel) / (wCase + (wFreq / (wRel + wDiff / 3 + 1)));
    features.set(word, { score, count: s.totalCount, positions: s.positions });
  }
  return features;
}

function scoreBigrams(tokens, wordFeatures) {
  const bigrams = new Map();
  const filtered = tokens.filter(t => !STOPWORDS.has(t.lower) && t.lower.length >= 2);
  for (let i = 0; i < filtered.length - 1; i++) {
    const a = filtered[i], b = filtered[i + 1];
    if (a.sentenceIndex !== b.sentenceIndex) continue;
    if (Math.abs(a.position - b.position) > 2) continue;
    const key = a.lower + ' ' + b.lower;
    if (!bigrams.has(key)) {
      const scoreA = wordFeatures.get(a.lower)?.score ?? 10;
      const scoreB = wordFeatures.get(b.lower)?.score ?? 10;
      bigrams.set(key, { score: Math.sqrt(scoreA * scoreB) * 0.8, count: 0 });
    }
    bigrams.get(key).count++;
  }
  return bigrams;
}

function dedup(candidates) {
  const sorted = candidates.sort((a, b) => a.score - b.score);
  const kept = [], usedWords = new Set();
  for (const c of sorted) {
    const words = c.keyword.split(' ');
    if (words.every(w => usedWords.has(w))) continue;
    kept.push(c);
    for (const w of words) usedWords.add(w);
  }
  return kept;
}

/**
 * Extract keywords from text using YAKE statistical features.
 * @param {string} text
 * @param {number} [maxKeywords=10]
 * @returns {string[]}
 */
function extractKeywords(text, maxKeywords = 10) {
  if (!text || typeof text !== 'string') return [];
  const tokens = tokenize(text);
  if (tokens.length === 0) return [];

  const wordFeatures = computeWordFeatures(tokens);
  const bigramScores = scoreBigrams(tokens, wordFeatures);

  const candidates = [];
  for (const [word, feat] of wordFeatures) candidates.push({ keyword: word, score: feat.score });
  for (const [bigram, feat] of bigramScores) {
    if (feat.count >= 1) candidates.push({ keyword: bigram, score: feat.score });
  }

  return dedup(candidates).slice(0, maxKeywords).map(c => c.keyword);
}

module.exports = { extractKeywords };
