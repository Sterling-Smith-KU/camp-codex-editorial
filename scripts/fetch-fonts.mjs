// One-shot generator: downloads Fraunces (latin subset) from Google Fonts and
// writes self-contained base64 @font-face blocks to fraunces-faces.css for
// pasting into index.html. Re-run only if the embedded fonts need regenerating.
// Deduplication: when multiple weights share the same woff2 payload (e.g. a
// variable font served for both 600 and 700), they are collapsed into a single
// block with a weight range (e.g. font-weight:600 700).
import { createHash } from 'crypto';
import { writeFileSync } from 'fs';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';
const cssUrl = 'https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,600;0,9..144,700;1,9..144,600&display=swap';
const css = await (await fetch(cssUrl, { headers: { 'User-Agent': UA } })).text();
const faces = [...css.matchAll(/\/\* latin \*\/\s*(@font-face\s*{[^}]+})/g)].map(m => m[1]);
if (faces.length === 0) throw new Error('no latin @font-face blocks found — Google CSS format changed?');

// Fetch all payloads and collect metadata
const fetched = [];
for (const face of faces) {
  const url = face.match(/url\((https:[^)]+\.woff2)\)/)[1];
  const buf = Buffer.from(await (await fetch(url)).arrayBuffer());
  const b64 = buf.toString('base64');
  const hash = createHash('sha256').update(buf).digest('hex');
  const style = (face.match(/font-style:\s*(\S+)/) || [])[1] || 'normal';
  const weight = (face.match(/font-weight:\s*(\S+)/) || [])[1] || '400';
  fetched.push({ face, url, b64, hash, style, weight: weight.replace(';', '') });
}

// Group by (style, hash) — same variable-font file => collapse weight range
const groups = new Map();
for (const f of fetched) {
  const key = `${f.style}|${f.hash}`;
  if (!groups.has(key)) groups.set(key, []);
  groups.get(key).push(f);
}

let out = '';
for (const group of groups.values()) {
  const { face, b64, style } = group[0];
  const weights = group.map(f => Number(f.weight)).sort((a, b) => a - b);
  const weightValue = weights.length > 1 ? `${weights[0]} ${weights[weights.length - 1]}` : String(weights[0]);
  const block = face
    .replace(/src:[^;]+;/, `src:url(data:font/woff2;base64,${b64}) format('woff2');`)
    .replace(/font-weight:\s*[^;]+;/, `font-weight:${weightValue};`);
  out += block + '\n';
}

writeFileSync('fraunces-faces.css', out);
console.log(`wrote fraunces-faces.css: ${groups.size} deduplicated latin faces (${faces.length} raw)`);
