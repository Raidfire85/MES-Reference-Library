import * as fs from 'fs/promises';
import * as path from 'path';
import MarkdownIt from 'markdown-it';
import {
  buildNavTitleMap,
  collectNavMdFiles,
  htmlFileToMdFile,
  mdFileToHtmlFile,
  NavItem,
  parseMkDocsNav,
} from './mkdocsNav';

const md = new MarkdownIt({ html: true, linkify: true, typographer: false });

export interface MdWikiBuildResult {
  pagesBuilt: number;
  outputDir: string;
}

export async function buildWikiFromMarkdown(options: {
  docsDir: string;
  mkdocsPath: string;
  outputDir: string;
  styleCssPath?: string;
}): Promise<MdWikiBuildResult> {
  const mkdocsContent = await fs.readFile(options.mkdocsPath, 'utf8');
  const nav = parseMkDocsNav(mkdocsContent);
  const navTitles = buildNavTitleMap(nav);
  const navMdFiles = new Set(collectNavMdFiles(nav));

  const allMdFiles = await listMarkdownFiles(options.docsDir);
  for (const mdFile of allMdFiles) {
    navMdFiles.add(mdFile);
  }

  const sidebarHtml = renderSidebar(nav);
  await fs.mkdir(options.outputDir, { recursive: true });

  const existing = await fs.readdir(options.outputDir);
  for (const file of existing) {
    if (file.endsWith('.html')) {
      await fs.unlink(path.join(options.outputDir, file));
    }
  }

  if (options.styleCssPath) {
    await fs.copyFile(options.styleCssPath, path.join(options.outputDir, 'mes-wiki.css'));
  }

  const jsonFiles = ['mes-wiki-updates.json', 'discovered-profiles.json', 'TagDescriptions.json'];
  for (const jsonFile of jsonFiles) {
    const src = path.join(options.docsDir, jsonFile);
    try {
      await fs.copyFile(src, path.join(options.outputDir, jsonFile));
    } catch {
      // optional sidecar files
    }
  }

  let pagesBuilt = 0;
  const mdFilesToBuild = [...navMdFiles]
    .filter((mdFile) => mdFile.toLowerCase() !== 'home.md' || !navMdFiles.has('index.md'))
    .sort();

  for (const mdFile of mdFilesToBuild) {
    const mdPath = path.join(options.docsDir, mdFile);
    let markdown: string;
    try {
      markdown = await fs.readFile(mdPath, 'utf8');
    } catch {
      continue;
    }

    const htmlFile = mdFileToHtmlFile(mdFile);
    const pageTitle = resolvePageTitle(mdFile, markdown, navTitles);
    const bodyMarkdown = stripLeadingPageHeading(markdown);
    const bodyHtml = rewriteContentLinks(md.render(bodyMarkdown));
    const pageHtml = buildPageHtml({
      title: pageTitle,
      htmlFile,
      bodyHtml,
      sidebarHtml,
    });

    await fs.writeFile(path.join(options.outputDir, htmlFile), pageHtml, 'utf8');
    pagesBuilt++;
  }

  return { pagesBuilt, outputDir: options.outputDir };
}

function buildPageHtml(options: {
  title: string;
  htmlFile: string;
  bodyHtml: string;
  sidebarHtml: string;
}): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(options.title)} &middot; MES Reference Library</title>
  <link rel="stylesheet" href="mes-wiki.css">
</head>
<body>
<div class="wiki-header">
  <h1 class="gh-header-title">${escapeHtml(options.title)}</h1>
  <div class="gh-header-meta">MES Community Wiki (synced from WebWiki)</div>
</div>
<div class="wiki-container">
  ${options.sidebarHtml}
  <div class="wiki-content">
    <div class="markdown-body">
${options.bodyHtml}
    </div>
  </div>
</div>
</body>
</html>`;
}

function renderSidebar(nav: NavItem[]): string {
  return `<div class="wiki-sidebar">
  <div class="wiki-rightbar">
    <div class="Box Box--condensed">
      <div class="Box-body wiki-custom-sidebar markdown-body">
${renderNavItems(nav, 0)}
      </div>
    </div>
  </div>
</div>`;
}

function renderNavItems(items: NavItem[], depth: number): string {
  const lines: string[] = [];

  for (const item of items) {
    if (item.mdFile && !item.children?.length) {
      const htmlFile = mdFileToHtmlFile(item.mdFile);
      lines.push(
        `${indent(depth)}<li><a href="${escapeAttr(htmlFile)}"><strong>${escapeHtml(item.title)}</strong></a></li>`
      );
      continue;
    }

    if (item.children?.length) {
      if (depth === 0) {
        lines.push(`${indent(depth)}<div class="markdown-heading"><h1 class="heading-element">${escapeHtml(item.title)}</h1></div>`);
      } else if (!item.mdFile) {
        lines.push(`${indent(depth)}<li class="mes-nav-group"><strong>${escapeHtml(item.title)}</strong>`);
      } else {
        const htmlFile = mdFileToHtmlFile(item.mdFile);
        lines.push(
          `${indent(depth)}<li><a href="${escapeAttr(htmlFile)}"><strong>${escapeHtml(item.title)}</strong></a>`
        );
      }

      lines.push(`${indent(depth + 1)}<ul>`);
      lines.push(renderNavItems(item.children, depth + 2));
      lines.push(`${indent(depth + 1)}</ul>`);

      if (depth > 0 && !item.mdFile) {
        lines.push(`${indent(depth)}</li>`);
      } else if (item.mdFile) {
        lines.push(`${indent(depth)}</li>`);
      }
    }
  }

  return lines.join('\n');
}

function rewriteContentLinks(html: string): string {
  return html
    .replace(/href="([^"]+)\/"/g, (_match, stem: string) => {
      if (/^https?:\/\//i.test(stem)) {
        return _match;
      }
      const file = stem.includes('.') ? stem : `${stem}.html`;
      return `href="${file.replace(/\.md$/i, '.html')}"`;
    })
    .replace(/href="([^"]+)\.md"/gi, (_match, stem: string) => `href="${stem}.html"`);
}

function stripWikiFileMarkerLines(markdown: string): string {
  return normalizeMarkdownLineEndings(markdown).replace(/^(?:#[^\s#][^\n]*\.md\s*\n)+/i, '');
}

function normalizeMarkdownLineEndings(markdown: string): string {
  return markdown.replace(/\r\n/g, '\n');
}

function stripLeadingPageHeading(markdown: string): string {
  let content = stripWikiFileMarkerLines(markdown);
  content = content.replace(/^\s*\n+/, '');
  content = content.replace(/^(?:\s*<!--[\s\S]*?-->\s*)+/, '');
  content = content.replace(/^#\s+[^\n]+\n+/, '');
  content = content.replace(/^\s*\n+/, '');
  return content;
}

function resolvePageTitle(
  mdFile: string,
  markdown: string,
  navTitles: Map<string, string>
): string {
  if (mdFile.toLowerCase() === 'index.md') {
    return pageTitleFromMarkdown(markdown, mdFile);
  }

  const navTitle = navTitles.get(mdFile);
  if (navTitle) {
    return navTitle;
  }

  return pageTitleFromMarkdown(markdown, mdFile);
}

function pageTitleFromMarkdown(markdown: string, mdFile: string): string {
  const cleaned = stripWikiFileMarkerLines(markdown)
    .replace(/^\s*\n+/, '')
    .replace(/^(?:\s*<!--[\s\S]*?-->\s*)+/, '');
  const firstLine = cleaned.split('\n')[0] ?? '';
  const heading = firstLine.match(/^#\s+(.+)$/);
  if (heading) {
    let title = heading[1].trim();
    if (/\.md$/i.test(title)) {
      title = title.replace(/\.md$/i, '');
    }
    return title.replace(/-/g, ' ');
  }

  const stem = mdFile.replace(/\.md$/i, '').replace(/^index$/i, 'Home');
  return stem.replace(/-/g, ' ');
}

async function listMarkdownFiles(docsDir: string): Promise<string[]> {
  const files: string[] = [];

  async function walk(dir: string, prefix = ''): Promise<void> {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(full, rel);
      } else if (entry.name.endsWith('.md')) {
        files.push(rel.replace(/\\/g, '/'));
      }
    }
  }

  await walk(docsDir);
  return files;
}

function indent(depth: number): string {
  return '  '.repeat(depth);
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeAttr(value: string): string {
  return escapeHtml(value);
}
