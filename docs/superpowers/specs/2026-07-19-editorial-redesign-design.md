# Camp Codex — Editorial Edition: Design

**Date:** 2026-07-19
**New repo:** `C:\Users\smith\camp-codex-editorial` (own GitHub remote + Vercel project)
**Source:** forked from `camp-codex-skill-tree` at its current state (all modules lit, soft glow removed later by this redesign anyway, fit-to-viewport)
**Design language:** `joshwexler-design.md` (editorial, calm, warm off-white + one forest-green accent, serif display + sans body)

## Goal

A secondary website with the same content and interactions as the Camp Codex skill tree, restyled end-to-end in the joshwexler.com design language, with light editorial page framing (sticky nav, serif hero, static logo footer). Same single-file, zero-dependency architecture; same Playwright verification workflow.

Decisions confirmed with the user: new repo + new Vercel project; desaturated branch hues (not monochrome); editorial page framing (not a pure re-skin); light theme only (toggle removed).

## Approach

Fork-and-restyle. Copy from the original repo: `index.html`, `src/data/skillTree.json`, `src/data/toolLogos.json`, `scripts/verify.mjs`, `package.json`, `.gitignore`, `.vercelignore`. Keep the SVG tree engine (node layout, label fitting, hit-layer, tooltip clamping, fit-to-viewport sizing) untouched except where styling requires. Replace the design layer.

## 1. Palette (light only)

CSS custom properties; the dark-theme block and `html[data-theme="light"]` block collapse into one `:root`.

| Role | Value | Usage |
|------|-------|-------|
| `--bg` | `#F5F4F1` | Page background |
| `--tint` | `#E8EBE7` | Tinted blocks (hero caption strip if needed, mobile section alternation — optional, use sparingly) |
| `--ink` | `#1A1A1A` | Headlines, wordmark, node label text on light fills |
| `--body` | `#4A4A4A` | Paragraphs, nav links, descriptions |
| `--accent` | `#3F5148` | Primary button fill, active/hover underlines, root node, links |
| `--accent-ink` | `#F5F4F1` | Text on green |
| `--hairline` | `#D8D5CC` | All dividers, card borders, muted edges |
| `--creativity` | `#9C5B4F` (clay red) | Creativity branch |
| `--ai-skills` | `#A98243` (ochre) | AI Skills branch |
| `--web-design` | `#5C7A8A` (slate blue) | Web & App Design branch |

Branch hues are starting values — implementer may tune within the same desaturated register (muted, low-saturation, mid-lightness) against screenshots. The old neon values (`#FF3333`, `#FFCC00`, `#33CCFF`), all glow variables, and the radial background glow are removed entirely.

## 2. Typography

- **Display serif:** Fraunces (Google Fonts), weights 600/700 + italic, embedded as base64 woff2 subsets like the current fonts. Used for: wordmark, hero headline, section titles, node labels, tooltip titles, mobile module names' branch headers.
- **Body sans:** Inter (already embedded in the source file — reuse the existing base64 blocks). Used for: nav links, paragraphs, buttons, captions, node descriptions, mobile rows.
- Chakra Petch and Rajdhani embeds are deleted.
- Headlines: large, tight leading, left-aligned. Body at a 55–65 character measure. Captions small and muted.

## 3. Page structure

Top to bottom:

1. **Sticky nav** — cream background, hairline bottom border. Left: "Camp Codex" serif wordmark. Right: text links "Original site ↗" (→ https://camp-codex-skill-tree.vercel.app, new tab) and "Josh Wexler ↗" (→ https://joshwexler.com, new tab), then a filled-green rounded "Work with Josh" button (→ https://joshwexler.com/coaching/, new tab). Links get a short green underline on hover/focus.
2. **Hero** — left-aligned serif headline "The Camp Codex curriculum, mapped." + one short sans intro paragraph (what Camp Codex is, one or two sentences) + small muted caption "Three branches. 21 modules. Hover any node." Hairline divider below.
3. **Tree section** — the existing fit-to-viewport SVG tree, restyled (section 4). The 100vh allowance is retuned for the new nav + hero + footer heights so the whole tree still fits the desktop viewport with no vertical scroll.
4. **Footer logo strip** — "Built with" caption + one static row of the 10 tool logos in muted gray (`--body` at reduced opacity), wrapping if needed; hairline top border. The marquee animation, track duplication, and hover-pause are removed.

The theme toggle button, its JS, and `THEME_KEY` are removed.

## 4. Tree styling

- **Module nodes:** flat fill in the branch hue, no stroke or a same-hue stroke, **no glow/drop-shadow**. Label text in `--accent-ink` (off-white) — verify contrast on all three hues; if ochre fails, darken ochre rather than switching label color. Hover: slight scale (keep existing transform) — no filter effects.
- **Root node (Josh):** filled `--accent` green circle, off-white serif label. Hover: subtle darkening (no glow).
- **Connector dots:** cream fill with hairline stroke — quiet, as today but in the new palette.
- **Edges:** module edges in the branch hue at ~0.5 opacity, thin (reduce stroke-width from 6.5 to ~3); connector edges in `--hairline`. The `.edge-halo` layer is removed entirely.
- **Branch labels:** replace the chip rect + uppercase sans with a serif label in `--ink` plus a short green underline rule beneath (SVG line), per the active-nav-indicator pattern. No background rect.
- **Tooltip:** white (`#FFFFFF`) card, hairline border, soft small shadow, serif title in `--ink`, sans description in `--body`. Same positioning/clamping logic.

## 5. Mobile (<768px)

Stacked branches restyled to the doc's list-row pattern:

- Branch header: serif branch name with short green underline; hairline rule below.
- Each module row: `→` marker in the branch hue, **bold sans module name**, em-dash, muted description inline — all visible without tapping. Rows separated by hairlines. The dot column, tap-for-tooltip behavior, and `lit-in` connector tints are removed on mobile (tooltip stays desktop-only).
- Josh section: serif name as a link (green, underlined on hover) + inline bio paragraph, as today.

## 6. Accessibility & motion

- Hit-layer buttons keep `aria-label = "Name. Description"`; nav/footer links keep descriptive labels; focus-visible outlines switch to `--accent`.
- Only remaining animations: hover scale on nodes and color transitions. `prefers-reduced-motion` disables the scale. (Marquee animation no longer exists.)
- Type contrast: `--body` on `--bg` and label-on-hue combinations must pass WCAG AA; tune hues if needed.

## 7. Verification

`scripts/verify.mjs` is adapted, keeping the same structure and `npm run verify` workflow:

- Unchanged: data sync, topology counts, tooltip verbatim content, Josh link checks, always-lit state, keyboard access, fit-to-viewport at 1440×1000 and 1366×768, console-error and reduced-motion checks, screenshots.
- Changed: font check → Fraunces + Inter; background check → `rgb(245, 244, 241)`; theme-toggle section (7b) deleted; marquee section (7c) → static logo strip (10 logos present, single group, **no** animation); mobile section → asserts inline descriptions rendered per row and no horizontal scroll.
- New: nav present with wordmark + 3 links/button hrefs; no element with a `drop-shadow` filter among nodes (glow really gone).

## 8. Repo & deploy

- `git init`, first commits: this spec, then the forked files, then the restyle work (per plan).
- GitHub repo `camp-codex-editorial` under the user's account (`gh repo create`), Vercel project connected to it (`vercel` CLI or dashboard; same static-site zero-build setup as the original).
- README: describes the site as the editorial companion to camp-codex-skill-tree, links both the original and joshwexler.com, documents `npm run verify`.

## Out of scope

- Any content changes (module names/descriptions, topology, Josh bio are verbatim).
- Any change to the original camp-codex-skill-tree repo.
- Photography, cookie banner, multi-page structure, or other joshwexler.com sections not applicable to a one-page tree.
- Dark mode.
