const fs = require('fs');
const { marked } = require('marked');

marked.setOptions({ gfm: true, breaks: true });

const renderer = new marked.Renderer();
renderer.code = function(token) {
  const code = token.text || String(token);
  const lang = token.lang || '';
  if (lang === 'mermaid') {
    return `<div class="mermaid">${code.replace(/<br\s*\/?>/gi, '\n')}</div>`;
  }
  const lc = lang ? ` class="language-${lang}"` : '';
  const esc = code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return `<pre><code${lc}>${esc}</code></pre>`;
};
marked.use({ renderer });

const md = fs.readFileSync('/Users/lian/Desktop/oop/gitbook/CLAUDE-CODE/26-COGNITIVE-LOOP.md', 'utf8');
let html = marked(md);
html = html.replace(/href="\.\/([^"]+)"/g, (m, p) => `href="${p}.html"`)
           .replace(/href="(\.\.\/[^"]+)"/g, (m, p) => `href="${p}.html"`);

const existing = fs.readFileSync('/Users/lian/Desktop/oop/gitbook/html/CLAUDE-CODE/26-COGNITIVE-LOOP.html', 'utf8');
const oldMatch = existing.match(/(<article class="markdown-section">)[\s\S]*?(<\/article>)/);
if (!oldMatch) { console.log('ERROR'); process.exit(1); }
const result = existing.replace(oldMatch[0], oldMatch[1] + '\n' + html + '\n' + oldMatch[2]);
fs.writeFileSync('/Users/lian/Desktop/oop/gitbook/html/CLAUDE-CODE/26-COGNITIVE-LOOP.html', result, 'utf8');
console.log('Done');
