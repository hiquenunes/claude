// Gera as artes (PNG 1080x1350) e o feed.json de um cliente.
// Uso: node render.mjs dos2gastrobar
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { page, WIDTH, HEIGHT } from './templates.mjs';

const ROOT = path.dirname(new URL(import.meta.url).pathname);

async function loadPlaywright() {
  try { return await import('playwright'); } catch {}
  const require = createRequire(import.meta.url);
  for (const p of ['/opt/node-tools/node_modules/playwright']) {
    try { return require(p); } catch {}
  }
  throw new Error('Playwright não encontrado. Rode: npm i -D playwright');
}

const slug = process.argv[2];
if (!slug) { console.error('Uso: node render.mjs <cliente>'); process.exit(1); }

const clientDir = path.join(ROOT, 'clients', slug);
const data = JSON.parse(fs.readFileSync(path.join(clientDir, 'posts.json'), 'utf8'));
const outDir = path.join(ROOT, 'out', slug);
const imgDir = path.join(outDir, 'posts');
const tmpDir = path.join(outDir, '.tmp');
fs.rmSync(imgDir, { recursive: true, force: true });
fs.mkdirSync(imgDir, { recursive: true });
fs.mkdirSync(tmpDir, { recursive: true });

const logoFile = ['logo.png', 'logo.svg'].map(f => path.join(clientDir, f)).find(f => fs.existsSync(f));
const ctx = { clientDir, logo: logoFile ? pathToFileURL(logoFile).href : null };

const { chromium } = await loadPlaywright();
const browser = await chromium.launch();
const tab = await browser.newPage({ viewport: { width: WIDTH, height: HEIGHT }, deviceScaleFactor: 1 });

const feed = { client: data.client, batch: data.batch, generatedAt: new Date().toISOString(), posts: [] };
for (const post of data.posts) {
  const images = [];
  for (const [i, slide] of post.slides.entries()) {
    const name = post.slides.length > 1 ? `${post.id}-${i + 1}.png` : `${post.id}.png`;
    const htmlFile = path.join(tmpDir, name.replace('.png', '.html'));
    fs.writeFileSync(htmlFile, page(slide, ctx));
    await tab.goto(pathToFileURL(htmlFile).href);
    await tab.waitForSelector('body[data-ready]');
    await tab.screenshot({ path: path.join(imgDir, name), type: 'png' });
    images.push(`posts/${name}`);
  }
  const { slides, ...rest } = post;
  feed.posts.push({ ...rest, images });
  console.log(`✓ ${post.id} (${images.length})`);
}
await browser.close();
fs.rmSync(tmpDir, { recursive: true, force: true });
fs.writeFileSync(path.join(outDir, 'feed.json'), JSON.stringify(feed, null, 2));

// Página de aprovação com o feed embutido; as imagens ficam ao lado, em posts/.
const tpl = fs.readFileSync(path.join(ROOT, 'approval', 'index.html'), 'utf8');
const inline = JSON.stringify(feed).replace(/</g, '\\u003c');
fs.writeFileSync(path.join(outDir, 'index.html'), tpl.replace('/*FEED*/', () => inline));
console.log(`Página: ${path.relative(ROOT, path.join(outDir, 'index.html'))}`);
