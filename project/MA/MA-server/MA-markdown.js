// ── MA-markdown.js ──────────────────────────────────────────────────────────
// Lightweight markdown→HTML renderer for the user guide endpoint.
'use strict';

function renderMarkdownToHtml(md) {
  let html = md
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/^\| (.+) \|$/gm, (m) => {
      const cells = m.slice(1, -1).split('|').map(c => c.trim());
      if (cells.every(c => /^[-:]+$/.test(c))) return '';
      const tag = m.includes('---') ? 'th' : 'td';
      return '<tr>' + cells.map(c => `<${tag}>${c}</${tag}>`).join('') + '</tr>';
    })
    .replace(/^```(\w*)$/gm, '<pre><code>').replace(/^```$/gm, '</code></pre>')
    .replace(/\n{2,}/g, '</p><p>')
    .replace(/^---$/gm, '<hr>');
  // Wrap li sequences in ul
  html = html.replace(/(<li>.*?<\/li>\n?)+/gs, (m) => '<ul>' + m + '</ul>');
  // Wrap tr sequences in table
  html = html.replace(/(<tr>.*?<\/tr>\n?)+/gs, (m) => '<table border="1" cellpadding="6" cellspacing="0">' + m + '</table>');
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>MA — User Guide</title>
<style>body{font-family:system-ui,sans-serif;max-width:900px;margin:0 auto;padding:24px;background:#0d1117;color:#c9d1d9;line-height:1.6}
h1,h2,h3{color:#58a6ff}code{background:#161b22;padding:2px 6px;border-radius:4px;font-size:0.9em}
pre{background:#161b22;padding:16px;border-radius:8px;overflow-x:auto}pre code{padding:0;background:none}
table{border-collapse:collapse;margin:12px 0}th,td{padding:8px 12px;border:1px solid #30363d;text-align:left}th{background:#161b22}
ul{padding-left:24px}li{margin:4px 0}a{color:#58a6ff}hr{border:0;border-top:1px solid #30363d;margin:24px 0}
strong{color:#e6edf3}</style></head><body><p>${html}</p></body></html>`;
}

module.exports = { renderMarkdownToHtml };
