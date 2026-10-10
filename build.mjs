// Une src/ en un único index.html (la app completa, igual que Enten).
// Uso: node build.mjs        → escribe index.html
//      node build.mjs --check → además comprueba la sintaxis del JS
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';

const root = new URL('.', import.meta.url).pathname;
const read = (p) => readFileSync(join(root, p), 'utf8');

const jsDir = join(root, 'src/js');
const files = readdirSync(jsDir).filter((f) => f.endsWith('.js')).sort();
const js = files.map((f) => `// ---- ${f} ----\n` + readFileSync(join(jsDir, f), 'utf8')).join('\n');

const html = read('src/shell.html')
  .replace('/*__CSS__*/', () => read('src/styles.css'))
  .replace('/*__JS__*/', () => js);

writeFileSync(join(root, 'index.html'), html);
console.log(`index.html · ${(html.length / 1024).toFixed(0)} KB · ${files.length} módulos`);

if (process.argv.includes('--check')) {
  const tmp = join(root, '.check.js');
  writeFileSync(tmp, js);
  try { execFileSync(process.execPath, ['--check', tmp], { stdio: 'inherit' }); console.log('Sintaxis OK'); }
  finally { writeFileSync(tmp, ''); }
}
