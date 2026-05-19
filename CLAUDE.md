# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

LLM Agent 源码学习 — 对四个主流开源 AI Agent 框架（Claude Code · OpenClaw · Hermes Agent · OpenHuman）的深度分析和架构拆解，提炼可复用的设计模式。共 41+ 篇文档，以 PM Agent + OpenClaw 驱动学习。

## Build

```bash
npm run build          # Convert all .md → .html via build-html.js + marked 18.x
```

Output in `html/`. Open `html/index.html` in browser to preview. Build cleans stale HTML files automatically.

## Project Structure

```
├── CLAUDE-CODE/       # 第 1 章 — Claude Code 深度解析（27 篇 + 2 附录）
├── OPENCLAW/          # 第 2 章 — OpenClaw 架构学习（4 篇）
├── HERMES/            # 第 3 章 — Hermes Agent 多模态（3 篇）
├── OPENHUMAN/         # 第 4 章 — OpenHuman 开放接口（3 篇）
├── PATTERNS/          # 第 5 章 — 共性模式提炼（4 篇）
├── agent-studies/     # 学习计划与导航
├── build-html.js      # Build script — walks dirs, renders .md→.html against template
├── template.html      # 单文件 HTML 模板（~44KB，含 CSS/JS，无框架依赖）
├── _sidebar.md        # 全局侧边栏导航（5 个章节 + 附录）
├── _coverpage.md      # 首页源（优先级高于 README.md）
├── SUMMARY.md         # 完整目录结构 + 学习进度表
└── html/              # Build 输出（静态 HTML 页面）
```

## Architecture

- **Content layer**: 五章 markdown 文档，按章节组织，各有独立 `_sidebar.md`。使用标准 GitBook 约定的相对路径交叉链接。
- **Build layer**: `build-html.js` 递归扫描除 `node_modules/` `html/` 外的所有目录，用 `marked` 渲染 Markdown → HTML 并注入 `template.html`。处理链接重写（`.md` → `.html`）、侧边栏解析、思考笔记预处理。
- **Template layer**: `template.html` 是一个自包含的 ~44KB 单文件模板，集成 CSS/JS。关键功能：折叠侧边栏 + 全文本搜索（构建时生成的 `search-index.json`）+ 移动端汉堡菜单 + 回到顶部 + 代码复制 + Mermaid 模态放大。
- **Search**: `search-index.json` 在构建时从所有 markdown 文件中提取纯文本生成，前端通过 fetch 实现客户端搜索和高亮。
- **Mermaid**: 构建时将 ````mermaid` fence 中的 `<` `>` 转义为 `&lt;` `&gt;` 防止被浏览器解析为 HTML 标签，前端通过 `mermaid.min.js` 渲染，点击图表可在模态窗口中放大查看。

## Content Conventions

- 中文文档，文档以 `# Title` 开头（用作 HTML `<title>`）
- 侧边栏格式：章节标题 `* **{num}. {Title}**`，子项 `* [{num}.{sub} {title}](/{path})`
- Mermaid 图使用 ````mermaid` 代码围栏
- 相对链接使用 `.md` 后缀，构建脚本自动转为 `.html`
- 每章末尾的 **本章思考** 部分使用 `<table class="guide-card collapsed">` 格式的折叠卡片，构建脚本自动处理
- 思考笔记使用 `<div class="thinking-note">...</div>` 包裹内部 markdown，构建脚本 `preprocessMarkdown` 会渲染内部内容
- 文中的 **引导思考** 标题 + 表格在构建时被自动转换为 `guide-card` 类，默认折叠

## Key Build Script Details

- 入口: `build-html.js` (Node.js, 无构建工具依赖)
- `findMdFiles()` 递归扫描，排除 `node_modules/` `html/` 和 `_sidebar.md` `_coverpage.md`
- `parseSidebar()` 解析 `_sidebar.md` → 折叠 HTML，支持按章节分组
- `fixLinks()` 将 `.md` 相对链接重写为 `.html`
- `cleanStaleFiles()` 清理无对应 `.md` 源的残留 `.html`
- Homepage: `_coverpage.md` > `README.md` → `html/index.html`
- `rebuild_ch26_content.js` — 用于重建 / 同步第 26 章内容的辅助脚本

## Special Rendering

| Feature | Mechanism |
|---------|-----------|
| Mermaid | `<`/`>` 构建时转义 → browser decode → mermaid 渲染 → 点击模态放大 |
| 思考笔记 | `<div class="thinking-note">` 内嵌 markdown 在构建时预渲染 |
| 引导思考 | `<!-- 引导思考 -->` 表格自动转为折叠 `.guide-card` |
| 本章思考 | 构建脚本特殊处理，表格首行插入 collapse toggle |
| 代码复制 | 模板 JS 为每个 `<pre><code>` 添加 "复制" 按钮 |
