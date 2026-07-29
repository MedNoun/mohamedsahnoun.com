/*
 * Screenshot the built site with a real browser, because the previous method
 * could not work. Rendering an SVG through sharp with the design tokens
 * substituted by hand cannot catch a token that fails to resolve, a font that
 * falls back, or anything at all about the figcaption: the harness supplies
 * those itself. Two defects sat in plain sight until real Chrome drew the page.
 *
 * Chrome comes from the Windows side through WSL interop. The Linux chromium in
 * ~/.cache/ms-playwright is missing libnspr4, libnss3, libnssutil3 and
 * libasound2, and installing them needs root. Windows Chrome needs nothing, and
 * as a bonus it renders with the fonts the visitor actually has rather than
 * whatever this container happens to ship.
 *
 * Usage, from the repo root, after npm run build:
 *   node scripts/shoot.mjs pages      real built pages at three widths
 *   node scripts/shoot.mjs diagrams   every diagram, in the site's own containers
 *   node scripts/shoot.mjs console    the hydrated console, needs the dev server
 *
 * PNGs land in .shots/ (gitignored).
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync, writeFileSync, mkdirSync, copyFileSync } from 'node:fs';

const CHROME = '/mnt/c/Program Files/Google/Chrome/Application/chrome.exe';
const WIN_USER = readdirSync('/mnt/c/Users').find(
  (d) => !/^(default|public|all users|defaultuser0|desktop\.ini)/i.test(d) && d !== 'CodexSandboxOffline',
);
const WIN_TMP = `/mnt/c/Users/${WIN_USER}/AppData/Local/Temp`;
const WIN_TMP_DOS = `C:\\Users\\${WIN_USER}\\AppData\\Local\\Temp`;
const SHOTS = '.shots';

mkdirSync(SHOTS, { recursive: true });

/**
 * One capture. `--virtual-time-budget` is not optional: without it the shot
 * catches the pre-hydration fallback shell instead of the console.
 */
function shoot(name, url, width, height, scale = 2) {
  const out = `${name}-${width}.png`;
  execFileSync(
    CHROME,
    [
      '--headless',
      '--disable-gpu',
      '--hide-scrollbars',
      `--force-device-scale-factor=${scale}`,
      `--window-size=${width},${height}`,
      '--virtual-time-budget=4000',
      `--screenshot=${WIN_TMP_DOS}\\${out}`,
      url,
    ],
    { cwd: '/mnt/c', stdio: 'pipe' },
  );
  copyFileSync(`${WIN_TMP}/${out}`, `${SHOTS}/${out}`);
  console.log(`${SHOTS}/${out}`);
}

/*
 * Astro inlines small stylesheets into the page and emits only the larger ones as
 * files, so a harness that takes just dist/_astro/*.css loses :root and every
 * var() falls back. Both sources, always.
 */
function allCss(html) {
  return [
    ...readdirSync('dist/_astro')
      .filter((f) => f.endsWith('.css'))
      .map((f) => readFileSync(`dist/_astro/${f}`, 'utf8')),
    ...(html.match(/<style>([\s\S]*?)<\/style>/g) ?? []).map((s) => s.replace(/<\/?style>/g, '')),
  ].join('\n');
}

const mode = process.argv[2] ?? 'pages';

if (mode === 'diagrams') {
  const html = readFileSync('dist/index.html', 'utf8');
  const figures = (html.match(/<figure class="diagram"[\s\S]*?<\/figure>/g) ?? []).map((f) =>
    f.replace(/ data-astro-cid-[a-z0-9]+(="[^"]*")?/g, ''),
  );

  /*
   * The site's own containers, not invented ones. An earlier harness gave .prose
   * a max-width without the surrounding .wrap and overflowed at 375px, which
   * looked exactly like a diagram bug and was not one.
   */
  writeFileSync(
    `${WIN_TMP}/diagrams.html`,
    `<!doctype html><meta charset="utf-8"><title>diagrams</title>
<style>${allCss(html)}</style>
<style>body{margin:0}.shot-label{font:600 .8125rem var(--mono);color:var(--accent);
text-transform:uppercase;letter-spacing:.08em;margin:40px 0 8px}</style>
<main class="wrap" id="content">
${figures
  .map((f) => {
    const id = f.match(/aria-labelledby="([a-z]+)-title/)?.[1] ?? 'unknown';
    return `<p class="shot-label">${id}</p><div class="prose">${f}</div>`;
  })
  .join('\n')}
</main>`,
  );

  for (const w of [1440, 768, 375]) {
    shoot('diagrams', `file:///${WIN_TMP_DOS.replace(/\\/g, '/')}/diagrams.html`, w, 2400);
  }
} else if (mode === 'ghost') {
  /*
   * The suggestion overlay in the states a screenshot cannot type its way into.
   * Chrome's --screenshot cannot drive input and CDP is not reachable from WSL
   * (the Windows firewall blocks the debugging port), so the markup below is the
   * production markup from Console.tsx with the values written in by hand. What
   * this checks is the only thing that can really be wrong: whether the ghost's
   * tail lands exactly where the caret is. The logic is covered separately by
   * scripts/completion.test.mjs.
   */
  const html = readFileSync('dist/index.html', 'utf8');
  const states = [
    ['typed prefix, tail suggested', 'SELECT * FROM proj', 'ects'],
    ['short token', 'who', 'ami'],
    ['hyphenated id', 'DESCRIBE edge', 'db-dto'],
    ['nothing to suggest', 'SELECT * FROM projects;', ''],
    ['empty, placeholder showing', '', ''],
  ];

  writeFileSync(
    `${WIN_TMP}/ghost.html`,
    `<!doctype html><meta charset="utf-8"><title>ghost</title>
<style>${allCss(html)}</style>
<style>body{margin:0;padding:24px}.shot-label{font:600 .8125rem var(--mono);color:var(--accent);
text-transform:uppercase;letter-spacing:.08em;margin:28px 0 6px}</style>
${states
  .map(
    ([label, value, tail]) => `<p class="shot-label">${label}</p>
<div class="console"><div class="console-body"><div class="console-prompt">
  <span class="console-caret" aria-hidden="true">&gt;</span>
  <span class="console-field">
    <input class="console-input" value="${value}" placeholder="SELECT * FROM experience;">
    ${tail ? `<span class="console-ghost" aria-hidden="true"><i>${value}</i>${tail}<em>tab</em></span>` : ''}
  </span>
  <button type="button" class="console-run">Run</button>
</div></div></div>`,
  )
  .join('\n')}`,
  );

  for (const w of [1440, 375]) {
    shoot('ghost', `file:///${WIN_TMP_DOS.replace(/\\/g, '/')}/ghost.html`, w, 700);
  }
} else if (mode === 'console') {
  for (const w of [1440, 375]) shoot('console', 'http://localhost:4321/', w, 1100);
} else {
  // The real thing. /plain/ needs no JavaScript, so it is the honest full-content shot.
  for (const w of [1440, 768, 375]) shoot('home', 'http://localhost:4321/', w, 1400);
  shoot('plain', 'http://localhost:4321/plain/', 1440, 2600);
}
