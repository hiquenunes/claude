// Modelos de arte para posts 1080x1350. Cada modelo recebe os campos do slide
// e devolve o HTML interno; `page()` envolve com fontes, tema e moldura comum.
import { pathToFileURL } from 'node:url';
import path from 'node:path';

export const WIDTH = 1080;
export const HEIGHT = 1350;

const FONTS = path.resolve(path.dirname(new URL(import.meta.url).pathname), 'fonts');

export const THEMES = {
  vinho:   { bg: '#5A1A2B', fg: '#F3EEE6', accent: '#E9A93A', line: 'rgba(243,238,230,.28)' },
  carvao:  { bg: '#1E1B1A', fg: '#F3EEE6', accent: '#E9A93A', line: 'rgba(243,238,230,.22)' },
  chopp:   { bg: '#E9A93A', fg: '#2A1410', accent: '#5A1A2B', line: 'rgba(42,20,16,.28)' },
  gelo:    { bg: '#F3EEE6', fg: '#2A1410', accent: '#5A1A2B', line: 'rgba(42,20,16,.2)' },
  garrafa: { bg: '#24392F', fg: '#F3EEE6', accent: '#E9A93A', line: 'rgba(243,238,230,.24)' },
};

const esc = (s = '') => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
// Títulos aceitam <i> para o trecho "falado" e \n para quebra de linha.
const rich = (s = '') => esc(s).replace(/&lt;(\/?)i&gt;/g, '<$1i>').replace(/\n/g, '<br>');

const font = (family, file, weight, style = 'normal') =>
  `@font-face{font-family:'${family}';src:url('${pathToFileURL(path.join(FONTS, file)).href}') format('woff2');font-weight:${weight};font-style:${style}}`;

const FONT_CSS = [
  font('Fraunces', 'fraunces-latin-400-normal.woff2', 400),
  font('Fraunces', 'fraunces-latin-600-normal.woff2', 600),
  font('Fraunces', 'fraunces-latin-700-normal.woff2', 700),
  font('Fraunces', 'fraunces-latin-900-normal.woff2', 900),
  font('Fraunces', 'fraunces-latin-400-italic.woff2', 400, 'italic'),
  font('Fraunces', 'fraunces-latin-600-italic.woff2', 600, 'italic'),
  font('Inter', 'inter-latin-400-normal.woff2', 400),
  font('Inter', 'inter-latin-500-normal.woff2', 500),
  font('Inter', 'inter-latin-600-normal.woff2', 600),
  font('Inter', 'inter-latin-700-normal.woff2', 700),
].join('\n');

const BASE_CSS = `
*{box-sizing:border-box;margin:0;padding:0}
html,body{width:${WIDTH}px;height:${HEIGHT}px}
body{background:var(--bg);color:var(--fg);font-family:Inter,sans-serif;overflow:hidden;position:relative;-webkit-font-smoothing:antialiased}
.frame{position:absolute;inset:0;padding:88px 96px;display:flex;flex-direction:column}
.grain{position:absolute;inset:0;pointer-events:none;opacity:.10;mix-blend-mode:overlay;z-index:5}
.top{display:flex;justify-content:space-between;align-items:center;position:relative;z-index:3}
.mark{display:flex;align-items:baseline;gap:14px;color:var(--fg)}
.mark b{font-family:Fraunces,serif;font-weight:900;font-size:46px;letter-spacing:-1px}
.mark span{font-size:17px;font-weight:600;letter-spacing:5px;text-transform:uppercase;opacity:.8}
.mark img{height:72px;width:auto}
.eyebrow{font-size:22px;font-weight:600;letter-spacing:4px;text-transform:uppercase;color:var(--accent)}
.body{flex:1;display:flex;flex-direction:column;justify-content:flex-end;position:relative;z-index:3}
h1{font-family:Fraunces,serif;font-weight:600;letter-spacing:-2px;line-height:.98}
h1 i{font-weight:400;font-style:italic;color:var(--accent)}
.foot{margin-top:56px;padding-top:28px;border-top:2px solid var(--line);font-size:24px;font-weight:500;letter-spacing:.5px;opacity:.85;position:relative;z-index:3}
`;

const GRAIN = `<svg class="grain" viewBox="0 0 ${WIDTH} ${HEIGHT}" xmlns="http://www.w3.org/2000/svg"><filter id="n"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="3" stitchTiles="stitch"/></filter><rect width="100%" height="100%" filter="url(#n)"/></svg>`;

function mark(ctx) {
  if (ctx.logo) return `<div class="mark"><img src="${ctx.logo}" alt=""></div>`;
  return `<div class="mark"><b>Dos 2</b><span>Gastrobar</span></div>`;
}

const fileUrl = (ctx, p) => pathToFileURL(path.resolve(ctx.clientDir, p)).href;

const T = {
  statement: (s, ctx) => ({
    css: `h1{font-size:168px}.kicker{margin-top:48px;font-size:30px;font-weight:500;opacity:.75}`,
    html: `<div class="top">${mark(ctx)}<div class="eyebrow">${esc(s.eyebrow)}</div></div>
      <div class="body"><h1>${rich(s.title)}</h1>${s.kicker ? `<div class="kicker">${esc(s.kicker)}</div>` : ''}</div>`,
  }),

  info: (s, ctx) => ({
    css: `h1{font-size:112px;margin-top:28px}
      .rows{margin-top:72px;display:flex;flex-direction:column}
      .row{display:flex;justify-content:space-between;align-items:baseline;padding:30px 0;border-top:2px solid var(--line)}
      .row:last-child{border-bottom:2px solid var(--line)}
      .row span{font-size:24px;font-weight:600;letter-spacing:4px;text-transform:uppercase;opacity:.8}
      .row em{font-family:Fraunces,serif;font-style:italic;font-size:62px}
      .foot{border-top:0;margin-top:48px;padding-top:0}`,
    html: `<div class="top">${mark(ctx)}</div>
      <div class="body"><div class="eyebrow">${esc(s.eyebrow)}</div><h1>${rich(s.title)}</h1>
      <div class="rows">${(s.rows || []).map(([k, v]) => `<div class="row"><span>${esc(k)}</span><em>${esc(v)}</em></div>`).join('')}</div>
      ${s.footer ? `<div class="foot">${esc(s.footer)}</div>` : ''}</div>`,
  }),

  option: (s, ctx) => ({
    css: `.num{position:absolute;right:56px;top:150px;font-family:Fraunces,serif;font-weight:900;font-size:620px;line-height:.8;color:transparent;-webkit-text-stroke:4px var(--accent);opacity:.9;z-index:2}
      h1{font-size:190px}.txt{margin-top:40px;font-family:Fraunces,serif;font-style:italic;font-size:54px;line-height:1.18;max-width:780px}`,
    html: `<div class="top">${mark(ctx)}<div class="eyebrow">opção ${esc(s.index)}</div></div>
      <div class="num">${esc(s.index)}</div>
      <div class="body"><h1>${rich(s.title)}</h1><p class="txt">${esc(s.text)}</p></div>`,
  }),

  quote: (s, ctx) => ({
    css: `.q{font-family:Fraunces,serif;font-weight:900;font-size:300px;line-height:.6;color:var(--accent);height:150px}
      h1{font-size:104px;margin-top:40px}`,
    html: `<div class="top">${mark(ctx)}</div>
      <div class="body"><div class="q">“</div><h1>${rich(s.title)}</h1>${s.footer ? `<div class="foot">${esc(s.footer)}</div>` : ''}</div>`,
  }),

  // Foto ocupando a arte inteira, com título sobre um degradê na base.
  photo: (s, ctx) => ({
    css: `.ph{position:absolute;inset:0;background:url('${fileUrl(ctx, s.photo)}') ${s.focus || 'center'}/cover}
      .shade{position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,.35) 0%,rgba(0,0,0,0) 22%,rgba(0,0,0,0) 45%,rgba(0,0,0,.78) 100%)}
      .frame{color:#F3EEE6}.mark{color:#F3EEE6}
      h1{font-size:${s.size || 120}px;color:#F3EEE6}.sub{margin-top:28px;font-size:30px;font-weight:500;color:#F3EEE6;opacity:.9}`,
    html: `<div class="ph"></div><div class="shade"></div><div class="frame">
      <div class="top">${mark(ctx)}${s.eyebrow ? `<div class="eyebrow">${esc(s.eyebrow)}</div>` : ''}</div>
      <div class="body">${s.title ? `<h1>${rich(s.title)}</h1>` : ''}${s.text ? `<div class="sub">${esc(s.text)}</div>` : ''}</div></div>`,
    bare: true,
  }),

  // Foto emoldurada em cima, faixa de cor com título embaixo.
  'photo-frame': (s, ctx) => ({
    css: `.frame{padding:48px}
      .ph{flex:1;border-radius:4px;background:url('${fileUrl(ctx, s.photo)}') ${s.focus || 'center'}/cover;position:relative;z-index:3}
      .band{padding:44px 48px 8px;display:flex;justify-content:space-between;align-items:flex-end;gap:40px;position:relative;z-index:3}
      h1{font-size:${s.size || 84}px}.band .mark b{font-size:38px}`,
    html: `<div class="ph"></div><div class="band"><h1>${rich(s.title)}</h1>${mark(ctx)}</div>`,
  }),
};

// Reduz o título até caber na largura, para palavras longas não vazarem.
const FIT = `<script>document.fonts.ready.then(()=>{for(const h of document.querySelectorAll('h1')){h.style.overflowWrap='normal';let s=parseFloat(getComputedStyle(h).fontSize);while(h.scrollWidth>h.clientWidth+1&&s>40){s-=4;h.style.fontSize=s+'px'}}document.body.dataset.ready='1'})</script>`;

export const TEMPLATE_NAMES = Object.keys(T);

export function page(slide, ctx) {
  const tpl = T[slide.template];
  if (!tpl) throw new Error(`Modelo desconhecido: ${slide.template} (use ${TEMPLATE_NAMES.join(', ')})`);
  const theme = THEMES[slide.theme || 'vinho'];
  if (!theme) throw new Error(`Tema desconhecido: ${slide.theme}`);
  const { css, html, bare } = tpl(slide, ctx);
  const vars = `:root{--bg:${theme.bg};--fg:${theme.fg};--accent:${theme.accent};--line:${theme.line}}`;
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><style>${FONT_CSS}${vars}${BASE_CSS}${css}</style></head>
<body>${bare ? html : `<div class="frame">${html}</div>`}${GRAIN}${FIT}</body></html>`;
}
