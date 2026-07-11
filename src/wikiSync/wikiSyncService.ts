import * as fs from 'fs/promises';
import * as path from 'path';
import * as vscode from 'vscode';
import { acquireMesSource, AcquireMesSourceOptions } from './mesGithubSource';
import { fetchWebWikiDocs } from './webWikiFetch';
import { buildWikiFromMarkdown } from './mdWikiBuilder';
import { buildProfileTagIndex, saveProfileTagIndex } from './profileTagIndexBuilder';
import { refreshDiscoveredHeaders } from './refreshDiscoveredHeaders';

export interface WikiSyncResult {
  updated: string[];
  errors: string[];
  sourceLabel: string;
}

export interface WikiSyncOptions {
  acquireSource?: AcquireMesSourceOptions;
}

export class WikiSyncService {
  constructor(private readonly extensionUri: vscode.Uri) {}

  async syncFromMesSource(
    progress?: vscode.Progress<{ message?: string; increment?: number }>,
    token?: vscode.CancellationToken,
    options?: WikiSyncOptions
  ): Promise<WikiSyncResult> {
    const updated: string[] = [];
    const errors: string[] = [];
    let sourceLabel = 'MES-WebWiki';

    const wikiDir = path.join(this.extensionUri.fsPath, 'wiki');
    const baseCssPath = path.join(wikiDir, 'mes-wiki.css');

    try {
      progress?.report({ message: 'Downloading wiki from MES-WebWiki...', increment: 10 });
      if (token?.isCancellationRequested) {
        return { updated, errors, sourceLabel };
      }

      const fetched = await fetchWebWikiDocs(this.extensionUri.fsPath, (message) =>
        progress?.report({ message })
      );
      sourceLabel = fetched.label;
      updated.push(`MES-WebWiki docs (${fetched.filesDownloaded} files)`);

      progress?.report({ message: 'Building HTML pages from markdown...', increment: 40 });
      const built = await buildWikiFromMarkdown({
        docsDir: fetched.docsDir,
        mkdocsPath: fetched.mkdocsPath,
        outputDir: wikiDir,
        styleCssPath: baseCssPath,
      });

      updated.push(`HTML wiki (${built.pagesBuilt} pages built from markdown)`);
    } catch (error) {
      errors.push(`WebWiki sync: ${formatError(error)}`);
    }

    try {
      progress?.report({ message: 'Updating validator tag index from MES source...', increment: 30 });
      if (token?.isCancellationRequested) {
        return { updated, errors, sourceLabel };
      }

      const acquired = await acquireMesSource(progress, token, options?.acquireSource);
      try {
        const tagIndex = await buildProfileTagIndex(
          acquired.sourcePath,
          wikiDir,
          acquired.label
        );
        const tagIndexChanged = await saveProfileTagIndex(wikiDir, tagIndex);
        if (tagIndexChanged) {
          updated.push(
            `profile-tag-index.json (${Object.keys(tagIndex.tagToHeaders).length} tags)`
          );
        }
      } catch (error) {
        errors.push(`profile-tag-index.json: ${formatError(error)}`);
      } finally {
        await acquired.cleanup();
      }
    } catch (error) {
      errors.push(`MES validator sync: ${formatError(error)}`);
    }

    try {
      await refreshDiscoveredHeaders(this.extensionUri);
      updated.push('Validator profile headers refreshed');
    } catch (error) {
      errors.push(`Profile headers: ${formatError(error)}`);
    }

    progress?.report({ message: 'Wiki sync complete', increment: 20 });
    return { updated, errors, sourceLabel };
  }
}

function formatError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
