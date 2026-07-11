import { parse as parseYaml } from 'yaml';

export interface NavItem {
  title: string;
  mdFile?: string;
  children?: NavItem[];
}

export function parseMkDocsNav(mkdocsContent: string): NavItem[] {
  const doc = parseYaml(mkdocsContent) as { nav?: unknown };
  if (!Array.isArray(doc.nav)) {
    return [];
  }

  return doc.nav.flatMap((entry) => normalizeNavEntry(entry));
}

function normalizeNavEntry(entry: unknown): NavItem[] {
  if (!entry || typeof entry !== 'object') {
    return [];
  }

  const items: NavItem[] = [];
  for (const [title, value] of Object.entries(entry as Record<string, unknown>)) {
    if (typeof value === 'string') {
      items.push({ title, mdFile: value });
      continue;
    }

    if (Array.isArray(value)) {
      const children = value.flatMap((child) => normalizeNavEntry(child));
      items.push({ title, children });
    }
  }

  return items;
}

export function collectNavMdFiles(nav: NavItem[]): string[] {
  const files = new Set<string>();

  function walk(items: NavItem[]): void {
    for (const item of items) {
      if (item.mdFile) {
        files.add(item.mdFile);
      }
      if (item.children) {
        walk(item.children);
      }
    }
  }

  walk(nav);
  return [...files];
}

export function buildNavTitleMap(nav: NavItem[]): Map<string, string> {
  const titles = new Map<string, string>();

  function walk(items: NavItem[]): void {
    for (const item of items) {
      if (item.mdFile) {
        titles.set(item.mdFile, item.title);
      }
      if (item.children) {
        walk(item.children);
      }
    }
  }

  walk(nav);
  return titles;
}

export function mdFileToHtmlFile(mdFile: string): string {
  if (mdFile.toLowerCase() === 'index.md') {
    return 'Home.html';
  }
  return mdFile.replace(/\.md$/i, '.html');
}

export function htmlFileToMdFile(htmlFile: string): string {
  if (htmlFile.toLowerCase() === 'home.html') {
    return 'index.md';
  }
  return htmlFile.replace(/\.html$/i, '.md');
}
