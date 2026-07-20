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
