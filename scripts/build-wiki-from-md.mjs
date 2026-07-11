import * as path from 'path';
import { fileURLToPath } from 'url';
import { loadLocalWebWikiSource } from '../out/wikiSync/webWikiFetch.js';
import { buildWikiFromMarkdown } from '../out/wikiSync/mdWikiBuilder.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const localWebWiki = path.resolve(repoRoot, '..', 'MES-WebWiki');
const wikiDir = path.join(repoRoot, 'wiki');

try {
  const loaded = await loadLocalWebWikiSource(repoRoot, localWebWiki);
  const built = await buildWikiFromMarkdown({
    docsDir: loaded.docsDir,
    mkdocsPath: loaded.mkdocsPath,
    outputDir: wikiDir,
    styleCssPath: path.join(wikiDir, 'mes-wiki.css'),
  });
  console.log(`Built ${built.pagesBuilt} wiki pages from local MES-WebWiki markdown.`);
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.warn(`Skipping MD wiki build: ${message}`);
  console.warn('Bundled wiki/*.html will be used as-is.');
}
