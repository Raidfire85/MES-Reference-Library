import * as fs from 'fs/promises';
import * as path from 'path';
import { WEBWIKI_RAW_BASE, WEBWIKI_TREE_API } from './webWikiConstants';

const DOWNLOAD_CONCURRENCY = 12;

interface GitHubTreeResponse {
  tree: Array<{ path: string; type: 'blob' | 'tree' }>;
  truncated?: boolean;
}

export interface WebWikiFetchResult {
  docsDir: string;
  mkdocsPath: string;
  filesDownloaded: number;
  label: string;
}

export async function fetchWebWikiDocs(
  targetRoot: string,
  progress?: (message: string) => void
): Promise<WebWikiFetchResult> {
  const docsDir = path.join(targetRoot, 'wiki-src', 'docs');
  const mkdocsPath = path.join(targetRoot, 'wiki-src', 'mkdocs.yml');

  progress?.('Fetching MES-WebWiki file list from GitHub...');
  const response = await fetch(WEBWIKI_TREE_API, {
    headers: { 'User-Agent': 'mes-reference-library', Accept: 'application/vnd.github+json' },
  });

  if (!response.ok) {
    throw new Error(`GitHub tree API failed (${response.status}) for MES-WebWiki.`);
  }

  const tree = (await response.json()) as GitHubTreeResponse;
  if (tree.truncated) {
    throw new Error('MES-WebWiki tree response was truncated; cannot download all docs.');
  }

  const docPaths = tree.tree
    .filter((entry) => entry.type === 'blob')
    .map((entry) => entry.path)
    .filter(
      (entryPath) =>
        entryPath.startsWith('docs/') &&
        !entryPath.endsWith('/') &&
        entryPath !== 'docs/_Sidebar.md'
    );

  const hasMkdocs = tree.tree.some((entry) => entry.path === 'mkdocs.yml');
  if (!hasMkdocs) {
    throw new Error('mkdocs.yml not found in MES-WebWiki repository.');
  }

  await fs.mkdir(docsDir, { recursive: true });

  let completed = 0;
  const total = docPaths.length + 1;

  await downloadRawFile('mkdocs.yml', mkdocsPath);
  completed++;
  progress?.(`Downloaded mkdocs.yml (${completed}/${total})`);

  for (let i = 0; i < docPaths.length; i += DOWNLOAD_CONCURRENCY) {
    const batch = docPaths.slice(i, i + DOWNLOAD_CONCURRENCY);
    await Promise.all(
      batch.map(async (entryPath) => {
        const relative = entryPath.slice('docs/'.length);
        const dest = path.join(docsDir, relative);
        await fs.mkdir(path.dirname(dest), { recursive: true });
        await downloadRawFile(entryPath, dest);
        completed++;
        if (completed % 10 === 0 || completed === total) {
          progress?.(`Downloaded ${completed}/${total} WebWiki files`);
        }
      })
    );
  }

  return {
    docsDir,
    mkdocsPath,
    filesDownloaded: docPaths.length + 1,
    label: 'MES-WebWiki (main)',
  };
}

export async function loadLocalWebWikiSource(
  targetRoot: string,
  localRepoRoot: string
): Promise<WebWikiFetchResult> {
  const docsDir = path.join(targetRoot, 'wiki-src', 'docs');
  const mkdocsPath = path.join(targetRoot, 'wiki-src', 'mkdocs.yml');
  const sourceDocs = path.join(localRepoRoot, 'docs');
  const sourceMkdocs = path.join(localRepoRoot, 'mkdocs.yml');

  await fs.mkdir(path.join(targetRoot, 'wiki-src'), { recursive: true });
  await copyTree(sourceDocs, docsDir);
  await fs.copyFile(sourceMkdocs, mkdocsPath);

  const files = await countFiles(docsDir);
  return {
    docsDir,
    mkdocsPath,
    filesDownloaded: files,
    label: 'local MES-WebWiki',
  };
}

async function downloadRawFile(repoPath: string, destPath: string): Promise<void> {
  const url = `${WEBWIKI_RAW_BASE}/${encodeURI(repoPath)}`;
  const response = await fetch(url, { headers: { 'User-Agent': 'mes-reference-library' } });
  if (!response.ok) {
    throw new Error(`Failed to download ${repoPath} (${response.status}).`);
  }
  const text = await response.text();
  await fs.writeFile(destPath, text, 'utf8');
}

async function copyTree(from: string, to: string): Promise<void> {
  await fs.mkdir(to, { recursive: true });
  const entries = await fs.readdir(from, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === '_Sidebar.md') {
      continue;
    }
    const src = path.join(from, entry.name);
    const dest = path.join(to, entry.name);
    if (entry.isDirectory()) {
      await copyTree(src, dest);
    } else {
      await fs.copyFile(src, dest);
    }
  }
}

async function countFiles(dir: string): Promise<number> {
  let count = 0;
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      count += await countFiles(full);
    } else {
      count++;
    }
  }
  return count;
}
