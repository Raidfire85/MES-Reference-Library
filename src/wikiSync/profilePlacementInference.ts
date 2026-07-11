import { MERIDIUS_WIKI_PROFILE_HTML } from './constants';

export type ProfileNavGroup =
  | 'existing-leaf'
  | 'modding-economy'
  | 'modding-manipulation'
  | 'modding-player'
  | 'modding-spawning'
  | 'modding-events'
  | 'modding-behaviors'
  | 'modding-zone'
  | 'modding-discovered'
  | 'modder-resources';

export interface HtmlProfilePlacement {
  htmlFile: string;
  navTitle: string;
  navGroup: ProfileNavGroup;
  parentNavPath: string[];
  matchExistingTitle?: string;
}

export interface ProfilePlacementContext {
  header: string | null;
  title: string;
  htmlFile: string;
}

export const PROFILE_PLACEMENT_OVERRIDES: Partial<
  Record<string, Partial<HtmlProfilePlacement>>
> = {
  'FactionIconProfile.cs': {
    navTitle: 'Faction Icon Profiles',
  },
};

const MERIDIUS_EXISTING_NAV: Record<
  string,
  { matchExistingTitle: string; parentNavPath: string[] }
> = {
  'BlockReplacementProfile.cs': {
    matchExistingTitle: 'Block Replacement',
    parentNavPath: ['Modding', 'Spawning', 'Manipulation'],
  },
  'DerelictionProfile.cs': {
    matchExistingTitle: 'Dereliction',
    parentNavPath: ['Modding', 'Spawning', 'Manipulation'],
  },
  'LootProfile.cs': {
    matchExistingTitle: 'Loot',
    parentNavPath: ['Modding', 'Spawning', 'Manipulation'],
  },
  'ManipulationProfile.cs': {
    matchExistingTitle: 'Manipulation Groups',
    parentNavPath: ['Modding', 'Spawning', 'Manipulation'],
  },
  'ReplenishmentProfile.cs': {
    matchExistingTitle: 'Replenishment',
    parentNavPath: ['Modding', 'Spawning', 'Manipulation'],
  },
  'WeaponModRulesProfile.cs': {
    matchExistingTitle: 'Weapon Mod Rules',
    parentNavPath: ['Modding', 'Spawning', 'Manipulation'],
  },
  'TriggerGroupProfile.cs': {
    matchExistingTitle: 'Trigger Group',
    parentNavPath: ['Modding', 'Behaviors (Getting Started)'],
  },
  'WaypointProfile.cs': {
    matchExistingTitle: 'Waypoint',
    parentNavPath: ['Modding', 'Behaviors (Getting Started)'],
  },
  'ZoneConditionsProfile.cs': {
    matchExistingTitle: 'Zone Conditions',
    parentNavPath: ['Modding', 'Spawning'],
  },
  'EventProfile.cs': {
    matchExistingTitle: 'Event',
    parentNavPath: ['Modding', 'Events (Getting Started)'],
  },
};

type CategoryRule = {
  navGroup: ProfileNavGroup;
  matchHeader?: (header: string) => boolean;
  matchProfileCs?: (profileCs: string) => boolean;
};

const CATEGORY_RULES: CategoryRule[] = [
  {
    navGroup: 'modding-manipulation',
    matchHeader: (header) =>
      /\[MES (Block Replacement|Dereliction|Loot|Manipulation|Prefab|Replenishment|Weapon Mod Rules)\]/i.test(
        header
      ) || /\[MES Prefab Gravity\]/i.test(header),
    matchProfileCs: (profileCs) =>
      /(BlockReplacement|Dereliction|Loot|Manipulation|Prefab|Replenishment|WeaponModRules|Gravity)/i.test(
        profileCs
      ),
  },
  {
    navGroup: 'modding-economy',
    matchHeader: (header) =>
      /\[MES (Shipyard|Store|SafeZone|Mission|Contract Block)\]/i.test(header),
    matchProfileCs: (profileCs) =>
      /(Shipyard|Store|Safezone|SafeZone|Mission|ContractBlock)/i.test(profileCs),
  },
  {
    navGroup: 'modding-player',
    matchHeader: (header) => /\[MES (Player Condition|Suit Upgrades)\]/i.test(header),
    matchProfileCs: (profileCs) => /(PlayerCondition|SuitUpgrade)/i.test(profileCs),
  },
  {
    navGroup: 'modder-resources',
    matchHeader: (header) => /\[MES Faction Icon\]/i.test(header),
    matchProfileCs: (profileCs) => /FactionIcon/i.test(profileCs),
  },
  {
    navGroup: 'modding-zone',
    matchHeader: (header) => /\[MES Zone( Conditions)?\]/i.test(header),
    matchProfileCs: (profileCs) => /Zone(Conditions)?Profile/i.test(profileCs),
  },
  {
    navGroup: 'modding-spawning',
    matchHeader: (header) =>
      /\[MES (Spawn Conditions|Spawn Conditions Group|Static Encounter|Bot Spawn)\]/i.test(
        header
      ) || /\[Modular Encounters SpawnGroup\]/i.test(header),
    matchProfileCs: (profileCs) =>
      /(SpawnCondition|SpawnGroup|StaticEncounter|BotSpawn)/i.test(profileCs),
  },
  {
    navGroup: 'modding-events',
    matchHeader: (header) => /\[MES Event/i.test(header),
    matchProfileCs: (profileCs) => /Event/i.test(profileCs),
  },
  {
    navGroup: 'modding-behaviors',
    matchHeader: (header) => /(\[RivalAI|\[MES AI )/i.test(header),
    matchProfileCs: (profileCs) =>
      /(Action|Autopilot|Behavior|Chat|Command|Condition|Spawn|Target|Trigger|Weapon|Waypoint)/i.test(
        profileCs
      ),
  },
];

const NAV_GROUP_DEFAULTS: Record<
  Exclude<ProfileNavGroup, 'existing-leaf'>,
  Pick<HtmlProfilePlacement, 'parentNavPath'>
> = {
  'modding-manipulation': {
    parentNavPath: ['Modding', 'Spawning', 'Manipulation'],
  },
  'modding-economy': {
    parentNavPath: ['Modding'],
  },
  'modding-player': {
    parentNavPath: ['Modding'],
  },
  'modder-resources': {
    parentNavPath: ['Modder Resources'],
  },
  'modding-zone': {
    parentNavPath: ['Modding'],
  },
  'modding-spawning': {
    parentNavPath: ['Modding', 'Spawning'],
  },
  'modding-events': {
    parentNavPath: ['Modding', 'Events (Getting Started)'],
  },
  'modding-behaviors': {
    parentNavPath: ['Modding', 'Behaviors (Getting Started)'],
  },
  'modding-discovered': {
    parentNavPath: ['Modding'],
  },
};

export function resolveProfileHtmlFile(
  profileCs: string,
  htmlFile: string,
  _header: string | null = null
): string {
  const override = PROFILE_PLACEMENT_OVERRIDES[profileCs]?.htmlFile;
  if (override) {
    return override;
  }

  const meridiusHtml = MERIDIUS_WIKI_PROFILE_HTML[profileCs];
  if (meridiusHtml) {
    return meridiusHtml;
  }

  return htmlFile;
}

export function inferProfileNavGroup(
  profileCs: string,
  context: ProfilePlacementContext
): ProfileNavGroup {
  if (MERIDIUS_EXISTING_NAV[profileCs] || MERIDIUS_WIKI_PROFILE_HTML[profileCs]) {
    return 'existing-leaf';
  }

  const header = context.header ?? '';
  for (const rule of CATEGORY_RULES) {
    if (rule.matchHeader?.(header) || rule.matchProfileCs?.(profileCs)) {
      return rule.navGroup;
    }
  }

  return 'modding-discovered';
}

export function inferProfilePlacement(
  profileCs: string,
  context: ProfilePlacementContext
): HtmlProfilePlacement {
  const htmlFile = resolveProfileHtmlFile(profileCs, context.htmlFile, context.header);
  const navTitle = context.title || profileCsToTitle(profileCs);
  const navGroup = inferProfileNavGroup(profileCs, context);

  if (navGroup === 'existing-leaf') {
    const existingNav = MERIDIUS_EXISTING_NAV[profileCs];
    if (existingNav) {
      return {
        htmlFile,
        navTitle: existingNav.matchExistingTitle,
        navGroup,
        parentNavPath: existingNav.parentNavPath,
        matchExistingTitle: existingNav.matchExistingTitle,
      };
    }

    const derivedTitle = navTitleFromHtmlFile(htmlFile);
    return {
      htmlFile,
      navTitle: derivedTitle,
      navGroup,
      parentNavPath: ['Modding'],
      matchExistingTitle: derivedTitle,
    };
  }

  const defaults = NAV_GROUP_DEFAULTS[navGroup];
  return {
    htmlFile,
    navTitle,
    navGroup,
    parentNavPath: defaults.parentNavPath,
  };
}

export function resolveProfilePlacement(
  profileCs: string,
  context: ProfilePlacementContext
): HtmlProfilePlacement {
  const inferred = inferProfilePlacement(profileCs, context);
  const override = PROFILE_PLACEMENT_OVERRIDES[profileCs];
  if (!override) {
    return inferred;
  }

  return {
    ...inferred,
    ...override,
    parentNavPath: override.parentNavPath ?? inferred.parentNavPath,
  };
}

export function isPublisherManagedProfilePage(profileCs: string, htmlFile: string): boolean {
  if (PROFILE_PLACEMENT_OVERRIDES[profileCs]) {
    return true;
  }

  if (MERIDIUS_WIKI_PROFILE_HTML[profileCs]) {
    return true;
  }

  return /Profile\.cs$/i.test(profileCs) && htmlFile.endsWith('.html');
}

function profileCsToTitle(profileCs: string): string {
  const base = profileCs.replace(/\.cs$/i, '').replace(/Profile$/i, '');
  const parts = base.split(/(?=[A-Z])/).filter(Boolean);
  return parts.join(' ');
}

function navTitleFromHtmlFile(htmlFile: string): string {
  const stem = htmlFile.replace(/\.html$/i, '');
  return stem
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}
