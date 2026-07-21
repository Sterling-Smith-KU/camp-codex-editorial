// Verification pass for the Camp Codex skill tree (v3 — all modules unlocked by default).
// Checks: data sync with src/data/skillTree.json, node/edge counts vs the approved
// Mermaid topology, tooltip content, always-lit state, keyboard access, mobile stack
// layout, console errors, screenshots.
// Run: npm install && npm run verify
import { chromium } from 'playwright';
import { pathToFileURL, fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { mkdirSync, readFileSync } from 'fs';

const here = dirname(fileURLToPath(import.meta.url));
const file = pathToFileURL(join(here, '..', 'index.html')).href;
const outDir = join(here, '..', 'verify-out');
mkdirSync(outDir, { recursive: true });

const canonicalData = JSON.parse(readFileSync(join(here, '..', 'src', 'data', 'skillTree.json'), 'utf8'));
const stable = obj => JSON.stringify(sortKeys(obj));
function sortKeys(v) {
  if (Array.isArray(v)) return v.map(sortKeys);
  if (v && typeof v === 'object') return Object.fromEntries(Object.keys(v).sort().map(k => [k, sortKeys(v[k])]));
  return v;
}

const errors = [];
const failures = [];
const check = (name, cond, detail = '') => {
  if (!cond) failures.push(`${name}${detail ? ' — ' + detail : ''}`);
  return cond;
};

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await ctx.newPage();
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));

await page.goto(file, { waitUntil: 'networkidle' });
await page.evaluate(() => localStorage.clear());
await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(300);

/* ---------- 1. data matches src/data/skillTree.json verbatim ---------- */
const pageData = await page.evaluate(() => window.SKILL_TREE_DATA);
check('data-sync', stable(pageData) === stable(canonicalData), 'inline data drifted from src/data/skillTree.json');

/* ---------- 2. structure matches the approved Mermaid topology ---------- */
const counts = await page.evaluate(() => ({
  modules: document.querySelectorAll('#tree-svg g.node.module').length,
  decorative: document.querySelectorAll('#tree-svg g.node.decorative').length,
  roots: document.querySelectorAll('#tree-svg g.node.root-node').length,
  edges: document.querySelectorAll('#tree-svg g.edge').length,
  buttons: document.querySelectorAll('#hit-layer button').length,
  mobileRows: document.querySelectorAll('.mobile-stack .m-row').length,
  branchLabels: [...document.querySelectorAll('.branch-label')].map(t => t.textContent),
}));
check('21 modules', counts.modules === 21, `got ${counts.modules}`);
check('11 decorative connectors', counts.decorative === 11, `got ${counts.decorative}`);
check('1 root', counts.roots === 1, `got ${counts.roots}`);
check('35 edges', counts.edges === 35, `got ${counts.edges}`);
check('21 hit buttons', counts.buttons === 21, `got ${counts.buttons}`);
check('21 mobile rows', counts.mobileRows === 21, `got ${counts.mobileRows}`);
check('branch labels', stable(counts.branchLabels.sort()) === stable(['AI Skills', 'Creativity', 'Web & App Design']), counts.branchLabels.join('|'));

const expectedEdges = [
  'root->curiosity', 'root->llm-fundamentals', 'root->app-anatomy',
  'curiosity->burning-questions', 'burning-questions->own-the-build', 'burning-questions->demo-and-feedback',
  'own-the-build->start-small', 'start-small->relentless-iteration',
  'demo-and-feedback->portfolio-mindset', 'portfolio-mindset->r-out3',
  'relentless-iteration->r-merge', 'r-out3->r-merge', 'r-merge->r-top1', 'r-merge->r-top2',
  'llm-fundamentals->coding-agents', 'llm-fundamentals->skill-building',
  'coding-agents->context-engineering', 'context-engineering->version-control',
  'skill-building->superpowers', 'superpowers->mcp-connections',
  'version-control->y-merge', 'mcp-connections->y-merge', 'y-merge->y-topl', 'y-merge->y-topr',
  'app-anatomy->front-end-vs-back-end', 'front-end-vs-back-end->apis', 'front-end-vs-back-end->design-systems',
  'apis->happy-path', 'happy-path->mermaid-blueprints', 'design-systems->automated-qa', 'automated-qa->b-out3',
  'mermaid-blueprints->b-merge', 'b-out3->b-merge', 'b-merge->b-top1', 'b-merge->b-top2',
];
const domEdges = await page.evaluate(() => [...document.querySelectorAll('#tree-svg g.edge')].map(g => g.dataset.edge));
check('edge set matches Mermaid diagram', stable(domEdges.sort()) === stable([...expectedEdges].sort()));

/* ---------- 3. fonts embedded and active ---------- */
const fontsOk = await page.evaluate(() => document.fonts.check('700 15px Fraunces') && document.fonts.check('600 15px Fraunces') && document.fonts.check('13px Inter'));
check('embedded fonts active', fontsOk);

/* ---------- 4. tooltip content verbatim for all 21 modules ---------- */
const tipMismatches = [];
for (const m of canonicalData.modules) {
  await page.hover(`#hit-layer button[data-id="${m.id}"]`);
  await page.waitForTimeout(60);
  const shown = await page.locator('#tooltip.show').count();
  const name = await page.locator('#tooltip .tt-name').textContent();
  const desc = await page.locator('#tooltip .tt-desc').textContent();
  if (shown !== 1 || name !== m.name || desc !== m.description) tipMismatches.push(m.id);
  const tipBox = await page.locator('#tooltip').boundingBox();
  if (tipBox && (tipBox.x < 0 || tipBox.y < 0 || tipBox.x + tipBox.width > 1440 || tipBox.y + tipBox.height > 1000)) {
    tipMismatches.push(m.id + ' (offscreen)');
  }
  await page.mouse.move(720, 10);
}
check('tooltips verbatim + on-screen for all 21', tipMismatches.length === 0, tipMismatches.join(', '));

/* ---------- 4b. root node = Josh Wexler (label, tooltip, coaching link) ---------- */
const josh = await page.evaluate(() => {
  const a = document.querySelector('#hit-layer a.root-link');
  const label = [...document.querySelectorAll('#tree-svg g.node.root-node tspan')].map(t => t.textContent).join(' ');
  return a && { href: a.href, target: a.target, rel: a.rel, label };
});
check('root link -> joshwexler.com/coaching, new tab', !!josh
  && josh.href === 'https://joshwexler.com/coaching/' && josh.target === '_blank' && josh.rel === 'noopener');
check('root labeled Josh Wexler', josh && josh.label === 'Josh Wexler', josh && josh.label);
await page.hover('#hit-layer a.root-link');
await page.waitForTimeout(60);
const joshTipName = await page.locator('#tooltip.show .tt-name').textContent();
const joshTipDesc = await page.locator('#tooltip.show .tt-desc').textContent();
check('Josh tooltip name', joshTipName === 'Josh Wexler', joshTipName);
check('Josh tooltip bio verbatim', joshTipDesc.startsWith('Raised in New York City by two psychologist parents')
  && joshTipDesc.endsWith('goes beyond a coaching problem.'), (joshTipDesc || '').slice(0, 60));
const joshTipBox = await page.locator('#tooltip').boundingBox();
check('Josh tooltip on-screen', joshTipBox && joshTipBox.x >= 0 && joshTipBox.y >= 0
  && joshTipBox.x + joshTipBox.width <= 1440 && joshTipBox.y + joshTipBox.height <= 1000);
await page.mouse.move(720, 10);

/* ---------- 4c. editorial tree styling ---------- */
await page.waitForTimeout(400);
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

/* ---------- 5. everything unlocked on load; clicking never changes state ---------- */
const litState = () => page.evaluate(() => ({
  litNodes: document.querySelectorAll('#tree-svg g.node.module.unlocked').length,
  litEdges: document.querySelectorAll('#tree-svg g.edge.lit').length,
  hasCounter: !!document.getElementById('total-count'),
  branchCounts: document.querySelectorAll('[data-branch-count]').length,
  hasHint: !!document.querySelector('#tooltip .tt-hint'),
  pressed: document.querySelectorAll('#hit-layer button[aria-pressed]').length,
}));
let lit = await litState();
check('all 21 modules lit on load', lit.litNodes === 21, `got ${lit.litNodes}`);
check('all 21 module edges lit', lit.litEdges === 21, `got ${lit.litEdges}`);
check('no unlock counters', !lit.hasCounter && lit.branchCounts === 0);
check('no blocked-hint element', !lit.hasHint);
check('no aria-pressed toggles', lit.pressed === 0);

// clicking a node shows its tooltip and changes nothing
await page.click('#hit-layer button[data-id="context-engineering"]');
await page.waitForTimeout(150);
check('click shows tooltip', await page.locator('#tooltip.show').count() === 1);
lit = await litState();
check('click does not change lit state', lit.litNodes === 21 && lit.litEdges === 21);
check('no unlock key written', (await page.evaluate(() => localStorage.getItem('camp-codex-skill-tree:unlocked:v2'))) === null);
await page.mouse.move(720, 10);

/* ---------- 6. reload: still fully lit ---------- */
await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(300);
lit = await litState();
check('still fully lit after reload', lit.litNodes === 21 && lit.litEdges === 21);

/* ---------- 7. keyboard access ---------- */
await page.focus('#hit-layer button[data-id="curiosity"]');
check('focus shows tooltip', await page.locator('#tooltip.show').count() === 1);
await page.keyboard.press('Enter');
await page.waitForTimeout(300);
check('keyboard activation shows tooltip, no state change', await page.locator('#tooltip.show').count() === 1
  && (await litState()).litNodes === 21);

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

/* ---------- 7d. editorial nav + hero ---------- */
const nav = await page.evaluate(() => {
  const siteNav = document.querySelector('.site-nav');
  return {
    wordmark: (document.querySelector('.site-nav .wordmark') || {}).textContent,
    sticky: siteNav ? getComputedStyle(siteNav).position : '',
    links: [...document.querySelectorAll('.site-nav .nav-links a')].map(a => a.href),
    heroH1: (document.querySelector('.hero h1') || {}).textContent,
    caption: (document.querySelector('.hero .hero-caption') || {}).textContent,
    intro: (document.querySelector('.hero .hero-intro') || {}).textContent,
  };
});
check('nav wordmark', nav.wordmark === 'Camp Codex');
check('nav is sticky', nav.sticky === 'sticky');
check('nav links', nav.links.length === 3
  && nav.links[0] === 'https://camp-codex-skill-tree.vercel.app/'
  && nav.links[1] === 'https://joshwexler.com/'
  && nav.links[2] === 'https://joshwexler.com/coaching/', nav.links.join(' | '));
check('hero headline', nav.heroH1 === 'The Camp Codex curriculum, mapped.');
check('hero intro verbatim', nav.intro === 'The complete Camp Codex builder curriculum — creativity, AI skills, and web & app design — drawn as one connected tree.');
check('hero caption', nav.caption === 'Three branches. 21 modules. Hover any node.');

/* ---------- 8. desktop screenshot ---------- */
await page.mouse.move(720, 10);
await page.waitForTimeout(300);
await page.screenshot({ path: join(outDir, 'desktop.png'), fullPage: true });

/* ---------- 8b. whole tree fits the viewport on desktop ---------- */
const fitAt = async (w, h) => {
  const c = await browser.newContext({ viewport: { width: w, height: h } });
  const p = await c.newPage();
  await p.goto(file, { waitUntil: 'networkidle' });
  await p.waitForTimeout(300);
  const r = await p.evaluate(() => ({
    overflow: document.documentElement.scrollHeight - window.innerHeight,
    treeH: document.querySelector('.tree-canvas').getBoundingClientRect().height,
  }));
  await c.close();
  return r;
};
const fit1440 = await fitAt(1440, 1000);
check('1440x1000: no vertical scroll', fit1440.overflow <= 1, `overflow ${fit1440.overflow}px`);
check('1440x1000: tree has real size', fit1440.treeH > 500, `tree ${fit1440.treeH}px`);
const fit1366 = await fitAt(1366, 768);
check('1366x768: no vertical scroll', fit1366.overflow <= 1, `overflow ${fit1366.overflow}px`);

/* ---------- 9. mobile: stacked editorial list rows ---------- */
const mCtx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
const m = await mCtx.newPage();
m.on('console', msg => { if (msg.type() === 'error') errors.push('MOBILE: ' + msg.text()); });
m.on('pageerror', e => errors.push('MOBILE PAGEERROR: ' + e.message));
await m.goto(file, { waitUntil: 'networkidle' });
await m.waitForTimeout(300);
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
const mJosh = await m.evaluate(() => {
  const a = document.querySelector('.mobile-root h2 a');
  const desc = document.querySelector('.mobile-root .m-root-desc');
  return a && desc && { href: a.href, name: a.textContent, hasBio: desc.textContent.length > 100 };
});
check('mobile: Josh section with link + inline bio', !!mJosh
  && mJosh.href === 'https://joshwexler.com/coaching/' && mJosh.name === 'Josh Wexler' && mJosh.hasBio);
await m.screenshot({ path: join(outDir, 'mobile.png'), fullPage: true });

/* ---------- 10. reduced motion smoke test ---------- */
const rmCtx = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
const rm = await rmCtx.newPage();
rm.on('pageerror', e => errors.push('REDUCED-MOTION PAGEERROR: ' + e.message));
await rm.goto(file, { waitUntil: 'networkidle' });
await rm.click('#hit-layer button[data-id="curiosity"]');
await rm.waitForTimeout(200);
check('reduced-motion: click shows tooltip', await rm.locator('#tooltip.show').count() === 1);
const rmStrip = await rm.evaluate(() => { const el = document.getElementById('logo-strip'); return el ? getComputedStyle(el).animationName : ''; });
check('reduced-motion: strip static', rmStrip === 'none');
await rmCtx.close();

/* ---------- report ---------- */
check('zero console errors', errors.length === 0, errors.join(' | '));

console.log(JSON.stringify({ pass: failures.length === 0, failures, consoleErrors: errors }, null, 2));
console.log(`\nScreenshots written to ${outDir}/`);
await browser.close();
process.exit(failures.length ? 1 : 0);
