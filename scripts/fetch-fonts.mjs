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
