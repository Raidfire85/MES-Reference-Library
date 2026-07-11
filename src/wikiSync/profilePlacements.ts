import type { ProfileNavGroup, HtmlProfilePlacement } from './profilePlacementInference';
import {
  inferProfilePlacement,
  isPublisherManagedProfilePage,
  resolveProfileHtmlFile,
  resolveProfilePlacement,
} from './profilePlacementInference';

export type { ProfileNavGroup, ProfilePlacementContext, HtmlProfilePlacement } from './profilePlacementInference';
export {
  inferProfileNavGroup,
  inferProfilePlacement,
  isPublisherManagedProfilePage,
  resolveProfileHtmlFile,
  resolveProfilePlacement,
  PROFILE_PLACEMENT_OVERRIDES,
} from './profilePlacementInference';

export interface ProfileNavHtmlMarker {
  start: string;
  end: string;
  anchorPattern: RegExp;
  insertMode: 'after-anchor' | 'before-anchor-close';
  sectionTitle?: string;
  wrapInSublist?: boolean;
}

export const PROFILE_NAV_HTML_MARKERS: Record<
  Exclude<ProfileNavGroup, 'existing-leaf'>,
  ProfileNavHtmlMarker
> = {
  'modding-manipulation': {
    start: '<!-- MES-WIKI-NAV-MODDING-MANIPULATION-SYNC-START -->',
    end: '<!-- MES-WIKI-NAV-MODDING-MANIPULATION-SYNC-END -->',
    anchorPattern: /<li><a href="Replenishment\.html">Replenishment<\/a><\/li>/,
    insertMode: 'after-anchor',
  },
  'modding-spawning': {
    start: '<!-- MES-WIKI-NAV-MODDING-SPAWNING-SYNC-START -->',
    end: '<!-- MES-WIKI-NAV-MODDING-SPAWNING-SYNC-END -->',
    anchorPattern: /<li><a href="Zone\.html">Zone<\/a><\/li>/,
    insertMode: 'after-anchor',
    sectionTitle: 'Additional Spawning Profiles',
    wrapInSublist: true,
  },
  'modding-events': {
    start: '<!-- MES-WIKI-NAV-MODDING-EVENTS-SYNC-START -->',
    end: '<!-- MES-WIKI-NAV-MODDING-EVENTS-SYNC-END -->',
    anchorPattern: /<li><a href="Event\.html">Event<\/a>/,
    insertMode: 'after-anchor',
    sectionTitle: 'Additional Event Profiles',
    wrapInSublist: true,
  },
  'modding-behaviors': {
    start: '<!-- MES-WIKI-NAV-MODDING-BEHAVIORS-SYNC-START -->',
    end: '<!-- MES-WIKI-NAV-MODDING-BEHAVIORS-SYNC-END -->',
    anchorPattern: /<li><a href="Waypoint\.html">Waypoint<\/a><\/li>/,
    insertMode: 'after-anchor',
    sectionTitle: 'Additional Behavior Profiles',
    wrapInSublist: true,
  },
  'modding-player': {
    start: '<!-- MES-WIKI-NAV-MODDING-PLAYER-SYNC-START -->',
    end: '<!-- MES-WIKI-NAV-MODDING-PLAYER-SYNC-END -->',
    anchorPattern:
      /<li><a href="Player-Condition-Profile\.html"><strong>Player Conditions \(New\)<\/strong><\/a><\/li>/,
    insertMode: 'after-anchor',
  },
  'modding-zone': {
    start: '<!-- MES-WIKI-NAV-MODDING-ZONE-SYNC-START -->',
    end: '<!-- MES-WIKI-NAV-MODDING-ZONE-SYNC-END -->',
    anchorPattern: /<li><a href="Zone\.html">Zone<\/a><\/li>/,
    insertMode: 'after-anchor',
  },
  'modding-economy': {
    start: '<!-- MES-WIKI-NAV-MODDING-ECONOMY-SYNC-START -->',
    end: '<!-- MES-WIKI-NAV-MODDING-ECONOMY-SYNC-END -->',
    anchorPattern: /<li><a href="Zone\.html">Zone<\/a><\/li>/,
    insertMode: 'after-anchor',
    sectionTitle: 'Economy & Station Blocks',
    wrapInSublist: true,
  },
  'modding-discovered': {
    start: '<!-- MES-WIKI-NAV-MODDING-DISCOVERED-SYNC-START -->',
    end: '<!-- MES-WIKI-NAV-MODDING-DISCOVERED-SYNC-END -->',
    anchorPattern: /<li><a href="Zone\.html">Zone<\/a><\/li>/,
    insertMode: 'after-anchor',
    sectionTitle: 'Additional Profiles',
    wrapInSublist: true,
  },
  'modder-resources': {
    start: '<!-- MES-WIKI-NAV-MODDER-RESOURCES-SYNC-START -->',
    end: '<!-- MES-WIKI-NAV-MODDER-RESOURCES-SYNC-END -->',
    anchorPattern: /<li><a href="Tutorials\.html">Tutorials<\/a><\/li>/,
    insertMode: 'after-anchor',
  },
};

export const MANAGED_PROFILE_NAV_GROUP_ORDER: ProfileNavGroup[] = [
  'modding-manipulation',
  'modding-spawning',
  'modding-events',
  'modding-behaviors',
  'modding-player',
  'modding-zone',
  'modding-economy',
  'modding-discovered',
  'modder-resources',
];

export const LEGACY_PROFILE_NAV_START = '<!-- MES-WIKI-SOURCE-SYNC-NAV-START -->';
export const LEGACY_PROFILE_NAV_END = '<!-- MES-WIKI-SOURCE-SYNC-NAV-END -->';

export function getProfilePlacement(
  profileCs: string,
  context: {
    header: string | null;
    title: string;
    htmlFile: string;
  }
): HtmlProfilePlacement {
  return resolveProfilePlacement(profileCs, context);
}

export function getProfileHtmlFile(
  profileCs: string,
  htmlFile: string,
  header: string | null = null
): string {
  return resolveProfileHtmlFile(profileCs, htmlFile, header);
}
