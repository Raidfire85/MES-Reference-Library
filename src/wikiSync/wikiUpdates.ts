export interface WikiSyncSummaryInput {
  updated: string[];
  errors: string[];
  sourceLabel: string;
}

export const UPDATES_SYNC_START = '<!-- MES-WIKI-UPDATES-SYNC-START -->';
export const UPDATES_SYNC_END = '<!-- MES-WIKI-UPDATES-SYNC-END -->';

export interface WikiUpdateHighlight {
  text: string;
  htmlFile?: string;
}

export interface WikiUpdatesHistory {
  version: 2;
  runs: Array<{
    date: string;
    source: string;
    highlights: WikiUpdateHighlight[];
  }>;
  lastSynced?: {
    date: string;
    source: string;
  };
}

const MAX_HISTORY_RUNS = 8;

export function buildUpdatesEmbed(history: WikiUpdatesHistory): string {
  const lines: string[] = [];
  lines.push('<div class="mes-wiki-updates">');
  lines.push('<p class="mes-wiki-updates-label">What\'s new</p>');
  lines.push(
    '<p class="mes-wiki-updates-summary">Recent changes to profile pages, tags, and sidebar navigation from the MES framework.</p>'
  );

  if (history.lastSynced) {
    lines.push(
      `<p class="mes-wiki-updates-meta"><strong>Last synced:</strong> ${formatDisplayDate(history.lastSynced.date)} — ${escapeHtml(formatSourceLabel(history.lastSynced.source))}</p>`
    );
  }

  const latest = history.runs[0];
  if (!latest || latest.highlights.length === 0) {
    lines.push(
      '<p class="mes-wiki-updates-meta">Documentation is up to date. No new profiles or tags since the last content update.</p>'
    );
    lines.push('</div>');
    return lines.join('\n');
  }

  lines.push(
    `<p class="mes-wiki-updates-meta"><strong>Last updated:</strong> ${formatDisplayDate(latest.date)}</p>`
  );
  lines.push('<ul class="mes-wiki-updates-latest">');
  for (const highlight of latest.highlights) {
    lines.push(`<li>${renderHighlightHtml(highlight)}</li>`);
  }
  lines.push('</ul>');

  if (history.runs.length > 1) {
    lines.push('<details class="mes-wiki-updates-history">');
    lines.push('<summary>Earlier updates</summary>');
    for (const run of history.runs.slice(1, MAX_HISTORY_RUNS)) {
      lines.push('<div class="mes-wiki-updates-history-entry">');
      lines.push(
        `<p class="mes-wiki-updates-history-date">${escapeHtml(formatDisplayDate(run.date))}</p>`
      );
      lines.push('<ul>');
      for (const highlight of run.highlights) {
        lines.push(`<li>${renderHighlightHtml(highlight)}</li>`);
      }
      lines.push('</ul>');
      lines.push('</div>');
    }
    lines.push('</details>');
  }

  lines.push('</div>');
  return lines.join('\n');
}

export function buildUpdatesSyncBlock(history: WikiUpdatesHistory): string {
  return `${UPDATES_SYNC_START}\n${buildUpdatesEmbed(history)}\n${UPDATES_SYNC_END}`;
}

export function summarizeSyncResult(result: WikiSyncSummaryInput): WikiUpdateHighlight[] {
  const highlights: WikiUpdateHighlight[] = [];

  for (const entry of result.updated) {
    if (entry.startsWith('Sidebars refreshed') || entry.startsWith('External links localized')) {
      highlights.push({ text: entry });
      continue;
    }

    const match = entry.match(/^([^(\s]+)(?:\s*\((.+)\))?/);
    if (!match) {
      highlights.push({ text: entry });
      continue;
    }

    const file = match[1];
    const detail = match[2] ?? 'updated';
    const title = file.replace(/\.html$/i, '').replace(/-/g, ' ');
    highlights.push({
      text: `${title} — ${detail}`,
      htmlFile: file.endsWith('.html') ? file : undefined,
    });
  }

  if (highlights.length === 0) {
    highlights.push({ text: 'Wiki checked — already up to date with MES source.' });
  }

  return highlights.slice(0, 6);
}

export function touchWikiUpdatesHistory(
  history: WikiUpdatesHistory,
  result: WikiSyncSummaryInput
): WikiUpdatesHistory {
  const today = new Date().toISOString().slice(0, 10);
  const highlights = summarizeSyncResult(result);
  const hasContentChanges = result.updated.some(
    (entry) =>
      !entry.startsWith('Sidebars refreshed') &&
      !entry.startsWith('External links localized') &&
      !entry.includes("What's new")
  );

  const next: WikiUpdatesHistory = {
    version: 2,
    lastSynced: {
      date: today,
      source: formatSourceLabel(result.sourceLabel),
    },
    runs: [...history.runs],
  };

  if (hasContentChanges) {
    next.runs.unshift({
      date: today,
      source: formatSourceLabel(result.sourceLabel),
      highlights,
    });
    next.runs = next.runs.slice(0, MAX_HISTORY_RUNS);
  } else if (next.runs.length === 0) {
    next.runs = [
      {
        date: today,
        source: formatSourceLabel(result.sourceLabel),
        highlights: [{ text: 'Wiki checked — already up to date with MES source.' }],
      },
    ];
  }

  return next;
}

export function injectUpdatesBlock(content: string, history: WikiUpdatesHistory): string {
  const block = buildUpdatesSyncBlock(history);
  if (content.includes(UPDATES_SYNC_START)) {
    const pattern = new RegExp(
      `${escapeRegex(UPDATES_SYNC_START)}[\\s\\S]*?${escapeRegex(UPDATES_SYNC_END)}`
    );
    return content.replace(pattern, block);
  }

  const expectLine = /<p>Here is what to expect in each section:<\/p>/i;
  if (expectLine.test(content)) {
    return content.replace(expectLine, `${block}\n\n<p>Here is what to expect in each section:</p>`);
  }

  const introEndPattern =
    /(<p>If you are having issues with the mod framework[\s\S]*?<\/p>\s*)/i;
  if (introEndPattern.test(content)) {
    return content.replace(introEndPattern, `$1\n${block}\n\n`);
  }

  return content;
}

function renderHighlightHtml(highlight: WikiUpdateHighlight): string {
  if (!highlight.htmlFile) {
    return escapeHtml(highlight.text);
  }

  const linkText = highlight.text.split(' — ')[0] || highlight.text;
  const suffix = highlight.text.includes(' — ')
    ? ` — ${escapeHtml(highlight.text.split(' — ').slice(1).join(' — '))}`
    : '';

  return `<a href="${escapeHtml(highlight.htmlFile)}">${escapeHtml(linkText)}</a>${suffix}`;
}

function formatSourceLabel(source: string): string {
  if (source === 'GitHub master' || source.includes('github')) {
    return 'MES master branch';
  }
  if (source.startsWith('local folder')) {
    return 'Local MES source';
  }
  return source;
}

function formatDisplayDate(isoDate: string): string {
  const parsed = new Date(`${isoDate}T12:00:00Z`);
  if (Number.isNaN(parsed.getTime())) {
    return isoDate;
  }

  return parsed.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
