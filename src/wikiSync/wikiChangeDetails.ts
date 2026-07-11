import {
  EXAMPLE_SYNC_END,
  EXAMPLE_SYNC_START,
  SYNC_END,
  SYNC_START,
} from './constants';

export interface PageContentChangeAnalysis {
  tagsAdded: string[];
  tagsRemoved: string[];
  tagsRefreshed: string[];
  blurbChanged: boolean;
  exampleChanged: boolean;
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function extractMarkedBlock(content: string, start: string, end: string): string {
  const startIndex = content.indexOf(start);
  if (startIndex === -1) {
    return '';
  }

  const endIndex = content.indexOf(end, startIndex + start.length);
  if (endIndex === -1) {
    return '';
  }

  return content.slice(startIndex + start.length, endIndex);
}

export function getTagsInSyncBlockHtml(content: string): string[] {
  const block = extractMarkedBlock(content, SYNC_START, SYNC_END);
  if (!block) {
    return [];
  }

  const tags: string[] = [];
  const pattern = /<th align="left">Tag:<\/th>\s*<th align="left">([A-Za-z0-9_-]+)<\/th>/g;
  for (const match of block.matchAll(pattern)) {
    tags.push(match[1]);
  }

  return [...new Set(tags)].sort();
}

function getTagTableSnippet(block: string, tag: string): string | null {
  const pattern = new RegExp(
    `<div class="mes-tag-table-wrap">[\\s\\S]*?<th align="left">Tag:</th>\\s*<th align="left">${escapeRegex(tag)}</th>[\\s\\S]*?</div>`,
    'i'
  );
  return block.match(pattern)?.[0]?.trim() ?? null;
}

function normalizeForCompare(value: string): string {
  return value.replace(/\r\n/g, '\n').trim();
}

export function analyzePageContentChanges(
  existing: string,
  next: string,
  allTags: string[]
): PageContentChangeAnalysis {
  const existingSync = extractMarkedBlock(existing, SYNC_START, SYNC_END);
  const nextSync = extractMarkedBlock(next, SYNC_START, SYNC_END);
  const existingTags = getTagsInSyncBlockHtml(existing);
  const nextTags = [...new Set(allTags)].sort();

  const tagsAdded = nextTags.filter((tag) => !existingTags.includes(tag));
  const tagsRemoved = existingTags.filter((tag) => !nextTags.includes(tag));
  const tagsRefreshed: string[] = [];

  for (const tag of nextTags) {
    if (tagsAdded.includes(tag)) {
      continue;
    }

    const before = getTagTableSnippet(existingSync, tag);
    const after = getTagTableSnippet(nextSync, tag);
    if (before !== after) {
      tagsRefreshed.push(tag);
    }
  }

  const existingExample = extractMarkedBlock(existing, EXAMPLE_SYNC_START, EXAMPLE_SYNC_END);
  const nextExample = extractMarkedBlock(next, EXAMPLE_SYNC_START, EXAMPLE_SYNC_END);

  return {
    tagsAdded,
    tagsRemoved,
    tagsRefreshed,
    blurbChanged:
      normalizeForCompare(stripIntroForCompare(existing)) !== normalizeForCompare(stripIntroForCompare(next)),
    exampleChanged: normalizeForCompare(existingExample) !== normalizeForCompare(nextExample),
  };
}

function stripIntroForCompare(content: string): string {
  let next = removeManagedBlocks(content);
  next = next.replace(/<h1 class="gh-header-title">[^<]*<\/h1>/i, '');
  next = next.replace(/Profile header:[^\n<]*/gi, '');
  return next.trim();
}

function removeManagedBlocks(content: string): string {
  return content
    .replace(
      new RegExp(
        `${escapeRegex(EXAMPLE_SYNC_START)}[\\s\\S]*?${escapeRegex(EXAMPLE_SYNC_END)}`,
        'g'
      ),
      ''
    )
    .replace(
      new RegExp(`${escapeRegex(SYNC_START)}[\\s\\S]*?${escapeRegex(SYNC_END)}`, 'g'),
      ''
    );
}
