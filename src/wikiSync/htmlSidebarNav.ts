import type { DiscoveredProfile } from './discoveredProfiles';
import {
  LEGACY_PROFILE_NAV_END,
  LEGACY_PROFILE_NAV_START,
  PROFILE_NAV_HTML_MARKERS,
  getProfilePlacement,
} from './profilePlacements';
import type { ProfileNavGroup } from './profilePlacementInference';
import { contentEquals } from './wikiHtml';
import { SIDEBAR_PATTERN } from './constants';

export interface ProfileNavEntry {
  profileCs: string;
  title: string;
  htmlFile: string;
  navGroup: ProfileNavGroup;
}

const MODDING_TOP_LEVEL_ANCHOR =
  /<li><a href="Player-Condition-Profile\.html"><strong>Player Conditions \(New\)<\/strong><\/a><\/li>/;

/** Inserted in order after Player Conditions — matches WebWiki mkdocs.yml sibling order. */
const MODDING_TOP_LEVEL_GROUP_ORDER: Array<Exclude<ProfileNavGroup, 'existing-leaf'>> = [
  'modding-economy',
  'modding-player',
  'modding-discovered',
];

const NESTED_GROUP_ORDER: Array<Exclude<ProfileNavGroup, 'existing-leaf'>> = [
  'modding-manipulation',
  'modding-spawning',
  'modding-events',
  'modding-behaviors',
  'modder-resources',
];

function buildProfileNavEntries(profiles: DiscoveredProfile[]): ProfileNavEntry[] {
  const entries: ProfileNavEntry[] = [];

  for (const profile of profiles) {
    const placement = getProfilePlacement(profile.profileCs, {
      header: profile.header,
      title: profile.title,
      htmlFile: profile.htmlFile,
    });

    if (placement.navGroup === 'existing-leaf') {
      continue;
    }

    entries.push({
      profileCs: profile.profileCs,
      title: profile.title,
      htmlFile: profile.htmlFile,
      navGroup: placement.navGroup,
    });
  }

  return entries;
}

function buildNavLinkLine(entry: ProfileNavEntry): string {
  return `<li><a href="${entry.htmlFile}"><strong>${entry.title}</strong></a></li>`;
}

function buildNavGroupBlock(
  groupId: Exclude<ProfileNavGroup, 'existing-leaf'>,
  links: string
): string {
  const marker = PROFILE_NAV_HTML_MARKERS[groupId];
  if (!links.trim()) {
    return `${marker.start}\n${marker.end}`;
  }

  if (marker.sectionTitle && marker.wrapInSublist) {
    return `${marker.start}
<li class="mes-nav-group"><strong>${marker.sectionTitle}</strong>
<ul>
${links}
</ul>
</li>
${marker.end}`;
  }

  return `${marker.start}
${links}
${marker.end}`;
}

function removeMarkerBlock(content: string, start: string, end: string): string {
  const pattern = new RegExp(`${escapeRegex(start)}[\\s\\S]*?${escapeRegex(end)}\\s*`, 'g');
  return content.replace(pattern, '');
}

function removeManagedProfileLinks(content: string, entries: ProfileNavEntry[]): string {
  let updated = content;
  for (const entry of entries) {
    const pattern = new RegExp(
      `\\s*<li><a href="${escapeRegex(entry.htmlFile)}"><strong>[^<]*</strong></a></li>`,
      'g'
    );
    updated = updated.replace(pattern, '');
  }
  return updated;
}

function insertAfterAnchor(content: string, anchor: RegExp, block: string): string {
  const match = content.match(anchor);
  if (!match || match.index === undefined) {
    return content;
  }

  const insertAt = match.index + match[0].length;
  return `${content.slice(0, insertAt)}\n${block}\n${content.slice(insertAt)}`;
}

function insertOrReplaceMarkerBlock(
  content: string,
  groupId: Exclude<ProfileNavGroup, 'existing-leaf'>,
  block: string
): string {
  const marker = PROFILE_NAV_HTML_MARKERS[groupId];
  const existingPattern = new RegExp(
    `${escapeRegex(marker.start)}[\\s\\S]*?${escapeRegex(marker.end)}`
  );

  if (existingPattern.test(content)) {
    return content.replace(existingPattern, block);
  }

  return insertAfterAnchor(content, marker.anchorPattern, block);
}

function removeLegacyNavBlock(content: string): string {
  const pattern = new RegExp(
    `${escapeRegex(LEGACY_PROFILE_NAV_START)}[\\s\\S]*?${escapeRegex(LEGACY_PROFILE_NAV_END)}\\s*`,
    'g'
  );
  return content.replace(pattern, '');
}

function buildCombinedTopLevelBlock(
  entries: ProfileNavEntry[],
  groupOrder: Array<Exclude<ProfileNavGroup, 'existing-leaf'>>
): string {
  const parts: string[] = [];

  for (const groupId of groupOrder) {
    const marker = PROFILE_NAV_HTML_MARKERS[groupId];
    const groupEntries = entries
      .filter((entry) => entry.navGroup === groupId)
      .sort((a, b) => a.title.localeCompare(b.title));

    if (groupEntries.length === 0) {
      continue;
    }

    parts.push(buildNavGroupBlock(groupId, groupEntries.map(buildNavLinkLine).join('\n')));
  }

  return parts.join('\n');
}

function applyTopLevelModdingNav(content: string, entries: ProfileNavEntry[]): string {
  for (const groupId of MODDING_TOP_LEVEL_GROUP_ORDER) {
    const marker = PROFILE_NAV_HTML_MARKERS[groupId];
    content = removeMarkerBlock(content, marker.start, marker.end);
  }

  const combined = buildCombinedTopLevelBlock(entries, MODDING_TOP_LEVEL_GROUP_ORDER);
  if (!combined.trim()) {
    return content;
  }

  const topLevelPattern = new RegExp(
    `${MODDING_TOP_LEVEL_GROUP_ORDER.map((groupId) => escapeRegex(PROFILE_NAV_HTML_MARKERS[groupId].start)).join('|')}[\\s\\S]*?(${MODDING_TOP_LEVEL_GROUP_ORDER.map((groupId) => escapeRegex(PROFILE_NAV_HTML_MARKERS[groupId].end)).join('|')})`
  );

  if (topLevelPattern.test(content)) {
    let updated = content;
    for (const groupId of MODDING_TOP_LEVEL_GROUP_ORDER) {
      const marker = PROFILE_NAV_HTML_MARKERS[groupId];
      updated = removeMarkerBlock(updated, marker.start, marker.end);
    }
    return insertAfterAnchor(updated, MODDING_TOP_LEVEL_ANCHOR, combined);
  }

  return insertAfterAnchor(content, MODDING_TOP_LEVEL_ANCHOR, combined);
}

export function updateStructuredSidebars(
  content: string,
  profiles: DiscoveredProfile[] = []
): { content: string; changed: boolean } {
  SIDEBAR_PATTERN.lastIndex = 0;
  if (!SIDEBAR_PATTERN.test(content) || profiles.length === 0) {
    return { content, changed: false };
  }

  const entries = buildProfileNavEntries(profiles);
  let updated = removeLegacyNavBlock(content);
  updated = removeManagedProfileLinks(updated, entries);

  for (const groupId of [...NESTED_GROUP_ORDER, 'modding-zone' as const]) {
    const marker = PROFILE_NAV_HTML_MARKERS[groupId];
    updated = removeMarkerBlock(updated, marker.start, marker.end);
  }

  for (const groupId of NESTED_GROUP_ORDER) {
    const groupEntries = entries
      .filter((entry) => entry.navGroup === groupId)
      .sort((a, b) => a.title.localeCompare(b.title));

    const links = groupEntries.map(buildNavLinkLine).join('\n');
    const block = buildNavGroupBlock(groupId, links);
    updated = insertOrReplaceMarkerBlock(updated, groupId, block);
  }

  updated = applyTopLevelModdingNav(updated, entries);

  return {
    content: updated,
    changed: !contentEquals(content, updated),
  };
}

function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
