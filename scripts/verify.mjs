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
  mobileRows: document.querySelectorAll('.mobile-stack .m-node').length,
  branchLabels: [...document.querySelectorAll('.branch-label')].map(t => t.textContent),
}));
check('21 modules', counts.modules === 21, `got ${counts.modules}`);
check('11 decorative connectors', counts.decorative === 11, `got ${counts.decorative}`);
check('1 root', counts.roots === 1, `got ${counts.roots}`);
check('35 edges', counts.edges === 35, `got ${counts.edges}`);
check('21 hit buttons', counts.buttons === 21, `got ${counts.buttons}`);
check('21 mobile rows', counts.mobileRows === 21, `got ${counts.mobileRows}`);
check('branch labels', stable(counts.branchLabels.sort()) === stable(['AI SKILLS', 'CREATIVITY', 'WEB & APP DESIGN']), counts.branchLabels.join('|'));

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
const fontsOk = await page.evaluate(() => document.fonts.check('700 15px "Chakra Petch"') && document.fonts.check('13px Inter'));
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

/* ---------- 7b. theme toggle: dark default, light opt-in, persisted ---------- */
const THEME_KEY = 'camp-codex-skill-tree:theme';
const bodyBg = () => page.evaluate(() => getComputedStyle(document.body).backgroundColor);
const themeAttr = () => page.evaluate(() => document.documentElement.dataset.theme || null);
check('dark by default', (await themeAttr()) === null && (await bodyBg()) === 'rgb(11, 14, 20)');
check('toggle starts unpressed', (await page.getAttribute('#theme-toggle', 'aria-pressed')) === 'false');
await page.click('#theme-toggle');
await page.waitForTimeout(100);
check('toggle -> light', (await themeAttr()) === 'light' && (await bodyBg()) === 'rgb(245, 242, 234)');
check('toggle aria-pressed true', (await page.getAttribute('#theme-toggle', 'aria-pressed')) === 'true');
check('theme stored', (await page.evaluate(k => localStorage.getItem(k), THEME_KEY)) === 'light');
await page.screenshot({ path: join(outDir, 'light.png'), fullPage: true });
await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(300);
check('light persists across reload', (await themeAttr()) === 'light');
check('toggle reflects hydrated light theme', (await page.getAttribute('#theme-toggle', 'aria-pressed')) === 'true');
await page.click('#theme-toggle');
await page.waitForTimeout(100);
check('toggle back to dark', (await themeAttr()) === null && (await bodyBg()) === 'rgb(11, 14, 20)');
check('theme key cleared on dark', (await page.evaluate(k => localStorage.getItem(k), THEME_KEY)) === null);

/* ---------- 7c. tools marquee ---------- */
const canonicalLogos = JSON.parse(readFileSync(join(here, '..', 'src', 'data', 'toolLogos.json'), 'utf8'));
const logoData = await page.evaluate(() => window.TOOL_LOGOS);
check('marquee data matches src/data/toolLogos.json', stable(logoData) === stable(canonicalLogos));
const mq = await page.evaluate(() => {
  const track = document.querySelector('.tools-marquee #marquee-track');
  const groups = [...document.querySelectorAll('.marquee-group')];
  const cs = track && getComputedStyle(track);
  return track && {
    groups: groups.length,
    perGroup: groups.map(g => g.querySelectorAll('.tool-logo').length),
    labels: [...groups[0].querySelectorAll('.tool-logo')].map(s => s.getAttribute('aria-label')),
    secondHidden: groups[1] && groups[1].getAttribute('aria-hidden') === 'true',
    animation: cs.animationName,
    playState: cs.animationPlayState,
    label: document.querySelector('.marquee-label').textContent.trim(),
  };
});
check('marquee: 2 groups of 10 logos', !!mq && mq.groups === 2 && mq.perGroup[0] === 10 && mq.perGroup[1] === 10);
check('marquee: all 10 tools in order', !!mq && stable(mq.labels) === stable(['OpenAI', 'Anthropic', 'Gemini', 'Notion', 'Supabase', 'Mermaid', 'Google Stitch', 'VS Code', 'GitHub', 'YouTube']));
check('marquee: duplicate group aria-hidden', !!mq && mq.secondHidden === true);
check('marquee: animation running', !!mq && mq.animation === 'marquee-scroll' && mq.playState === 'running');
check('marquee: label text', !!mq && mq.label === 'Built with');

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

/* ---------- 9. mobile: stacked branches, no sideways scroll, tap shows tooltip ---------- */
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
  marqueeVisible: !!document.querySelector('.tools-marquee') && getComputedStyle(document.querySelector('.tools-marquee')).display !== 'none',
}));
check('mobile: no horizontal scroll', mob.scrollW <= mob.winW + 1, `${mob.scrollW} > ${mob.winW}`);
check('mobile: tree hidden, 3 stacked branches + Josh root', mob.treeHidden && mob.sections === 3 && mob.rootSections === 1);
check('mobile: marquee present', mob.marqueeVisible);
await m.tap('.m-node[data-id="app-anatomy"]');
await m.waitForTimeout(250);
const mLit = await m.evaluate(() => ({
  lit: document.querySelectorAll('.mobile-stack .m-node.unlocked').length,
  litIn: document.querySelectorAll('.mobile-stack li.lit-in').length,
  counters: document.querySelectorAll('[data-m-branch-count]').length,
  tip: !!document.querySelector('#tooltip.show'),
}));
check('mobile: all 21 rows lit + tap shows tooltip', mLit.lit === 21 && mLit.tip, JSON.stringify(mLit));
check('mobile: connectors lit, no counters', mLit.litIn === 21 && mLit.counters === 0);
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
const rmMarquee = await rm.evaluate(() => getComputedStyle(document.getElementById('marquee-track')).animationName);
check('reduced-motion: marquee static', rmMarquee === 'none');
await rmCtx.close();

/* ---------- report ---------- */
check('zero console errors', errors.length === 0, errors.join(' | '));

console.log(JSON.stringify({ pass: failures.length === 0, failures, consoleErrors: errors }, null, 2));
console.log(`\nScreenshots written to ${outDir}/`);
await browser.close();
process.exit(failures.length ? 1 : 0);
