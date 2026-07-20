# Camp Codex Editorial Edition Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fork camp-codex-skill-tree into a new repo and restyle it end-to-end in the joshwexler.com editorial design language (cream, serif + sans, one forest-green accent, editorial page framing), deployed as its own site.

**Architecture:** Single zero-dependency `index.html` (inline CSS/JS, runtime-built SVG tree) copied from the original repo, with the design layer replaced: embedded fonts (Fraunces replaces Chakra Petch/Rajdhani), a light-only palette, flat de-glowed tree components, sticky-nav + hero + static-logo-strip framing, and editorial mobile list rows. `scripts/verify.mjs` (Playwright) is the test suite; each restyle task edits its assertions first (TDD), then the page.

**Tech Stack:** Vanilla HTML/CSS/JS, SVG, Playwright (dev-only), gh + vercel CLIs for deploy.

**Spec:** `docs/superpowers/specs/2026-07-19-editorial-redesign-design.md`

## Global Constraints

- New repo root: `C:\Users\smith\camp-codex-editorial` (git already initialized, spec committed). Source fork: `C:\Users\smith\camp-codex-skill-tree` at commit `5285f1b` — **never modify the original repo**.
- `index.html` stays a single zero-dependency file; fonts embedded as base64 woff2; no libraries, no CDN links.
- Light theme only. Exact palette: bg `#F5F4F1`, tint `#E8EBE7`, ink `#1A1A1A`, body/muted `#4A4A4A`, accent `#3F5148`, accent-ink `#F5F4F1`, hairline `#D8D5CC`, connector fill `#EFEDE8`, creativity `#9C5B4F`, ai-skills `#A98243`, web-design `#5C7A8A`. Branch hues tunable only within the desaturated register and only if a contrast/visual check fails.
- Content verbatim: 21 module names/descriptions, topology, Josh's name/bio/links (`https://joshwexler.com/coaching/`), tool logo list. Inline `SKILL_TREE_DATA` must match `src/data/skillTree.json` (suite section 1 enforces).
- No glow anywhere: no `drop-shadow` filters, no `.edge-halo`, no `box-shadow` on nodes (tooltip card shadow is allowed).
- `npm run verify` must be green at the end of every task (~60s, prints JSON; pass = `"pass": true`). Run it in the foreground with a 300000ms timeout.
- Windows/PowerShell. WARNING: `index.html` contains giant base64 font lines — read in narrow ranges or use Grep; never read the whole file.
- Hero copy, exact: h1 `The Camp Codex curriculum, mapped.` / intro `The complete Camp Codex builder curriculum — creativity, AI skills, and web & app design — drawn as one connected tree.` / caption `Three branches. 21 modules. Hover any node.`

## File Structure

- `index.html` — the entire site (copied, then restyled in Tasks 2–6)
- `src/data/skillTree.json`, `src/data/toolLogos.json` — canonical data (copied verbatim, never edited)
- `scripts/verify.mjs` — Playwright suite (copied, assertions adapted per task)
- `scripts/fetch-fonts.mjs` — one-shot Fraunces embed generator (created in Task 2, kept as documentation)
- `package.json`, `.gitignore`, `.vercelignore` — copied; name/description updated
- `README.md` — written in Task 7

---

### Task 1: Fork the original site

**Files:**
- Create (by copy): `index.html`, `src/data/skillTree.json`, `src/data/toolLogos.json`, `scripts/verify.mjs`, `package.json`, `.gitignore`, `.vercelignore`

**Interfaces:**
- Consumes: the original repo's files at `C:\Users\smith\camp-codex-skill-tree` (commit 5285f1b).
- Produces: a working copy of the original site in this repo whose suite passes unchanged; all later tasks edit these files in place.

- [ ] **Step 1: Copy the files**

```powershell
New-Item -ItemType Directory -Force C:\Users\smith\camp-codex-editorial\src\data | Out-Null
New-Item -ItemType Directory -Force C:\Users\smith\camp-codex-editorial\scripts | Out-Null
Copy-Item C:\Users\smith\camp-codex-skill-tree\index.html C:\Users\smith\camp-codex-editorial\
Copy-Item C:\Users\smith\camp-codex-skill-tree\src\data\skillTree.json,C:\Users\smith\camp-codex-skill-tree\src\data\toolLogos.json C:\Users\smith\camp-codex-editorial\src\data\
Copy-Item C:\Users\smith\camp-codex-skill-tree\scripts\verify.mjs C:\Users\smith\camp-codex-editorial\scripts\
Copy-Item C:\Users\smith\camp-codex-skill-tree\package.json,C:\Users\smith\camp-codex-skill-tree\.gitignore,C:\Users\smith\camp-codex-skill-tree\.vercelignore C:\Users\smith\camp-codex-editorial\
```

- [ ] **Step 2: Update package.json identity**

Change only these two fields (leave scripts/devDependencies as copied):

```json
  "name": "camp-codex-editorial",
  "description": "Editorial-styled edition of the Camp Codex skill tree. The site itself (index.html) has zero dependencies.",
```

- [ ] **Step 3: Install and run the suite**

```powershell
npm install
npm run verify
```

Expected: `"pass": true`, zero failures (this is the unmodified original site). If Chromium is missing: `npx playwright install chromium` once, then re-run.

- [ ] **Step 4: Commit**

```powershell
git add -A
git commit -m "chore: fork camp-codex-skill-tree (5285f1b) as starting point"
```

---

### Task 2: Embed Fraunces, drop the game fonts

**Files:**
- Create: `scripts/fetch-fonts.mjs`
- Modify: `index.html` (@font-face blocks + `--font-display`), `scripts/verify.mjs` (section 3)

**Interfaces:**
- Consumes: copied `index.html` with base64 `@font-face` blocks for "Chakra Petch", "Rajdhani", "Inter".
- Produces: embedded `Fraunces` (600, 700, italic 600) + existing Inter; `--font-display: "Fraunces", Georgia, serif;`. Later tasks set `font-family: var(--font-display)` on serif elements.

- [ ] **Step 1: Update the font assertion (failing test)**

In `scripts/verify.mjs` section 3, replace:

```js
const fontsOk = await page.evaluate(() => document.fonts.check('700 15px "Chakra Petch"') && document.fonts.check('13px Inter'));
```

with:

```js
const fontsOk = await page.evaluate(() => document.fonts.check('700 15px Fraunces') && document.fonts.check('600 15px Fraunces') && document.fonts.check('13px Inter'));
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm run verify`
Expected: FAIL — `embedded fonts active` (Fraunces not present yet). Everything else PASS.

- [ ] **Step 3: Create scripts/fetch-fonts.mjs**

```js
// One-shot generator: downloads Fraunces (latin subset) from Google Fonts and
// writes self-contained base64 @font-face blocks to fraunces-faces.css for
// pasting into index.html. Re-run only if the embedded fonts need regenerating.
import { writeFileSync } from 'fs';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';
const cssUrl = 'https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,600;0,9..144,700;1,9..144,600&display=swap';
const css = await (await fetch(cssUrl, { headers: { 'User-Agent': UA } })).text();
const faces = [...css.matchAll(/\/\* latin \*\/\s*(@font-face\s*{[^}]+})/g)].map(m => m[1]);
if (faces.length === 0) throw new Error('no latin @font-face blocks found — Google CSS format changed?');
let out = '';
for (const face of faces) {
  const url = face.match(/url\((https:[^)]+\.woff2)\)/)[1];
  const b64 = Buffer.from(await (await fetch(url)).arrayBuffer()).toString('base64');
  out += face.replace(/src:[^;]+;/, `src:url(data:font/woff2;base64,${b64}) format('woff2');`) + '\n';
}
writeFileSync('fraunces-faces.css', out);
console.log(`wrote fraunces-faces.css: ${faces.length} latin faces`);
```

Run: `node scripts/fetch-fonts.mjs`
Expected: `wrote fraunces-faces.css: 3 latin faces` (600, 700, italic 600). If the count differs or the script throws, STOP and report BLOCKED with the fetched CSS's first 30 lines — do not hand-roll a different font pipeline.

- [ ] **Step 4: Swap the embeds in index.html**

`grep -n "font-family:" index.html` inside the `<style>` head region to locate the `@font-face` blocks (giant single lines near the top of the file). Delete every `@font-face` block whose `font-family` is `"Chakra Petch"` or `"Rajdhani"`. Keep all `"Inter"` blocks. Paste the three blocks from `fraunces-faces.css` where the deleted ones were. Delete the scratch file `fraunces-faces.css` afterward.

Then change the display font variable (in `:root`):

```css
  --font-display: "Fraunces", Georgia, serif;
```

(There is exactly one `--font-display` declaration.)

- [ ] **Step 5: Run to verify it passes**

Run: `npm run verify`
Expected: PASS, zero failures. (Display text now renders serif; layout checks are unaffected because `fitLabels()` re-measures after `document.fonts.ready`.)

- [ ] **Step 6: Commit**

```powershell
git add index.html scripts/fetch-fonts.mjs scripts/verify.mjs
git commit -m "feat: embed Fraunces serif, drop Chakra Petch and Rajdhani"
```

---

### Task 3: Light-only editorial palette, no glow, no toggle

**Files:**
- Modify: `index.html` (`:root` blocks, theme toggle markup/CSS/JS, glow rules), `scripts/verify.mjs` (section 7b)

**Interfaces:**
- Consumes: single `--font-display` from Task 2.
- Produces: one `:root` with the palette below; vars renamed `--locked-stroke`→`--hairline`, `--locked-fill`→`--connector-fill`; new vars `--tint`, `--accent`, `--accent-ink`; NO `#theme-toggle`, NO `html[data-theme="light"]` block, NO `drop-shadow`/glow rules. Tasks 4–6 reference `--accent`, `--accent-ink`, `--hairline`, `--connector-fill`, `--ink`, `--ink-muted`.

- [ ] **Step 1: Rewrite verify section 7b (failing tests)**

Replace ALL of section 7b (from `/* ---------- 7b. theme toggle: dark default, light opt-in, persisted ---------- */` through `check('theme key cleared on dark', ...)`) with:

```js
/* ---------- 7b. light-only editorial palette, no glow ---------- */
const bodyBg = () => page.evaluate(() => getComputedStyle(document.body).backgroundColor);
check('cream background', (await bodyBg()) === 'rgb(245, 244, 241)', await bodyBg());
check('no theme toggle', await page.locator('#theme-toggle').count() === 0);
check('no data-theme attribute', (await page.evaluate(() => document.documentElement.dataset.theme || null)) === null);
const glow = await page.evaluate(() => ({
  filters: [...document.querySelectorAll('#tree-svg g.node circle')].filter(c => getComputedStyle(c).filter !== 'none').length,
  themeKey: localStorage.getItem('camp-codex-skill-tree:theme'),
}));
check('no drop-shadow filters on nodes', glow.filters === 0, `${glow.filters} filtered`);
check('no theme key written', glow.themeKey === null);
```

Note: the old 7b defined `bodyBg`/`themeAttr` and took the `light.png` screenshot — all of that goes away with the block; nothing else in the file references them.

- [ ] **Step 2: Run to verify failures**

Run: `npm run verify`
Expected: FAIL — `cream background` (still dark `rgb(11, 14, 20)`), `no theme toggle`. Everything else PASS.

- [ ] **Step 3: Replace the theme blocks with one light `:root`**

In `index.html`, the `<style>` contains a dark `:root { ... }` block followed by an `html[data-theme="light"] { ... }` block (grep `data-theme="light"` to find the second). Replace BOTH blocks with exactly:

```css
:root {
  color-scheme: light;
  /* surfaces */
  --bg: #F5F4F1;
  --tint: #E8EBE7;
  --tooltip-bg: #FFFFFF;
  --tooltip-ink: #1A1A1A;
  --shadow: rgba(26, 26, 26, 0.10);
  /* type */
  --ink: #1A1A1A;
  --ink-muted: #4A4A4A;
  --node-text: #4A4A4A;
  --node-text-bright: #1A1A1A;
  --surface-ink: #F5F4F1;   /* label text on filled node circles */
  --m-root-ink: #4A4A4A;
  /* accent + branches (desaturated editorial register) */
  --accent: #3F5148;
  --accent-ink: #F5F4F1;
  --root: #3F5148;
  --creativity: #9C5B4F;
  --ai-skills: #A98243;
  --ai-skills-text: #A98243;
  --web-design: #5C7A8A;
  /* lines */
  --hairline: #D8D5CC;
  --connector-fill: #EFEDE8;
  /* fonts */
  --font-display: "Fraunces", Georgia, serif;
  --font-body: "Inter", system-ui, sans-serif;
}
```

Then rename the old var usages everywhere (replace_all in index.html):
- `var(--locked-stroke)` → `var(--hairline)`
- `var(--locked-fill)` → `var(--connector-fill)`

- [ ] **Step 4: Delete the background glow and node glow**

Delete the `.tree-wrap::before { ... }` rule entirely (the radial `--bg-glow` gradient; those vars no longer exist).
Delete this line inside `.node.unlocked circle { ... }` (keep the rule's fill/stroke lines):

```css
  filter: drop-shadow(var(--unlocked-glow) var(--node-glow));
```

Delete the rule:

```css
.node.root-node.hovered circle { filter: drop-shadow(var(--unlocked-glow) var(--root-hover-glow)); }
```

Delete this line inside `.m-node.unlocked .m-dot { ... }`:

```css
    box-shadow: var(--unlocked-glow) var(--node-glow);
```

(`--unlocked-glow`/`--root-hover-glow` were only defined in the deleted theme blocks; these deletions remove their last uses. `--node-glow` is still set by `branchVars()` in JS — Task 4 removes that.)

- [ ] **Step 5: Remove the theme toggle**

- Markup: delete the whole `<button id="theme-toggle" ...>...</button>` element (both inline SVGs included) from the header.
- CSS: delete the rules `.theme-toggle`, `.theme-toggle:hover`, `.theme-toggle:focus-visible`, `.theme-toggle svg`, `.theme-toggle .icon-sun`, `html[data-theme="light"] .theme-toggle .icon-moon`, `html[data-theme="light"] .theme-toggle .icon-sun`.
- JS: delete the whole `/* ================= theme toggle ================= */` section (`THEME_KEY` const + `initThemeToggle` function) and the `initThemeToggle();` call in the boot block.
- Also delete the theme-hydration snippet if one exists in `<head>` (grep `localStorage.getItem` outside the main script; a small inline script sets `data-theme` early — delete it).

- [ ] **Step 6: Run to verify it passes**

Run: `npm run verify`
Expected: PASS, zero failures, zero console errors. Open `verify-out\desktop.png`: cream page, tree in desaturated clay/ochre/slate with green root outline, no glow. (Old chrome styling looks rough against cream — Tasks 4–5 fix that; only the suite gates this task.)

- [ ] **Step 7: Commit**

```powershell
git add index.html scripts/verify.mjs
git commit -m "feat: light-only editorial palette; remove theme toggle and all glow"
```

---

### Task 4: Editorial tree components (nodes, edges, branch labels, tooltip)

**Files:**
- Modify: `index.html` (tree CSS + `BRANCHES`/`branchVars` + branch-label build + halo build), `scripts/verify.mjs` (new section 4c)

**Interfaces:**
- Consumes: palette vars from Task 3 (`--accent`, `--accent-ink`, `--hairline`, `--connector-fill`).
- Produces: SVG classes `.branch-underline` (3 of them) replacing `.branch-chip-bg`; NO `.edge-halo` elements; `BRANCHES` entries reduced to `{ label, cssColor }`; `branchVars(branch)` returns `` `--node-color:${b.cssColor};--edge-color:${b.cssColor};` ``. Task 6 reuses `branchVars` for mobile sections.

- [ ] **Step 1: Add verify section 4c (failing tests)**

Insert directly after section 4b's last line (`await page.mouse.move(720, 10);`):

```js
/* ---------- 4c. editorial tree styling ---------- */
const treeStyle = await page.evaluate(() => {
  const rootCircle = document.querySelector('#tree-svg g.node.root-node circle');
  const core = document.querySelector('#tree-svg g.edge.lit .edge-core');
  return {
    rootFill: getComputedStyle(rootCircle).fill,
    halos: document.querySelectorAll('#tree-svg .edge-halo').length,
    chips: document.querySelectorAll('#tree-svg .branch-chip-bg').length,
    underlines: document.querySelectorAll('#tree-svg .branch-underline').length,
    coreWidth: parseFloat(getComputedStyle(core).strokeWidth),
    ttTransform: getComputedStyle(document.querySelector('#tooltip .tt-name')).textTransform,
  };
});
check('root node filled green', treeStyle.rootFill === 'rgb(63, 81, 72)', treeStyle.rootFill);
check('no edge halos', treeStyle.halos === 0);
check('branch chips replaced by underlines', treeStyle.chips === 0 && treeStyle.underlines === 3);
check('thin edges', treeStyle.coreWidth <= 3.5, `${treeStyle.coreWidth}px`);
check('tooltip title not uppercased', treeStyle.ttTransform === 'none');
```

- [ ] **Step 2: Run to verify failures**

Run: `npm run verify`
Expected: FAIL — all five new 4c checks. Everything else PASS.

- [ ] **Step 3: Restyle edges and delete halos**

CSS — replace the `.edge-core`, `.edge-halo`, `.edge.lit .edge-core`, `.edge.lit .edge-halo` rules with:

```css
.edge-core {
  fill: none;
  stroke: var(--hairline);
  stroke-width: 3;
  stroke-linecap: round;
  transition: stroke 0.35s ease;
}
.edge.lit .edge-core { stroke: var(--edge-color); stroke-opacity: 0.5; }
```

JS — in `buildSvg()`'s edge loop, delete the halo path line:

```js
    el("path", { class: "edge-halo", d }, g);
```

- [ ] **Step 4: Restyle nodes**

Replace the node rules (`.node circle`, `.node text`, `.node.unlocked circle`, `.node.unlocked text`, `.node.decorative circle`, `.node.root-node circle`, `.node.root-node text`) with:

```css
.node circle {
  fill: var(--connector-fill);
  stroke: var(--hairline);
  stroke-width: 1.5;
  transition: fill 0.25s ease, stroke 0.25s ease;
}
.node text {
  font-family: var(--font-display);
  font-weight: 600;
  fill: var(--node-text);
  text-anchor: middle;
  pointer-events: none;
}
.node.unlocked circle { fill: var(--node-color); stroke: var(--node-color); }
.node.unlocked text { fill: var(--surface-ink); }
.node.decorative circle { fill: var(--connector-fill); stroke: var(--hairline); }
.node.root-node circle { fill: var(--accent); stroke: var(--accent); }
.node.root-node text { fill: var(--accent-ink); }
.node.root-node.hovered circle { fill: #35443C; stroke: #35443C; }
```

Keep `.node { transform-box: ... }` and `.node.hovered { transform: scale(1.06); }` as they are.

- [ ] **Step 5: Branch labels — serif + green underline**

CSS — replace the `.branch-chip-bg` and `.branch-label` rules with:

```css
.branch-label {
  font-family: var(--font-display);
  font-size: 19px;
  font-weight: 600;
  fill: var(--ink);
  text-anchor: middle;
}
.branch-underline { stroke: var(--accent); stroke-width: 3; }
```

JS — in `buildSvg()`, replace the branch-labels loop body (currently: computes `label`/`w`, adds a `branch-chip-bg` rect and an uppercase `branch-label` text) with:

```js
  /* branch base labels: serif title with a short green underline */
  const gLabels = el("g", { id: "branch-labels" }, svg);
  for (const branch in BRANCHES) {
    const base = SKILL_TREE_DATA.modules.find(m => m.branch === branch && m.order === 1);
    const n = NODES[base.id];
    const g = el("g", { style: branchVars(branch) }, gLabels);
    const t1 = el("text", { class: "branch-label", x: n.x, y: 1150 }, g);
    t1.textContent = BRANCHES[branch].label;
    el("line", { class: "branch-underline", x1: n.x - 28, y1: 1162, x2: n.x + 28, y2: 1162 }, g);
  }
```

- [ ] **Step 6: Tooltip card + slim BRANCHES**

CSS — in the `.tooltip` rule add `border: 1px solid var(--hairline);`, change `border-radius` to `6px`, and change `box-shadow` to `0 4px 16px var(--shadow)`. Replace the `.tooltip .tt-name` rule with:

```css
.tooltip .tt-name {
  font-family: var(--font-display);
  font-size: 17px;
  font-weight: 600;
  margin-bottom: 6px;
}
```

In `.tooltip .tt-desc`, add `color: var(--ink-muted);`.

Focus outlines switch to the accent (spec §6) — change:

```css
.hit-layer button:focus-visible {
  outline: 2px solid var(--node-color);
```

to

```css
.hit-layer button:focus-visible {
  outline: 2px solid var(--accent);
```

(`.hit-layer a.root-link:focus-visible` already uses `var(--root)`, which now equals the accent — leave it.)

JS — replace the `BRANCHES` object and `branchVars` with:

```js
const BRANCHES = {
  "creativity":     { label: "Creativity",       cssColor: "var(--creativity)" },
  "ai-skills":      { label: "AI Skills",        cssColor: "var(--ai-skills)" },
  "web-app-design": { label: "Web & App Design", cssColor: "var(--web-design)" }
};
```

```js
function branchVars(branch) {
  const b = BRANCHES[branch];
  return `--node-color:${b.cssColor};--edge-color:${b.cssColor};`;
}
```

Grep for remaining `--node-text-color` / `--node-glow` / `textColor` / `glow:` references; the only allowed survivors are in the mobile CSS block (`var(--node-text-color, var(--node-color))` on `.mobile-branch h2`) — leave that for Task 6, the fallback keeps it working.

- [ ] **Step 7: Run to verify it passes**

Run: `npm run verify`
Expected: PASS, zero failures. Open `verify-out\desktop.png`: flat desaturated node fills with off-white serif labels, thin muted edges, serif branch titles with short green underlines, quiet cream connector dots, green root. If any node label reads as low-contrast (ochre especially), darken that branch hue slightly (stay desaturated) and re-run.

- [ ] **Step 8: Commit**

```powershell
git add index.html scripts/verify.mjs
git commit -m "feat: editorial tree components — flat nodes, thin edges, serif labels, card tooltip"
```

---

### Task 5: Editorial framing — sticky nav, hero, static logo strip

**Files:**
- Modify: `index.html` (head meta/title/favicon, header/hero markup + CSS, footer markup + CSS + JS, fit allowance), `scripts/verify.mjs` (sections 7c, new 7d, 9's footer selector, 10's marquee check)

**Interfaces:**
- Consumes: palette vars; `TOOL_LOGOS` array (unchanged).
- Produces: `.site-nav` with `.wordmark` + 3 `.nav-links a` (hrefs below); `.hero` with h1/intro/caption; `#logo-strip` built by `buildLogoStrip()` (replaces `buildMarquee`); footer class `.built-with` (replaces `.tools-marquee`). Task 6 restyles `.site-nav`/`.hero` inside the mobile media query.

- [ ] **Step 1: Rewrite verify sections (failing tests)**

1a. Replace ALL of section 7c (from `/* ---------- 7c. tools marquee ---------- */` through `check('marquee: label text', ...)`) with:

```js
/* ---------- 7c. static "Built with" logo strip ---------- */
const canonicalLogos = JSON.parse(readFileSync(join(here, '..', 'src', 'data', 'toolLogos.json'), 'utf8'));
const logoData = await page.evaluate(() => window.TOOL_LOGOS);
check('logo data matches src/data/toolLogos.json', stable(logoData) === stable(canonicalLogos));
const strip = await page.evaluate(() => {
  const el = document.getElementById('logo-strip');
  const logos = el ? [...el.querySelectorAll('.tool-logo')] : [];
  return {
    present: !!el,
    count: logos.length,
    labels: logos.map(s => s.getAttribute('aria-label')),
    animation: el ? getComputedStyle(el).animationName : '',
    marqueeLeftovers: document.querySelectorAll('.marquee-track, .marquee-group, .marquee-viewport').length,
  };
});
check('strip: 10 logos, once', strip.present && strip.count === 10 && strip.marqueeLeftovers === 0, JSON.stringify(strip));
check('strip: all tools in order', stable(strip.labels) === stable(['OpenAI', 'Anthropic', 'Gemini', 'Notion', 'Supabase', 'Mermaid', 'Google Stitch', 'VS Code', 'GitHub', 'YouTube']));
check('strip: no animation', strip.animation === 'none');
```

1b. Insert a new section 7d directly after 7c:

```js
/* ---------- 7d. editorial nav + hero ---------- */
const nav = await page.evaluate(() => ({
  wordmark: (document.querySelector('.site-nav .wordmark') || {}).textContent,
  sticky: getComputedStyle(document.querySelector('.site-nav')).position,
  links: [...document.querySelectorAll('.site-nav .nav-links a')].map(a => a.href),
  heroH1: (document.querySelector('.hero h1') || {}).textContent,
  caption: (document.querySelector('.hero .hero-caption') || {}).textContent,
}));
check('nav wordmark', nav.wordmark === 'Camp Codex');
check('nav is sticky', nav.sticky === 'sticky');
check('nav links', nav.links.length === 3
  && nav.links[0] === 'https://camp-codex-skill-tree.vercel.app/'
  && nav.links[1] === 'https://joshwexler.com/'
  && nav.links[2] === 'https://joshwexler.com/coaching/', nav.links.join(' | '));
check('hero headline', nav.heroH1 === 'The Camp Codex curriculum, mapped.');
check('hero caption', nav.caption === 'Three branches. 21 modules. Hover any node.');
```

1c. In section 9's `mob` evaluate, replace the `marqueeVisible` line with:

```js
  stripVisible: !!document.querySelector('.built-with') && getComputedStyle(document.querySelector('.built-with')).display !== 'none',
```

and the corresponding check with `check('mobile: logo strip present', mob.stripVisible);`

1d. In section 10, replace the `rmMarquee` lines:

```js
const rmMarquee = await rm.evaluate(() => getComputedStyle(document.getElementById('marquee-track')).animationName);
check('reduced-motion: marquee static', rmMarquee === 'none');
```

with:

```js
const rmStrip = await rm.evaluate(() => getComputedStyle(document.getElementById('logo-strip')).animationName);
check('reduced-motion: strip static', rmStrip === 'none');
```

- [ ] **Step 2: Run to verify failures**

Run: `npm run verify`
Expected: FAIL — the 7c strip checks, all of 7d, mobile strip check, reduced-motion strip check (marquee still present, no nav/hero). Everything else PASS.

- [ ] **Step 3: Head, nav, and hero markup**

Head edits:
- `<title>` → `Camp Codex — Editorial Skill Tree`
- meta description → `content="The Camp Codex curriculum as an editorial skill tree — three branches, 21 modules."`
- In the favicon data-URI, replace `%23FFCC00` with `%233F5148`.

Replace the whole `<header class="site-header">...</header>` block with:

```html
<header class="site-nav">
  <a class="wordmark" href="#">Camp Codex</a>
  <nav class="nav-links" aria-label="Site">
    <a href="https://camp-codex-skill-tree.vercel.app" target="_blank" rel="noopener">Original site <span aria-hidden="true">↗</span></a>
    <a href="https://joshwexler.com" target="_blank" rel="noopener">Josh Wexler <span aria-hidden="true">↗</span></a>
    <a class="btn-primary" href="https://joshwexler.com/coaching/" target="_blank" rel="noopener">Work with Josh</a>
  </nav>
</header>
<section class="hero">
  <h1>The Camp Codex curriculum, mapped.</h1>
  <p class="hero-intro">The complete Camp Codex builder curriculum — creativity, AI skills, and web &amp; app design — drawn as one connected tree.</p>
  <p class="hero-caption">Three branches. 21 modules. Hover any node.</p>
</section>
```

CSS — delete the `.site-header`, `.site-header h1`, `.site-header .subtitle`, `.header-tools` rules (and the `.site-header` line inside the mobile media query). Add:

```css
/* ---------- editorial nav + hero ---------- */
.site-nav {
  position: sticky;
  top: 0;
  z-index: 40;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  padding: 16px 48px;
  background: var(--bg);
  border-bottom: 1px solid var(--hairline);
}
.wordmark {
  font-family: var(--font-display);
  font-size: 22px;
  font-weight: 700;
  color: var(--ink);
  text-decoration: none;
}
.nav-links { display: flex; align-items: center; gap: 28px; }
.nav-links a {
  font-family: var(--font-body);
  font-size: 14px;
  color: var(--ink-muted);
  text-decoration: none;
  padding-bottom: 3px;
  border-bottom: 2px solid transparent;
  transition: color 0.2s ease, border-color 0.2s ease;
}
.nav-links a:hover, .nav-links a:focus-visible { border-bottom-color: var(--accent); color: var(--ink); }
.nav-links a.btn-primary {
  background: var(--accent);
  color: var(--accent-ink);
  border-bottom: 0;
  border-radius: 8px;
  padding: 10px 18px;
  font-weight: 600;
}
.nav-links a.btn-primary:hover, .nav-links a.btn-primary:focus-visible { background: #35443C; }
.hero { max-width: 1160px; margin: 0 auto; padding: 40px 24px 4px; }
.hero h1 {
  font-family: var(--font-display);
  font-size: clamp(34px, 4.5vw, 50px);
  font-weight: 700;
  line-height: 1.05;
  color: var(--ink);
}
.hero-intro { font-size: 16px; line-height: 1.6; color: var(--ink-muted); max-width: 60ch; margin-top: 14px; }
.hero-caption { font-size: 13px; color: var(--ink-muted); opacity: 0.85; margin-top: 10px; }
@media (max-height: 860px) and (min-width: 768px) {
  .hero { padding-top: 22px; }
  .hero h1 { font-size: 32px; }
  .hero-intro { margin-top: 8px; font-size: 14px; }
}
```

- [ ] **Step 4: Static logo strip replaces the marquee**

Markup — replace the whole `<footer class="tools-marquee">...</footer>` block with:

```html
<footer class="built-with">
  <div class="strip-label">Built with</div>
  <div class="logo-strip" id="logo-strip"></div>
</footer>
```

CSS — delete the rules `.tools-marquee`, `.marquee-label`, `.marquee-viewport`, `.marquee-track`, `.tools-marquee:hover .marquee-track`, `.marquee-group`, `@keyframes marquee-scroll`, and the `.marquee-track { animation: none; }` line in the reduced-motion block. Keep `.tool-logo` rules, changing the svg height to `22px` (and the stitch override to `16px`). Add:

```css
/* ---------- "Built with" strip ---------- */
.built-with { border-top: 1px solid var(--hairline); margin-top: 8px; padding: 26px 24px 34px; }
.strip-label {
  text-align: center;
  font-family: var(--font-body);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--ink-muted);
  margin-bottom: 18px;
}
.logo-strip {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  align-items: center;
  gap: 32px 48px;
  max-width: 1160px;
  margin: 0 auto;
  color: var(--ink-muted);
  opacity: 0.75;
}
```

JS — replace the whole `buildMarquee()` function with:

```js
function buildLogoStrip() {
  const strip = document.getElementById("logo-strip");
  for (const logo of TOOL_LOGOS) {
    const item = document.createElement("span");
    item.className = "tool-logo";
    item.dataset.id = logo.id;
    item.setAttribute("role", "img");
    item.setAttribute("aria-label", logo.name);
    item.title = logo.name;
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", logo.viewBox);
    svg.setAttribute("focusable", "false");
    svg.setAttribute("aria-hidden", "true");
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", logo.path);
    path.setAttribute("fill", "currentColor");
    if (logo.fillRule) path.setAttribute("fill-rule", logo.fillRule);
    svg.appendChild(path);
    item.appendChild(svg);
    strip.appendChild(item);
  }
}
```

and change the boot call `buildMarquee();` → `buildLogoStrip();`.

- [ ] **Step 5: Retune the fit allowance**

The nav + hero are taller than the old header. In the `.tree-canvas` rule, change the allowance `260px` to `400px` as a starting value:

```css
  width: min(100%, calc((100vh - 400px) * (1160 / 1330)));
```

Run the suite; if `1366x768: no vertical scroll` fails, raise toward 430px; if `1440x1000: tree has real size` fails (tree < 500px tall), the hero media query above should already compress short viewports — check desktop.png and adjust the allowance in 10px steps until both fit checks pass. Update the comment above the rule to name the new chrome (nav + hero + paddings + strip).

- [ ] **Step 6: Run to verify it passes**

Run: `npm run verify`
Expected: PASS, zero failures. Open `verify-out\desktop.png`: sticky serif nav with green button, big serif hero, full tree, static muted logo row — no scrollbar.

- [ ] **Step 7: Commit**

```powershell
git add index.html scripts/verify.mjs
git commit -m "feat: editorial framing — sticky nav, serif hero, static logo strip"
```

---

### Task 6: Mobile editorial list rows

**Files:**
- Modify: `index.html` (`buildMobile()`, mobile media-query CSS, boot wiring), `scripts/verify.mjs` (section 9)

**Interfaces:**
- Consumes: `branchVars(branch)` (Task 4 signature), `.built-with` footer (Task 5), `JOSH` object.
- Produces: mobile rows `.m-row` (21) containing `.m-arrow` + `.m-body > strong.m-name` + inline ` — description`; NO `.m-node` buttons, NO `mobileEls` registry; Josh section unchanged in structure.

- [ ] **Step 1: Rewrite verify section 9 (failing tests)**

Replace section 9's content — from `const mob = await m.evaluate(...)` through `check('mobile: branch counter...'`-era tap checks (i.e., everything between the mobile context setup and the `mJosh` block) — with (update the section header comment to `9. mobile: stacked editorial list rows`):

```js
const mob = await m.evaluate(() => ({
  scrollW: document.documentElement.scrollWidth,
  winW: window.innerWidth,
  treeHidden: getComputedStyle(document.querySelector('.tree-wrap')).display === 'none',
  sections: document.querySelectorAll('.mobile-branch:not(.mobile-root)').length,
  rootSections: document.querySelectorAll('.mobile-branch.mobile-root').length,
  rows: document.querySelectorAll('.mobile-stack .m-row').length,
  buttons: document.querySelectorAll('.mobile-stack button').length,
  firstRow: (document.querySelector('.mobile-stack .m-row .m-body') || {}).textContent || '',
  stripVisible: !!document.querySelector('.built-with') && getComputedStyle(document.querySelector('.built-with')).display !== 'none',
}));
check('mobile: no horizontal scroll', mob.scrollW <= mob.winW + 1, `${mob.scrollW} > ${mob.winW}`);
check('mobile: tree hidden, 3 branches + Josh', mob.treeHidden && mob.sections === 3 && mob.rootSections === 1);
check('mobile: 21 list rows, no buttons', mob.rows === 21 && mob.buttons === 0, `rows ${mob.rows}, buttons ${mob.buttons}`);
check('mobile: description inline in row', mob.firstRow.startsWith('Curiosity — ') && mob.firstRow.length > 60, mob.firstRow.slice(0, 40));
check('mobile: logo strip present', mob.stripVisible);
```

Keep the `mJosh` checks and mobile screenshot as they are. (Any earlier `localStorage.clear()`/tap lines in this section from the fork are deleted with the replaced block.)

- [ ] **Step 2: Run to verify failures**

Run: `npm run verify`
Expected: FAIL — `mobile: 21 list rows, no buttons` (old `.m-node` buttons still present), `mobile: description inline in row`. Everything else PASS.

- [ ] **Step 3: Rewrite buildMobile() rows**

In `buildMobile()`, keep the outer branch/section/header loop (including `header.append(h2)`) and the Josh root section unchanged; replace only the per-module `forEach` body with:

```js
      .forEach(m => {
        const li = document.createElement("li");
        const row = document.createElement("div");
        row.className = "m-row";
        const arrow = document.createElement("span");
        arrow.className = "m-arrow";
        arrow.setAttribute("aria-hidden", "true");
        arrow.textContent = "→";
        const body = document.createElement("p");
        body.className = "m-body";
        const name = document.createElement("strong");
        name.className = "m-name";
        name.textContent = m.name;
        body.append(name, ` — ${m.description}`);
        row.append(arrow, body);
        li.appendChild(row);
        ol.appendChild(li);
      });
```

Delete the `const mobileEls = {};` declaration and the boot line `for (const id in mobileEls) wireButton(mobileEls[id]);` (desktop `buttonEls` wiring stays).

- [ ] **Step 4: Rewrite the mobile CSS block**

Replace the entire `@media (max-width: 767px) { ... }` block with:

```css
@media (max-width: 767px) {
  .tree-wrap { display: none; }
  .site-nav { padding: 14px 18px; gap: 12px; }
  .nav-links { gap: 14px; }
  .nav-links a { font-size: 13px; }
  .nav-links a.btn-primary { padding: 8px 12px; }
  .hero { padding: 26px 18px 0; }
  .hero-caption { display: none; } /* "hover any node" is wrong on touch */

  .mobile-stack {
    display: block;
    padding: 4px 18px 48px;
    max-width: 560px;
    margin: 0 auto;
  }
  .mobile-branch { margin-top: 34px; }
  .mobile-branch > header { border-bottom: 1px solid var(--hairline); }
  .mobile-branch h2 {
    display: inline-block;
    font-family: var(--font-display);
    font-size: 20px;
    font-weight: 600;
    color: var(--ink);
    border-bottom: 3px solid var(--accent);
    padding-bottom: 6px;
    margin-bottom: -1px;
  }
  .mobile-branch ol { list-style: none; }
  .mobile-branch li { border-bottom: 1px solid var(--hairline); }
  .mobile-branch li:last-child { border-bottom: 0; }
  .m-row { display: flex; gap: 12px; padding: 12px 2px; }
  .m-arrow { flex: 0 0 auto; color: var(--node-color); font-size: 15px; line-height: 1.55; }
  .m-body { font-family: var(--font-body); font-size: 14px; line-height: 1.55; color: var(--ink-muted); }
  .m-body .m-name { color: var(--ink); font-weight: 600; }
  .mobile-root h2 a { color: var(--accent); text-decoration: none; }
  .mobile-root h2 a:hover, .mobile-root h2 a:focus-visible { text-decoration: underline; }
  .m-root-desc {
    font-family: var(--font-body);
    font-size: 13.5px;
    line-height: 1.6;
    color: var(--m-root-ink);
    padding: 10px 2px 0;
  }
}
```

Also grep the reduced-motion block and delete any `.m-node` selectors remaining in it, and grep `m-dot|m-node|lit-in` — zero matches must remain in CSS or JS.

- [ ] **Step 5: Run to verify it passes**

Run: `npm run verify`
Expected: PASS, zero failures. Open `verify-out\mobile.png`: serif branch headers with green underline, arrow rows with bold names and inline muted descriptions, hairline separators, Josh section with link + bio.

- [ ] **Step 6: Commit**

```powershell
git add index.html scripts/verify.mjs
git commit -m "feat: mobile editorial list rows with inline descriptions"
```

---

### Task 7: README, GitHub repo, Vercel deploy

**Files:**
- Create: `README.md`
- Remote setup: GitHub repo `camp-codex-editorial`, Vercel project

**Interfaces:**
- Consumes: finished site from Tasks 1–6.
- Produces: public GitHub repo + live Vercel URL.

- [ ] **Step 1: Write README.md**

```markdown
# Camp Codex — Editorial Edition

The [Camp Codex skill tree](https://camp-codex-skill-tree.vercel.app) restyled in the
editorial design language of [joshwexler.com](https://joshwexler.com): warm off-white,
a high-contrast serif (Fraunces) with Inter, one forest-green accent, hairline rules,
and generous whitespace. Same curriculum, same tree, calmer clothes.

## How it works

- One zero-dependency file: `index.html` (fonts embedded, SVG tree built at runtime).
- **Hover** any module on desktop for its description; on mobile the branches render as
  editorial list rows with descriptions inline.
- The whole tree fits the desktop viewport; the SVG is vector, so browser zoom stays crisp.
- The root of the tree is **Josh Wexler** — clicking opens
  [joshwexler.com/coaching](https://joshwexler.com/coaching/) in a new tab.

## Structure

- `index.html` — the entire site
- `src/data/skillTree.json` — canonical module data (mirrored verbatim inline)
- `src/data/toolLogos.json` — "Built with" logo data
- `scripts/verify.mjs` — Playwright verification suite
- `scripts/fetch-fonts.mjs` — regenerates the embedded Fraunces @font-face blocks

## Verifying changes

```
npm install
npm run verify
```

Checks data sync, node/edge counts against the approved topology, verbatim tooltip
content, the editorial palette (light-only, no glow), the nav/hero/logo strip,
fit-to-viewport at 1440 × 1000 and 1366 × 768, keyboard access, reduced motion, the
mobile list rows, and console errors; writes screenshots to `verify-out/` (git-ignored).

## Related

- Original (dark, game-styled): https://github.com/Sterling-Smith-KU/camp-codex-skill-tree
```

- [ ] **Step 2: Run the suite one final time and commit**

Run: `npm run verify`
Expected: PASS.

```powershell
git add README.md
git commit -m "docs: README for the editorial edition"
```

- [ ] **Step 3: Create the GitHub repo and push**

```powershell
gh repo create camp-codex-editorial --public --source . --remote origin --push
```

Expected: repo created under the authenticated account (Sterling-Smith-KU) and `master`/`main` pushed. If `gh` is missing or unauthenticated, STOP and report BLOCKED asking the controller/user to run `gh auth login` (or create the repo manually and provide the remote URL) — do not embed credentials.

- [ ] **Step 4: Create the Vercel project and deploy**

```powershell
npx vercel link --yes
npx vercel --prod --yes
```

Expected: new Vercel project `camp-codex-editorial` linked (creates `.vercel/` — already git-ignored) and a production URL printed. If the CLI demands interactive login, STOP and report BLOCKED asking the user to run `npx vercel login` — do not attempt tokens.

- [ ] **Step 5: Smoke-check the live URL**

Fetch the production URL (e.g. `curl.exe -s https://camp-codex-editorial.vercel.app | Select-String "Camp Codex"`) and confirm HTTP 200 with the wordmark present. Report the final URL.
