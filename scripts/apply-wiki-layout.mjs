import * as fs from 'fs/promises';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { loadDiscoveredProfilesFile } from '../out/wikiSync/discoveredProfiles.js';
import { updateSidebars } from '../out/wikiSync/wikiHtml.js';
import { localizeExternalWikiPages } from '../out/wikiSync/externalPageLocalization.js';
import {
  injectUpdatesBlock,
} from '../out/wikiSync/wikiUpdates.js';
import { contentEquals } from '../out/wikiSync/wikiHtml.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const wikiDir = path.join(repoRoot, 'wiki');

const profiles = (await loadDiscoveredProfilesFile(wikiDir)).profiles;
const files = (await fs.readdir(wikiDir)).filter((file) => file.endsWith('.html'));

let sidebarCount = 0;
for (const file of files) {
  const filePath = path.join(wikiDir, file);
  const original = await fs.readFile(filePath, 'utf8');
  const { content, changed } = updateSidebars(original, profiles);
  if (changed && !contentEquals(original, content)) {
    await fs.writeFile(filePath, content, 'utf8');
    sidebarCount++;
  }
}

const localization = await localizeExternalWikiPages(wikiDir);

const homePath = path.join(wikiDir, 'Home.html');
const homeContent = await fs.readFile(homePath, 'utf8');
const history = await loadWikiUpdatesHistory(wikiDir);
const nextHome = injectUpdatesBlock(homeContent, history);
let homeChanged = false;
if (!contentEquals(homeContent, nextHome)) {
  await fs.writeFile(homePath, nextHome, 'utf8');
  homeChanged = true;
}

console.log(`Applied structured sidebars to ${sidebarCount} pages (${profiles.length} profiles).`);
console.log(`Localized external links in ${localization.pagesPatched.length} pages.`);
console.log(homeChanged ? 'Home.html updated with What\'s new embed.' : 'Home.html already had What\'s new embed.');

async function loadWikiUpdatesHistory(dir) {
  const historyPath = path.join(dir, 'mes-wiki-updates.json');
  try {
    const raw = await fs.readFile(historyPath, 'utf8');
    return JSON.parse(raw);
  } catch {
    return {
      version: 2,
      runs: [
        {
          date: '2026-07-11',
          source: 'MES master branch',
          highlights: [
            {
              text: 'Block Replacement — 3 new tags documented.',
              htmlFile: 'Block-Replacement.html',
            },
          ],
        },
      ],
      lastSynced: {
        date: '2026-07-11',
        source: 'MES master branch',
      },
    };
  }
}
