import * as fs from 'fs/promises';
import * as path from 'path';
import { contentEquals } from './wikiHtml';
import { localizeHtmlContent } from './localLinkMap';

export interface ExternalPageLocalizationResult {
  pagesPatched: string[];
}

export async function localizeExternalWikiPages(wikiDir: string): Promise<ExternalPageLocalizationResult> {
  const entries = await fs.readdir(wikiDir);
  const wikiFiles = entries.filter((file) => file.endsWith('.html'));
  const pagesPatched: string[] = [];

  for (const file of wikiFiles) {
    const filePath = path.join(wikiDir, file);
    const original = await fs.readFile(filePath, 'utf8');
    const next = localizeHtmlContent(original, wikiFiles);

    if (!contentEquals(original, next)) {
      await fs.writeFile(filePath, next, 'utf8');
      pagesPatched.push(file);
    }
  }

  return { pagesPatched };
}
