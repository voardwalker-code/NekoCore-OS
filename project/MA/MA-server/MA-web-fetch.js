// ── MA Web Fetch ─────────────────────────────────────────────────────────────
// Web search (DuckDuckGo) and URL fetching with SSRF protection.
// Pure Node.js — no external dependencies.
'use strict';

const http  = require('http');
const https = require('https');
const { URL } = require('url');

const MAX_BODY     = 512 * 1024; // 512 KB
const FETCH_TIMEOUT = 15000;     // 15s
const MAX_REDIRECTS = 5;

// ── SSRF guard — block private/internal IPs ─────────────────────────────────
const BLOCKED_HOSTS = /^(localhost|127\.|10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|0\.0\.0\.0|::1|.*\.local$|.*\.internal$)/i;

function _isBlocked(hostname) {
  return BLOCKED_HOSTS.test(hostname);
}

// ── Raw HTTP(S) GET with redirect following ─────────────────────────────────
function fetchUrl(urlStr, redirectsLeft = MAX_REDIRECTS) {
  return new Promise((resolve, reject) => {
    let url;
    try { url = new URL(urlStr); } catch { return reject(new Error('Invalid URL')); }
    if (_isBlocked(url.hostname)) return reject(new Error('Blocked: private/internal address'));

    const mod = url.protocol === 'https:' ? https : http;
    const req = mod.get(url, { timeout: FETCH_TIMEOUT, headers: { 'User-Agent': 'MA/1.0' } }, (res) => {
      // Follow redirects
      if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location) {
        if (redirectsLeft <= 0) return reject(new Error('Too many redirects'));
        const next = new URL(res.headers.location, url).href;
        return fetchUrl(next, redirectsLeft - 1).then(resolve, reject);
      }
      if (res.statusCode >= 400) return reject(new Error(`HTTP ${res.statusCode}`));

      const chunks = [];
      let size = 0;
      res.on('data', c => { size += c.length; if (size <= MAX_BODY) chunks.push(c); });
      res.on('end', () => resolve({
        body: Buffer.concat(chunks).toString('utf8'),
        contentType: res.headers['content-type'] || '',
        url: urlStr
      }));
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Fetch timeout')); });
  });
}

// ── Extract readable text from HTML ─────────────────────────────────────────
function extractText(html) {
  let text = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<nav[\s\S]*?<\/nav>/gi, '')
    .replace(/<footer[\s\S]*?<\/footer>/gi, '')
    .replace(/<header[\s\S]*?<\/header>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
  return text.slice(0, 8000);
}

// ── Fetch URL and return clean text ─────────────────────────────────────────
async function fetchAndExtract(urlStr) {
  const res = await fetchUrl(urlStr);
  const ct = res.contentType.toLowerCase();
  if (ct.includes('json')) {
    try { return { url: urlStr, text: JSON.stringify(JSON.parse(res.body), null, 2).slice(0, 8000), type: 'json' }; }
    catch { return { url: urlStr, text: res.body.slice(0, 8000), type: 'text' }; }
  }
  if (ct.includes('html')) {
    return { url: urlStr, text: extractText(res.body), type: 'html' };
  }
  return { url: urlStr, text: res.body.slice(0, 8000), type: 'text' };
}

// ── Web search (DDG Instant Answer API + Wikipedia — no key needed) ──────────
async function webSearch(query) {
  if (!query) return [];
  const results = [];

  // Strategy 1: DDG Instant Answer API (entity lookups, encyclopedic answers)
  try {
    const apiUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1`;
    const res = await fetchUrl(apiUrl);
    const data = JSON.parse(res.body);

    if (data.AbstractText && data.AbstractURL) {
      results.push({
        title: data.Heading || query,
        url: data.AbstractURL,
        snippet: data.AbstractText.slice(0, 300)
      });
    }

    if (data.RelatedTopics) {
      for (const topic of data.RelatedTopics) {
        if (results.length >= 8) break;
        if (topic.Text && topic.FirstURL) {
          results.push({
            title: topic.Text.split(' - ')[0] || topic.Text.slice(0, 80),
            url: topic.FirstURL,
            snippet: topic.Text.slice(0, 300)
          });
        }
        if (topic.Topics) {
          for (const sub of topic.Topics) {
            if (results.length >= 8) break;
            if (sub.Text && sub.FirstURL) {
              results.push({
                title: sub.Text.split(' - ')[0] || sub.Text.slice(0, 80),
                url: sub.FirstURL,
                snippet: sub.Text.slice(0, 300)
              });
            }
          }
        }
      }
    }

    if (data.Results) {
      for (const r of data.Results) {
        if (results.length >= 8) break;
        if (r.Text && r.FirstURL) {
          results.push({ title: r.Text.slice(0, 80), url: r.FirstURL, snippet: r.Text.slice(0, 300) });
        }
      }
    }
  } catch { /* DDG API failed — continue to Wikipedia */ }

  // Strategy 2: Wikipedia search API (reliable, broad coverage)
  if (results.length < 4) {
    try {
      const wikiUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&srlimit=6&format=json&utf8=1`;
      const res = await fetchUrl(wikiUrl);
      const data = JSON.parse(res.body);
      const seen = new Set(results.map(r => r.url));

      if (data.query && data.query.search) {
        for (const item of data.query.search) {
          if (results.length >= 8) break;
          const wikiUrl2 = `https://en.wikipedia.org/wiki/${encodeURIComponent(item.title.replace(/ /g, '_'))}`;
          if (seen.has(wikiUrl2)) continue;
          seen.add(wikiUrl2);
          results.push({
            title: item.title,
            url: wikiUrl2,
            snippet: (item.snippet || '').replace(/<[^>]+>/g, '').slice(0, 300)
          });
        }
      }
    } catch { /* Wikipedia API failed */ }
  }

  // Strategy 3: DDG HTML scrape (optimistic fallback — may be blocked)
  if (results.length === 0) {
    try {
      const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
      const res = await fetchUrl(searchUrl);
      const blocks = res.body.split(/class="result__body"/);
      for (let i = 1; i < blocks.length && results.length < 8; i++) {
        const titleMatch = blocks[i].match(/class="result__a"[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/);
        const snippetMatch = blocks[i].match(/class="result__snippet"[^>]*>([\s\S]*?)<\/td>/);
        if (titleMatch) {
          let url = titleMatch[1];
          const udMatch = url.match(/uddg=([^&]+)/);
          if (udMatch) url = decodeURIComponent(udMatch[1]);
          results.push({
            title: titleMatch[2].replace(/<[^>]+>/g, '').trim(),
            url,
            snippet: snippetMatch ? snippetMatch[1].replace(/<[^>]+>/g, '').trim() : ''
          });
        }
      }
    } catch { /* HTML scrape failed too */ }
  }

  return results;
}

// ── Format search results for LLM context ───────────────────────────────────
function formatSearchResults(results, query) {
  if (!results.length) return `[WEB SEARCH: "${query}"]\nNo results found.\n[/WEB SEARCH]`;
  const lines = results.map((r, i) => `${i + 1}. ${r.title}\n   ${r.url}\n   ${r.snippet}`);
  return `[WEB SEARCH: "${query}"]\n${lines.join('\n\n')}\n[/WEB SEARCH]`;
}

module.exports = { fetchUrl, fetchAndExtract, extractText, webSearch, formatSearchResults };
