#!/usr/bin/env node
/**
 * Build script: Convert all .md files to .html files
 * Usage: node build-html.js
 */
const fs = require('fs');
const path = require('path');
const { marked } = require('marked');

// Configure marked
marked.setOptions({
  gfm: true,
  breaks: true
});

// Custom renderer for Mermaid diagrams
const renderer = new marked.Renderer();
renderer.code = function(token) {
  const code = token.text || String(token);
  const language = token.lang || '';
  if (language === 'mermaid') {
    // HTML-escape angle brackets to prevent browser interpreting
    // mermaid syntax (e.g. <<union>>, <br/>, <|--) as HTML tags.
    // Browser decodes &lt; &gt; back to <> in textContent,
    // so mermaid's parser sees the correct content.
    const escaped = code
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    return `<div class="mermaid">${escaped}</div>`;
  }
  const langClass = language ? ` class="language-${language}"` : '';
  const escaped = code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return `<pre><code${langClass}>${escaped}</code></pre>`;
};
marked.use({ renderer });

// Read HTML template
const template = fs.readFileSync(path.join(__dirname, 'template.html'), 'utf8');

// Walk directory and find all .md files
function findMdFiles(dir, files = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory() && entry.name !== 'node_modules' && entry.name !== 'html') {
      findMdFiles(fullPath, files);
    } else if (entry.isFile() && entry.name.endsWith('.md') && entry.name !== '_sidebar.md' && entry.name !== '_coverpage.md') {
      files.push(fullPath);
    }
  }
  return files;
}

// Fix links in HTML
function fixLinks(html) {
  return html
    .replace(/href="\.\/([^"]+)"/g, (m, p) => `href="${p}.html"`)
    .replace(/href="(\.\.\/[^"]+)"/g, (m, p) => `href="${p}.html"`)
    .replace(/href="(\/[^"]+)(?<!\.html)(?<!\.md)"/g, (m, p) => `href="${p}.html"`);
}

// Compute relative root path from output file to html root
function getRootPath(outputPath) {
  const rel = path.relative(path.join(__dirname, 'html'), outputPath);
  const depth = rel.split(path.sep).length - 1;
  return depth <= 0 ? './' : '../'.repeat(depth);
}

// Arrow SVG
const arrowSVG = `<svg class="arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>`;

// Parse sidebar markdown to collapsible HTML
function parseSidebar(mdPath, htmlPath, rootPath) {
  if (!fs.existsSync(mdPath)) return '';
  
  const content = fs.readFileSync(mdPath, 'utf8');
  const lines = content.split('\n');
  let html = '';
  let currentSection = null;
  let inList = false;
  
  for (const line of lines) {
    // Horizontal rule - section divider
    if (line.trim() === '---') {
      if (inList && currentSection) {
        html += '</ul></div></div>';
        currentSection = null;
        inList = false;
      }
      continue;
    }
    
    // Skip title
    if (line.startsWith('# ')) continue;
    
    // Section header: * **1. Claude Code**
    const sectionMatch = line.trim().match(/^\* \*\*(\d+)\.\s+(.+?)\*\*$/);
    if (sectionMatch) {
      if (inList && currentSection) {
        html += '</ul></div></div>';
      }
      const num = sectionMatch[1];
      const title = sectionMatch[2];
      html += `<div class="sidebar-section">
        <div class="sidebar-section-header">
          <span class="section-title">
            <span class="section-num">${num}</span>
            <span class="section-name">${title}</span>
          </span>
          ${arrowSVG}
        </div>
        <div class="sidebar-section-items"><ul>`;
      currentSection = num;
      inList = true;
    }
    // Sub-item: * [1.0 执行摘要](/path) or with indentation
    else if (line.trim().startsWith('* [') && inList) {
      const linkMatch = line.trim().match(/\* \[([^\]]+)\]\(([^\)]+)\)/);
      if (linkMatch) {
        const [_, text, link] = linkMatch;
        // Extract number from text like "1.0 执行摘要"
        const numMatch = text.match(/^(\d+\.\d+)\s+/);
        const numSpan = numMatch ? `<span class="num">${numMatch[1]}</span>` : '';
        const cleanText = text.replace(/^\d+\.\d+\s+/, '');
        
        // Convert to relative path
        let href = link;
        if (link.startsWith('/')) {
          href = rootPath + link.slice(1) + '.html';
        } else if (link.startsWith('http')) {
          href = link;
        } else {
          href = link + '.html';
        }
        html += `<li><a href="${href}">${numSpan}${cleanText}</a></li>`;
      }
    }
  }
  
  if (inList && currentSection) {
    html += '</ul></div></div>';
  }
  
  return html;
}

// Pre-process markdown: render inner markdown inside raw HTML div blocks
function preprocessMarkdown(content) {
  return content.replace(
    /<div class="thinking-note">([\s\S]*?)<\/div>/g,
    (match, innerContent) => {
      const rendered = marked(innerContent);
      return `<div class="thinking-note">${rendered}</div>`;
    }
  );
}

// Convert a single file
function convertFile(mdPath) {
  const content = fs.readFileSync(mdPath, 'utf8');
  let html = marked(preprocessMarkdown(content));
  
  // Fix links in the rendered content
  html = fixLinks(html);

  // Remove 引导思考 h2, add guide-card class to table, start collapsed
  html = html.replace('<h2>引导思考</h2>\n<table>', '<table class="guide-card collapsed">');
  // Insert title as first row inside tbody (with collapse indicator)
  html = html.replace(
    /<table class="guide-card collapsed">\n<thead>[\s\S]*?<\/thead>\n<tbody>/g,
    (match) => match + '\n<tr class="guide-card-header"><td colspan="2"><span class="collapse-icon"></span>引导思考 <span class="collapse-hint">展开</span></td></tr>'
  );

  // Get relative path
  const relative = path.relative(__dirname, mdPath);
  const withoutExt = relative.replace(/\.md$/, '.html');
  const outputPath = path.join(__dirname, 'html', withoutExt);
  
  // Create output directory
  const outputDir = path.dirname(outputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  // Get page title
  const pageTitle = content.match(/^#\s+(.+)$/m)?.[1] || 'Document';
  
  // Compute root relative path for this output file
  const rootPath = getRootPath(outputPath);
  
  // Get sidebar: look in SOURCE directory (one level up from html/)
  const sectionDir = path.dirname(outputPath);
  const sourceSectionDir = path.relative(path.join(__dirname, 'html'), sectionDir);
  const sidebarPath = path.join(__dirname, sourceSectionDir, '_sidebar.md');
  const sectionSidebar = fs.existsSync(sidebarPath) ? parseSidebar(sidebarPath, outputPath, rootPath) : '';
  const rootSidebar = parseSidebar(path.join(__dirname, '_sidebar.md'), outputPath, rootPath);
  
  // Section sidebar takes full priority (overrides root)
  const fullSidebar = sectionSidebar || rootSidebar;
  
  // Generate HTML with template
  const htmlPage = template
    .replace('{{TITLE}}', pageTitle)
    .replace('{{CONTENT}}', html)
    .replace('{{SIDEBAR}}', fullSidebar)
    .replace(/\{\{ROOT\}\}/g, rootPath);
  
  fs.writeFileSync(outputPath, htmlPage, 'utf8');
  // Safety: if the file somehow has duplicate footer content,
  // truncate at the first </html> to keep it valid
  const written = fs.readFileSync(outputPath, 'utf8');
  const firstClose = written.indexOf('</html>');
  if (firstClose !== -1 && written.indexOf('</html>', firstClose + 7) !== -1) {
    fs.writeFileSync(outputPath, written.substring(0, firstClose + 7), 'utf8');
  }
  console.log(`✓ ${withoutExt}`);
}

// Build homepage from _coverpage.md (or README.md as fallback)
function buildHomepage() {
  const coverPath = path.join(__dirname, '_coverpage.md');
  const readmePath = path.join(__dirname, 'README.md');
  const sourcePath = fs.existsSync(coverPath) ? coverPath : readmePath;
  
  if (!fs.existsSync(sourcePath)) {
    console.log('⚠ _coverpage.md / README.md not found, skipping homepage');
    return;
  }

  const content = fs.readFileSync(sourcePath, 'utf8');
  let html = marked(content);
  html = fixLinks(html);

  const rootPath = './';
  const rootSidebar = parseSidebar(path.join(__dirname, '_sidebar.md'), '/index.html', rootPath);

  const htmlPage = template
    .replace('{{TITLE}}', 'LLM Agent 源码学习')
    .replace('{{CONTENT}}', html)
    .replace('{{SIDEBAR}}', rootSidebar)
    .replace(/\{\{ROOT\}\}/g, rootPath);

  const outputPath = path.join(__dirname, 'html', 'index.html');
  fs.writeFileSync(outputPath, htmlPage, 'utf8');
  console.log('✓ index.html (homepage from ' + path.basename(sourcePath) + ')');
}

// Extract plain text from markdown for search indexing
function extractText(md) {
  return md
    // Remove code blocks
    .replace(/```[\s\S]*?```/g, ' ')
    // Remove inline code
    .replace(/`[^`]+`/g, ' ')
    // Remove images
    .replace(/!\[[^\]]*\]\([^)]+\)/g, ' ')
    // Convert links to just text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    // Remove bare URLs
    .replace(/<[^>]+>/g, ' ')
    // Remove markdown headings/bullets/blockquotes/table chars
    .replace(/^[#\*\->|]+\s*/gm, ' ')
    // Remove horizontal rules
    .replace(/^-{3,}$/gm, ' ')
    // Collapse whitespace
    .replace(/\s+/g, ' ')
    .trim();
}

// Build search index
function buildSearchIndex(mdFiles) {
  const index = [];
  for (const mdPath of mdFiles) {
    const content = fs.readFileSync(mdPath, 'utf8');
    const title = content.match(/^#\s+(.+)$/m)?.[1] || path.basename(mdPath, '.md');
    const relative = path.relative(__dirname, mdPath).replace(/\.md$/, '.html');
    const text = extractText(content);
    index.push({
      title,
      path: relative,
      text: text.slice(0, 3000) // Limit index size
    });
  }
  const outPath = path.join(__dirname, 'html', 'search-index.json');
  fs.writeFileSync(outPath, JSON.stringify(index, null, 2), 'utf8');
  console.log(`✓ search-index.json (${index.length} documents)`);
}

// Clean old HTML files that don't have a corresponding .md source
function cleanStaleFiles(mdFiles) {
  const htmlDir = path.join(__dirname, 'html');
  const validSet = new Set();
  for (const mdPath of mdFiles) {
    const rel = path.relative(__dirname, mdPath).replace(/\.md$/, '.html');
    validSet.add(path.join(htmlDir, rel));
  }
  // Always keep these generated files
  validSet.add(path.join(htmlDir, 'index.html'));
  validSet.add(path.join(htmlDir, 'search-index.json'));
  validSet.add(path.join(htmlDir, 'mermaid.min.js'));

  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
        // Remove empty directories
        try { fs.rmdirSync(full); } catch {}
      } else if (!validSet.has(full)) {
        fs.unlinkSync(full);
      }
    }
  }
  walk(htmlDir);
}

// Copy static assets to html output
function copyAssets() {
  const assets = ['mermaid.min.js'];
  for (const asset of assets) {
    const src = path.join(__dirname, asset);
    const dst = path.join(__dirname, 'html', asset);
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, dst);
      console.log(`✓ ${asset} (asset)`);
    }
  }
}

// Main
console.log('Building HTML files from Markdown...\n');
fs.mkdirSync(path.join(__dirname, 'html'), { recursive: true });

const mdFiles = findMdFiles(__dirname);
cleanStaleFiles(mdFiles);
copyAssets();
mdFiles.forEach(convertFile);

buildHomepage();
buildSearchIndex(mdFiles);

console.log(`\n✓ Built ${mdFiles.length} HTML files + homepage + search index`);
console.log('Output directory: html/');
