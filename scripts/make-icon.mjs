// Genera apple-touch-icon.png (1024×1024) a partir de icon.svg. Uso: node scripts/make-icon.mjs
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
const svg = readFileSync(new URL('../icon.svg', import.meta.url), 'utf8');
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1024, height: 1024 } });
await p.setContent('<html><body style="margin:0">' + svg.replace('<svg ', '<svg width="1024" height="1024" ') + '</body></html>');
await p.screenshot({ path: new URL('../apple-touch-icon.png', import.meta.url).pathname });
await b.close(); console.log('apple-touch-icon.png listo');
