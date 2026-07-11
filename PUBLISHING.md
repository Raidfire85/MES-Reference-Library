# Publishing MES Reference Library to the VS Code Marketplace

This guide covers publishing `Raidfire.mes-reference-library` to the [Visual Studio Marketplace](https://marketplace.visualstudio.com/). The same listing is used by VS Code, Cursor, and other compatible editors.

## Prerequisites

1. **Microsoft account** — the same one you use for Azure DevOps / Visual Studio
2. **Publisher ID** — use `Raidfire` in `package.json`
3. **Node.js** — to build and publish
4. **Repository** — public GitHub repo (already configured)

## One-time setup

### 1. Create a publisher (if you have not already)

1. Go to [Marketplace Publisher Management](https://marketplace.visualstudio.com/manage)
2. Sign in with your Microsoft account
3. Click **Create publisher**
4. Set **Publisher ID** to `Raidfire` (must match `package.json` → `"publisher"`)
5. Fill in display name and contact details

### 2. Create a Personal Access Token (PAT)

1. Go to [Azure DevOps](https://dev.azure.com/) → **User settings** (top right) → **Personal access tokens**
2. Click **+ New Token**
3. Name: e.g. `vsce-marketplace-publish`
4. Organization: **All accessible organizations**
5. Expiration: choose a sensible date (or custom)
6. Scopes: **Custom defined** → check **Marketplace** → **Manage**
7. Click **Create** and **copy the token** — you will not see it again

Store the token somewhere safe (password manager). Do not commit it to git.

### 3. Log in with vsce

From the repo root:

```powershell
cd "C:\Users\Raidfire\source\repos\VS MES Reference Library"
npx vsce login Raidfire
```

Paste your PAT when prompted.

Alternatively, set the token as an environment variable (useful for CI):

```powershell
$env:VSCE_PAT = "your-pat-here"
```

## Before each publish

### 1. Bump the version

Edit `package.json` → `"version"` following [semver](https://semver.org/):

- `3.18.4` → `3.18.5` for bug fixes
- `3.18.4` → `3.19.0` for new features
- `3.18.4` → `4.0.0` for breaking changes

Update the **Current release** line in `readme.md` to match.

### 2. Build and test locally

```powershell
npm install
npm run compile
npm run build-vsix
npm run install-extension -- -Force
```

Reload the editor window and verify:

- Wiki opens and pages look correct
- **⟳ Sync** works when online
- SBC validation runs on a test `.sbc` file

### 3. Dry-run the package (optional)

```powershell
npx vsce package
```

Inspect the generated `.vsix` size and contents. The wiki and `node_modules` make the package ~1–2 MB — that is normal.

## Publish

### First publish

```powershell
npm run publish:marketplace
```

Or manually:

```powershell
npm run build-vsix
npx vsce publish
```

`vsce publish` runs `vscode:prepublish` (which runs `npm run compile`) before uploading.

### Subsequent updates

Same command — bump version first, then:

```powershell
npm run publish:marketplace
```

The Marketplace will show the new version within a few minutes.

## After publishing

1. Open your extension page on the Marketplace and verify description, icon, and version
2. Create a [GitHub Release](https://github.com/Raidfire85/MES-Reference-Library/releases) with the same version tag and attach the `.vsix`
3. Share the Marketplace link with the Space Engineers modding community

## Marketplace listing tips

The Marketplace uses these fields automatically:

| Field | Source |
|-------|--------|
| **Name** | `package.json` → `displayName` |
| **Short description** | `package.json` → `description` |
| **Long description** | `readme.md` |
| **Icon** | `media/icon.png` (128×128 PNG) |
| **Categories** | `package.json` → `categories` |
| **License** | `package.json` → `license` |
| **Repository** | `package.json` → `repository.url` |

### Recommended first-release checklist

- [ ] `readme.md` is up to date (wiki sync, offline use, limitations)
- [ ] `package.json` version matches readme
- [ ] Icon looks good at small size in the Extensions view
- [ ] Tested install from VSIX on a clean profile
- [ ] PAT is valid and not expired
- [ ] Publisher ID `Raidfire` exists on marketplace.visualstudio.com

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `ERROR You must be logged in` | Run `npx vsce login Raidfire` or set `VSCE_PAT` |
| `ERROR Extension version is not semver` | Fix `package.json` version format |
| `ERROR A extension with this ID already exists` | You need to publish under the same publisher that owns `Raidfire.mes-reference-library` |
| `403 Forbidden` | PAT missing **Marketplace → Manage** scope, or wrong publisher |
| Package too large | Normal for bundled wiki; avoid adding unnecessary files to `.vscodeignore` exclusions |

## Unpublishing / deprecation

To hide an bad release, use [Marketplace Manage](https://marketplace.visualstudio.com/manage) → your extension → **⋯** → unpublish a specific version. Prefer publishing a fix version instead of unpublishing when possible.

## CI publishing (optional, later)

You can automate publish with a GitHub Actions workflow using `VSCE_PAT` as a repository secret. Keep the PAT scoped to **Marketplace Manage** only and rotate it periodically.
