---
name: deploy
description: Deploy mohamedsahnoun.com to Cloudflare Workers. Use when asked to deploy, ship, release or push the site live, when a Cloudflare build fails, or after changing dependencies (package.json or package-lock.json), because the lockfile must be regenerated with the exact npm version the build image runs.
---

# Deploying mohamedsahnoun.com

## How this site ships

Static assets only. No Worker script. `wrangler.jsonc` points `assets.directory` at `./dist`, so Cloudflare serves the Astro build output directly and uses `dist/404.html` for `not_found_handling`.

Two routes to production:

1. **Cloudflare Workers Builds** (normal path). Connected to `github.com/MedNoun/mohamedsahnoun.dev`. A push to `main` triggers a build in Cloudflare's image, which runs `npm clean-install` then the build command then deploys.
2. **Manual** (`npx wrangler deploy` from a local machine). Only for when the dashboard build is broken and the site needs to be live now. It skips the CI install path entirely, so it can mask a lockfile problem that still blocks every future automatic build.

The build image is pinned by `.node-version` (`22.12.0`) and ships `npm@10.9.2`. That npm version is the single most important fact in this file.

## The lockfile trap

Read this before touching `package.json` or `package-lock.json`.

Local development runs a newer npm (11.x on Node 24) than the build image (npm 10.9.2 on Node 22.12). The two versions disagree about optional peer dependencies of wasm packages (`@emnapi/core`, `@emnapi/runtime`, pulled in through `sharp` and `@astrojs/compiler-binding-wasm32-wasi`). npm 11 prunes them from the lockfile. npm 10 requires them as top level entries. A lockfile written by npm 11 therefore fails `npm ci` in Cloudflare with:

```
npm error `npm ci` can only install packages when your package.json and package-lock.json
npm error or npm-shrinkwrap.json are in sync.
npm error Missing: @emnapi/runtime@1.11.3 from lock file
npm error Missing: @emnapi/core@1.11.3 from lock file
```

The local `npm install` that produced it succeeded, and so does the local build. Nothing warns you. This has broken the build more than once (`ef9a82f`, `c6b8453`).

### Regenerating the lockfile correctly

Always generate in a clean temporary directory containing only `package.json`. Running `npm install --package-lock-only` inside the project reuses the existing `node_modules` tree and silently drops the platform variants for every OS other than yours, which produces a lockfile that fails on Cloudflare in a different way (a correct lockfile here has around 610 `node_modules/` entries, the pruned one has around 480).

```bash
S="$(mktemp -d)"
cp package.json "$S/"
(cd "$S" && npx -y npm@10.9.2 install --package-lock-only --no-audit --no-fund)
cp "$S/package-lock.json" package-lock.json
```

Then verify against both npm versions before committing:

```bash
V="$(mktemp -d)" && cp package.json package-lock.json "$V/"
(cd "$V" && npx -y npm@10.9.2 ci --dry-run --no-audit --no-fund | tail -3)  # must not error
(cd "$V" && npm ci --dry-run --no-audit --no-fund | tail -3)                # must not error
```

The npm 10 run reports more packages than the npm 11 run (roughly 611 against 497). That difference is expected: npm 11 filters optional dependencies that do not match the host platform. What matters is that neither run errors.

npm 10 pins `@emnapi/core` and `@emnapi/runtime` to whatever the `latest` dist tag is, ignoring the declared `^1.7.1` range, so a prerelease version can appear there. Both packages are marked `optional: true, peer: true` and are never installed on the linux x64 glibc build image, so this is cosmetic. Do not hand edit the lockfile to "fix" it.

## Deploy sequence

1. Working tree clean, on `main`, rebased on `origin/main`.
2. If `package.json` or `package-lock.json` changed in this batch of work, run the regenerate and verify steps above.
3. Full local rehearsal of what CI does:

   ```bash
   rm -rf node_modules
   npm ci --no-audit --no-fund
   npm run build
   ```

   Expect three pages (`/`, `/plain/`, `/404.html`), `sitemap-index.xml`, and the optimised images.
4. Check the no JavaScript guarantee still holds, because it is the project's acceptance test and a broken island does not fail the build:

   ```bash
   grep -c '<article' dist/index.html      # 7: three roles plus four projects
   grep -c 'Mohamed Sahnoun' dist/index.html
   ```

   If case studies are missing from the static HTML, stop. The build is wrong, not the deploy.
5. Commit and push to `main`. Cloudflare picks it up. Do not push without being asked.
6. Confirm the deployment finished before reporting success. Ask the user for the Cloudflare build log, or check `https://mohamedsahnoun.com` and its `/plain/` route.

## Manual deploy

Only when the automatic build is blocked and the user has explicitly asked to ship now.

```bash
npm run build
npx wrangler deploy
```

Requires an authenticated wrangler session. If it is not authenticated, ask the user to run `! npx wrangler login` rather than attempting an interactive login yourself. Say plainly afterwards that the dashboard build is still broken and needs the real fix.

## Failure signatures

| Log line | Cause | Fix |
| --- | --- | --- |
| `npm error EUSAGE ... Missing: @emnapi/... from lock file` | Lockfile written by npm 11 | Regenerate with npm 10.9.2 in a clean temp directory |
| `npm error notarget No matching version found` for an `@img/sharp-*` or `*-linux-x64-gnu` package | Lockfile regenerated in place, platform variants pruned | Same fix, clean temp directory is the point |
| `Unsupported engine` or a Node version mismatch | `.node-version` drifted from `package.json` `engines` | Keep both at 22.12.0 and `>=22.12.0` |
| Build succeeds, site 404s on every path | `assets.directory` no longer matches Astro's `outDir` | Both must resolve to `./dist` |
| Build succeeds, page blank without JavaScript | Content moved into the Preact island | Architecture violation, fix the build, not the deploy |

## Facts

- Repository: `git@github.com:MedNoun/mohamedsahnoun.dev.git`, deploys from `main`.
- Build image: Node 22.12.0, npm 10.9.2. Install command `npm clean-install`.
- `wrangler` and `sharp` are devDependencies and are installed by the CI install, so they cannot be dropped to slim the build.
- `dist/` and `.astro/` are gitignored. Never commit build output.
- `content-source/` is gitignored and names the client. It must never reach a public build artefact.
