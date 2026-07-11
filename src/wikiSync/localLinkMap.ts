import { GITHUB_REPO } from './constants';

export const WIKI_BASE_URL = `https://github.com/${GITHUB_REPO}/wiki/`;
export const WIKI_RAW_BASE = `https://raw.githubusercontent.com/wiki/${GITHUB_REPO}/`;
const GIST_USER = 'MeridiusIX';

/** Gist pages bundled or synced as local HTML (matches MES-WebWiki-Sync GIST_FETCH_TARGETS). */
export const GIST_LOCAL_HTML: Record<string, string> = {
  '415b45b53174c608c6486ce06bb58e2c': 'Block-Replacement-Profiles.html',
  '52fbf5679e67107a8cf37706205b5812': 'Threat-Score-Guide.html',
  '8888bbc06a623cac90f8362dd948033c': 'Random-Name-Generator-Guide.html',
  '1ae743505ec489d31e6ac17edf16e5e0': 'SpawnGroup-Template.html',
  'cd9b4decb58dea335290a05b728a7276': 'Factions-Template.html',
};

/** GitHub wiki slugs mapped to local HTML (matches MES-WebWiki-Sync WIKI_FETCH_TARGETS). */
export const WIKI_LOCAL_HTML: Record<string, string> = {
  'Modding:-Tutorial-&-Guidelines:-NPC-Grid-Setup-Guidelines': 'NPC-Grid-Setup-Guidelines.html',
  'Behaviors:-Getting-Started': 'Behaviors-Getting-Started.html',
  'Events:-Getting-Started': 'Events-Getting-Started.html',
};

export function buildUrlToLocalHtmlMap(wikiFiles: Iterable<string>): Map<string, string> {
  const fileSet = new Set([...wikiFiles].map((f) => f.toLowerCase()));
  const map = new Map<string, string>();

  for (const htmlFile of fileSet) {
    const stem = htmlFile.replace(/\.html$/i, '');
    for (const url of wikiUrlVariants(stem)) {
      map.set(url, htmlFile);
    }
  }

  for (const [gistId, htmlFile] of Object.entries(GIST_LOCAL_HTML)) {
    for (const url of gistUrlVariants(gistId)) {
      map.set(url, htmlFile);
    }
  }

  for (const [wikiSlug, htmlFile] of Object.entries(WIKI_LOCAL_HTML)) {
    for (const url of wikiUrlVariants(wikiSlug)) {
      map.set(url, htmlFile);
    }
  }

  return map;
}

export function localizeHtmlContent(content: string, wikiFiles: Iterable<string>): string {
  const fileSet = new Set([...wikiFiles].map((f) => f.toLowerCase()));
  const urlToLocal = buildUrlToLocalHtmlMap(fileSet);
  let next = content;

  for (const [externalUrl, htmlFile] of urlToLocal) {
    next = replaceAllLiteral(next, externalUrl, htmlFile);
    next = replaceAllLiteral(next, externalUrl.replace(/&/g, '&amp;'), htmlFile);
  }

  next = next.replace(
    new RegExp(`${escapeRegex(WIKI_BASE_URL)}([^)\\s"']+)`, 'g'),
    (_match, rawSlug: string) => {
      const slug = decodeURIComponent(String(rawSlug).replace(/&amp;/g, '&').replace(/\.html$/i, ''));
      const mapped =
        lookupUrlMapping(urlToLocal, `${WIKI_BASE_URL}${slug}`, fileSet) ??
        lookupUrlMapping(urlToLocal, `${WIKI_BASE_URL}${encodeURIComponent(slug)}`, fileSet);
      if (mapped) {
        return mapped;
      }
      const slugHtml = `${slug}.html`;
      if (fileSet.has(slugHtml.toLowerCase())) {
        return slugHtml;
      }
      return _match;
    }
  );

  next = next.replace(
    /https?:\/\/gist\.github(?:usercontent)?\.com\/MeridiusIX\/([0-9a-f]+)(?:[^\s)"']*)?/gi,
    (_match, gistId: string) => GIST_LOCAL_HTML[gistId] ?? _match
  );

  return next;
}

export function isMesWikiLocalizableUrl(href: string, wikiFiles: Iterable<string>): string | null {
  const fileSet = new Set([...wikiFiles].map((f) => f.toLowerCase()));
  const urlToLocal = buildUrlToLocalHtmlMap(fileSet);
  const mapped = lookupUrlMapping(urlToLocal, href, fileSet);
  return mapped ?? null;
}

export function isModRepositoryLink(value: string): boolean {
  if (!/^https:\/\/github\.com\/MeridiusIX\//i.test(value)) {
    return false;
  }
  return !value.includes('/Modular-Encounters-Systems/');
}

function lookupUrlMapping(
  urlToLocal: Map<string, string>,
  url: string,
  wikiFiles: Set<string>
): string | undefined {
  const direct = urlToLocal.get(url);
  if (direct) {
    return direct;
  }

  const gistId = extractGistId(url);
  if (gistId && GIST_LOCAL_HTML[gistId]) {
    return GIST_LOCAL_HTML[gistId];
  }

  const wikiSlug = extractWikiSlug(url);
  if (wikiSlug) {
    const mapped = urlToLocal.get(`${WIKI_BASE_URL}${wikiSlug}`);
    if (mapped) {
      return mapped;
    }
    if (WIKI_LOCAL_HTML[wikiSlug]) {
      return WIKI_LOCAL_HTML[wikiSlug];
    }
    const slugHtml = `${wikiSlug}.html`;
    if (wikiFiles.has(slugHtml.toLowerCase())) {
      return slugHtml;
    }
  }

  return undefined;
}

function extractWikiSlug(url: string): string | undefined {
  if (!url.startsWith(WIKI_BASE_URL)) {
    return undefined;
  }
  return decodeURIComponent(url.slice(WIKI_BASE_URL.length).replace(/&amp;/g, '&').replace(/\.html$/i, ''));
}

function extractGistId(url: string): string | undefined {
  const match = url.match(/gist\.github(?:usercontent)?\.com\/MeridiusIX\/([0-9a-f]+)/i);
  return match?.[1];
}

function wikiUrlVariants(slug: string): string[] {
  const decoded = decodeURIComponent(slug);
  const encoded = encodeURIComponent(decoded).replace(/%20/g, '-');
  return [
    `${WIKI_BASE_URL}${decoded}`,
    `${WIKI_BASE_URL}${encoded}`,
    `${WIKI_BASE_URL}${decoded}.html`,
    `${WIKI_BASE_URL}${encoded}.html`,
  ];
}

function gistUrlVariants(gistId: string): string[] {
  return [
    `https://gist.github.com/${GIST_USER}/${gistId}`,
    `https://gist.github.com/${GIST_USER}/${gistId}?ts=2`,
    `https://gist.github.com/${GIST_USER}/${gistId}.html`,
    `https://gist.githubusercontent.com/${GIST_USER}/${gistId}/raw`,
  ];
}

function replaceAllLiteral(content: string, search: string, replacement: string): string {
  if (!search) {
    return content;
  }
  return content.split(search).join(replacement);
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
