/**
 * Refresh extension wikiSync modules from MES-WebWiki-Sync (canonical sync engine).
 * Run after changing publisher/ in MES-WebWiki-Sync.
 */
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const extensionRoot = path.resolve(__dirname, '..');
const webWikiSyncRoot = path.resolve(extensionRoot, '..', 'MES-WebWiki-Sync');

const syncCopies = [
  ['publisher/src/sync/tagMetaParser.ts', 'src/wikiSync/tagMetaParser.ts'],
  ['publisher/src/sync/typeHints.ts', 'src/wikiSync/typeHints.ts'],
  ['publisher/src/sync/discoveredProfiles.ts', 'src/wikiSync/discoveredProfiles.ts'],
  ['publisher/src/sync/mesSourceDiscovery.ts', 'src/wikiSync/mesSourceDiscovery.ts'],
  ['publisher/src/sync/profileHeaders.ts', 'src/sbc/profileHeaders.ts'],
];

const directCopies = [
  ['publisher/src/tagDescriptionGenerator.ts', 'src/wikiSync/tagDescriptionGenerator.ts'],
  ['publisher/src/profileBlurbGenerator.ts', 'src/wikiSync/profileBlurbGenerator.ts'],
  ['publisher/TagDescriptions.json', 'wiki/TagDescriptions.json'],
];

const importFixes = [
  ["from './sync/tagMetaParser'", "from './tagMetaParser'"],
  ["from './sync/typeHints'", "from './typeHints'"],
  ["from '../sbc/profileHeaders'", "from '../sbc/profileHeaders'"],
  ["from './types'", "from './tagMetaParser'"],
];

if (!(await pathExists(webWikiSyncRoot))) {
  console.warn(`MES-WebWiki-Sync not found at ${webWikiSyncRoot}`);
  console.warn('Skipping vendor-sync — using bundled modules.');
  process.exit(0);
}

for (const [fromRel, toRel] of syncCopies) {
  await copyWithFixes(path.join(webWikiSyncRoot, fromRel), path.join(extensionRoot, toRel));
  console.log(`  copied ${fromRel} -> ${toRel}`);
}

for (const [fromRel, toRel] of directCopies) {
  let text = await fs.readFile(path.join(webWikiSyncRoot, fromRel), 'utf8');
  for (const [from, to] of importFixes) {
    text = text.replaceAll(from, to);
  }
  await fs.mkdir(path.dirname(path.join(extensionRoot, toRel)), { recursive: true });
  await fs.writeFile(path.join(extensionRoot, toRel), text, 'utf8');
  console.log(`  copied ${fromRel} -> ${toRel}`);
}

// constants.ts PAGE_MAP + NEW_PROFILE_PAGES stay in sync with WebWiki vendored constants
const vendoredConstants = await fs.readFile(
  path.join(webWikiSyncRoot, 'publisher/src/sync/constants.ts'),
  'utf8'
);
const extensionConstantsPath = path.join(extensionRoot, 'src/wikiSync/constants.ts');
let extensionConstants = await fs.readFile(extensionConstantsPath, 'utf8');

const pageMapMatch = vendoredConstants.match(
  /export const PAGE_MAP[\s\S]*?^};\s*$/m
);
const newPagesMatch = vendoredConstants.match(
  /export const NEW_PROFILE_PAGES[\s\S]*?^];\s*$/m
);

if (pageMapMatch && newPagesMatch) {
  extensionConstants = extensionConstants.replace(
    /export const PAGE_MAP[\s\S]*?^};\s*$/m,
    pageMapMatch[0]
  );
  extensionConstants = extensionConstants.replace(
    /export const NEW_PROFILE_PAGES[\s\S]*?^];\s*$/m,
    newPagesMatch[0]
  );
  await fs.writeFile(extensionConstantsPath, extensionConstants, 'utf8');
  console.log('  merged PAGE_MAP + NEW_PROFILE_PAGES into src/wikiSync/constants.ts');
}

console.log('Vendor sync complete.');

async function copyWithFixes(from, to) {
  let text = await fs.readFile(from, 'utf8');
  for (const [fromImport, toImport] of importFixes) {
    text = text.replaceAll(fromImport, toImport);
  }
  await fs.mkdir(path.dirname(to), { recursive: true });
  await fs.writeFile(to, text, 'utf8');
}

async function pathExists(target) {
  try {
    await fs.access(target);
    return true;
  } catch {
    return false;
  }
}
