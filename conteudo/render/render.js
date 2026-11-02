#!/usr/bin/env node
/*
 * Renderizador de posts — @psicojaquelinesauer
 *
 * Uso:
 *   node conteudo/render/render.js conteudo/psicojaquelinesauer/posts/<id>/post.json
 *   node conteudo/render/render.js --todos          (renderiza todos os posts)
 *
 * Lê um post.json (formato descrito em conteudo/psicojaquelinesauer/FORMATO_POST.md)
 * e gera, na pasta "saida/" ao lado do post.json:
 *   - tipo "feed":      feed-01.png (1080x1350) + stories-01.png (1080x1920, adaptação)
 *   - tipo "carrossel": feed-01.png ... feed-NN.png (1080x1350, sem adaptação)
 *   - tipo "story":     stories-01.png ... (1080x1920)
 *   - legenda.txt e previa.png (folha de contato para revisão)
 *
 * Depende só do Playwright + Chromium já instalados no ambiente.
 */
const fs = require('fs');
const path = require('path');
const os = require('os');
const { chromium } = require('playwright');

const RAIZ = path.resolve(__dirname, '..');
const FONTES = path.join(RAIZ, 'assets', 'fonts');
const MARCA = JSON.parse(fs.readFileSync(path.join(RAIZ, 'psicojaquelinesauer', 'marca.json'), 'utf8'));

const FORMATOS = {
  feed: { w: 1080, h: 1350, kMax: 1.35, safe: { t: 90, r: 70, b: 120, l: 70 } },
  // Stories: 250px no topo e ~340px na base ficam sob a interface do Instagram.
  stories: { w: 1080, h: 1920, kMax: 1.5, safe: { t: 250, r: 70, b: 360, l: 70 } },
};

// ---------- utilidades ----------
function semente(str) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  };
}
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
// **texto** vira negrito; *texto* vira destaque colorido; quebras de linha viram <br>
const formatar = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/\*(.+?)\*/g, '<mark>$1</mark>').replace(/\n/g, '<br>');

// ---------- fundos ilustrados (SVG gerado, sem imagens de terceiros) ----------
function svg(w, h, corpo) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" style="position:absolute;inset:0">${corpo}</svg>`;
}
const estrela = (x, y, r, cor, giro = 0) => {
  let p = '';
  for (let i = 0; i < 10; i++) {
    const a = (Math.PI / 5) * i - Math.PI / 2;
    const rr = i % 2 ? r * 0.45 : r;
    p += `${(x + rr * Math.cos(a)).toFixed(1)},${(y + rr * Math.sin(a)).toFixed(1)} `;
  }
  return `<polygon points="${p}" fill="${cor}" transform="rotate(${giro} ${x} ${y})" stroke-linejoin="round"/>`;
};
const rabisco = (x, y, len, cor, esp = 8) => {
  let d = `M${x},${y}`;
  for (let i = 1; i <= 4; i++) d += ` q${len / 8},${i % 2 ? -len / 6 : len / 6} ${len / 4},0`;
  return `<path d="${d}" fill="none" stroke="${cor}" stroke-width="${esp}" stroke-linecap="round"/>`;
};
const nuvem = (x, y, s, op = 0.95) =>
  `<g fill="#fff" opacity="${op}"><ellipse cx="${x}" cy="${y}" rx="${110 * s}" ry="${48 * s}"/><circle cx="${x - 45 * s}" cy="${y - 25 * s}" r="${48 * s}"/><circle cx="${x + 30 * s}" cy="${y - 45 * s}" r="${62 * s}"/></g>`;

const FUNDOS = {
  ceu(w, h, rnd, f) {
    const cores = f.cores || ['#FF8FA3', '#FFC36E', '#FFE66D', '#9BE3A6', '#7CC7FF', '#B79CFF'];
    let arco = '';
    const cx = w * 0.15, cy = h * 1.02;
    cores.forEach((c, i) => {
      const r = w * 0.62 - i * 46;
      arco += `<path d="M${cx - r},${cy} A${r},${r} 0 0 1 ${cx + r},${cy}" fill="none" stroke="${c}" stroke-width="46"/>`;
    });
    let nuv = '';
    for (let i = 0; i < 5; i++) nuv += nuvem(rnd() * w, 120 + rnd() * h * 0.45, 0.6 + rnd() * 0.7, 0.8 + rnd() * 0.2);
    return `<div style="position:absolute;inset:0;background:linear-gradient(180deg,${f.cor || '#86CFF5'} 0%,#D9F2FF 100%)"></div>` + svg(w, h, nuv + arco);
  },
  quarto(w, h, rnd, f) {
    const parede = f.cor || '#EADCC8';
    const cores = ['#C9673F', '#2F4B3A', '#E3A23B', '#7A5236'];
    let pontos = '';
    const limite = h * 0.7;
    for (let i = 0; i < 900; i++)
      pontos += `<ellipse cx="${(rnd() * w).toFixed(0)}" cy="${(rnd() * limite).toFixed(0)}" rx="${3 + rnd() * 6}" ry="${2 + rnd() * 4}" fill="${cores[i % 4]}" opacity="${0.55 + rnd() * 0.4}" />`;
    return (
      `<div style="position:absolute;inset:0;background:${parede}"></div>` +
      svg(w, h, `<g>${pontos}</g>`) +
      `<div style="position:absolute;left:0;right:0;top:70%;height:9%;background:#6E7B62"></div>` +
      `<div style="position:absolute;left:0;right:0;top:79%;bottom:0;background:linear-gradient(#CDB79A,#B79E80)"></div>` +
      `<div style="position:absolute;left:18%;right:18%;bottom:4%;height:11%;border-radius:50%;background:#E9DDC9;opacity:.85"></div>` +
      `<div style="position:absolute;inset:0;background:radial-gradient(ellipse at 50% 40%,rgba(255,240,210,.25),rgba(40,25,10,.35))"></div>`
    );
  },
  confete(w, h, rnd, f) {
    const cores = f.cores || ['#FF6B8B', '#FFC23D', '#4CC9F0', '#7BD389', '#B388FF'];
    let c = '';
    for (let i = 0; i < 90; i++) {
      const x = rnd() * w, y = rnd() * h, cor = cores[i % cores.length], g = rnd() * 360;
      // deixa o miolo livre para o texto (a não ser que "centro_livre": false)
      if (f.centro_livre !== false && x > w * 0.08 && x < w * 0.92 && y > h * 0.16 && y < h * 0.84) continue;
      const t = i % 4;
      if (t === 0) c += `<rect x="${x}" y="${y}" width="${18 + rnd() * 16}" height="${10 + rnd() * 8}" rx="4" fill="${cor}" transform="rotate(${g} ${x} ${y})"/>`;
      else if (t === 1) c += `<circle cx="${x}" cy="${y}" r="${7 + rnd() * 9}" fill="${cor}"/>`;
      else if (t === 2) c += estrela(x, y, 14 + rnd() * 12, cor, g);
      else c += `<g transform="rotate(${g} ${x} ${y})">${rabisco(x, y, 70, cor, 7)}</g>`;
    }
    return `<div style="position:absolute;inset:0;background:${f.cor || '#FFF1D6'}"></div>` + svg(w, h, c);
  },
  explosao(w, h, rnd, f) {
    const cx = w / 2, cy = h * 0.42;
    let raios = '';
    const n = 22;
    for (let i = 0; i < n; i++) {
      const a1 = (2 * Math.PI * i) / n, a2 = (2 * Math.PI * (i + 0.5)) / n, R = Math.max(w, h) * 1.2;
      raios += `<polygon points="${cx},${cy} ${cx + R * Math.cos(a1)},${cy + R * Math.sin(a1)} ${cx + R * Math.cos(a2)},${cy + R * Math.sin(a2)}" fill="${i % 2 ? '#FF7A1A' : '#FFB21E'}" opacity=".55"/>`;
    }
    return (
      `<div style="position:absolute;inset:0;background:radial-gradient(circle at 50% 42%,#FFE08A 0%,#FF8A1F 30%,#C2380E 62%,#3A1B10 100%)"></div>` +
      svg(w, h, raios) +
      `<div style="position:absolute;inset:0;background:radial-gradient(circle at 50% 42%,rgba(255,240,180,.55) 0%,rgba(0,0,0,0) 35%,rgba(30,10,5,.55) 100%)"></div>`
    );
  },
  lousa(w, h, rnd, f) {
    let d = '';
    for (let i = 0; i < 14; i++) {
      const x = rnd() * w, y = rnd() * h;
      d += i % 3 === 0 ? estrela(x, y, 22 + rnd() * 18, 'rgba(255,255,255,.18)', rnd() * 90) : `<g transform="rotate(${rnd() * 360} ${x} ${y})">${rabisco(x, y, 90, 'rgba(255,255,255,.16)', 6)}</g>`;
    }
    return `<div style="position:absolute;inset:0;background:radial-gradient(circle at 50% 40%,${f.cor || '#3B6150'},#22392E)"></div>` + svg(w, h, d);
  },
  papel(w, h, rnd, f) {
    let linhas = '';
    for (let y = 60; y < h; y += 58) linhas += `<line x1="0" y1="${y}" x2="${w}" y2="${y}" stroke="#BFD7EA" stroke-width="2"/>`;
    let d = '';
    const cores = ['#FF8FA3', '#FFC23D', '#7CC7FF', '#7BD389'];
    for (let i = 0; i < 6; i++) {
      const x = i % 2 ? w - 60 - rnd() * 120 : 60 + rnd() * 120, y = 80 + rnd() * (h - 160);
      d += i % 2 ? estrela(x, y, 26, cores[i % 4], rnd() * 60) : `<g transform="rotate(${rnd() * 60 - 30} ${x} ${y})">${rabisco(x - 40, y, 90, cores[i % 4], 8)}</g>`;
    }
    return `<div style="position:absolute;inset:0;background:${f.cor || '#FFFBF0'}"></div>` + svg(w, h, linhas + `<line x1="110" y1="0" x2="110" y2="${h}" stroke="#F4A3A8" stroke-width="3"/>` + d);
  },
  cor(w, h, rnd, f) {
    let d = '';
    if (f.rabiscos !== false)
      for (let i = 0; i < 8; i++) {
        const x = rnd() * w, y = rnd() * h;
        d += i % 2 ? estrela(x, y, 20 + rnd() * 14, 'rgba(255,255,255,.35)', rnd() * 90) : `<g transform="rotate(${rnd() * 360} ${x} ${y})">${rabisco(x, y, 80, 'rgba(255,255,255,.3)', 7)}</g>`;
      }
    return `<div style="position:absolute;inset:0;background:${f.cor || '#FF8FA3'}"></div>` + svg(w, h, d);
  },
};

// ---------- montagem do HTML de um slide ----------
function css() {
  const ff = (nome, arq, peso) =>
    `@font-face{font-family:'${nome}';src:url('file://${path.join(FONTES, arq)}');font-weight:${peso}}`;
  const c = MARCA.cores;
  return `
${ff('Fredoka', 'Fredoka-SemiBold.ttf', 600)}${ff('Fredoka', 'Fredoka-Bold.ttf', 700)}
${ff('Nunito', 'Nunito-SemiBold.ttf', 600)}${ff('Nunito', 'Nunito-ExtraBold.ttf', 800)}
${ff('Baloo', 'Baloo2-ExtraBold.ttf', 800)}${ff('Caveat', 'Caveat-Bold.ttf', 700)}${ff('Elite', 'SpecialElite-Regular.ttf', 400)}
*{box-sizing:border-box;margin:0;padding:0}
body{background:#111}
#c{position:relative;overflow:hidden;--k:1;font-family:Nunito,'Noto Color Emoji',sans-serif}
.foto{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.veu{position:absolute;inset:0}
.safe{position:absolute;display:flex;flex-direction:column;gap:calc(var(--k)*26px)}
.zona{display:flex;flex-direction:column;align-items:center;gap:calc(var(--k)*18px);width:100%}
.zona.centro{flex:1;justify-content:center}
.b{text-align:center;max-width:100%;position:relative;z-index:3}
.b.esq{text-align:left;align-self:stretch}
.faixa,.meme,.amarelo,.titulo,.sub,.nota,.balao,.etiqueta{text-wrap:balance}
mark{background:none;color:var(--destaque,${c.destaque})}
/* faixas de papel com máquina de escrever (ref. psico.giovanavasc) */
.faixa{font-family:Elite,'Noto Color Emoji';font-size:calc(var(--k)*var(--t,66px));line-height:1.6;color:#1E1C1A}
.faixa span{background:var(--fundo,#FBF5E6);padding:.1em .38em;box-decoration-break:clone;-webkit-box-decoration-break:clone;box-shadow:0 6px 14px rgba(0,0,0,.18)}
/* meme branco com contorno (ref. psicosuyanne / gabrielleiferreira.psi) */
.meme{font-family:Fredoka,'Noto Color Emoji';font-weight:700;font-size:calc(var(--k)*var(--t,74px));line-height:1.12;color:var(--cor,#fff);
  text-shadow:0 0 1px #000,4px 0 0 #1B1B1B,-4px 0 0 #1B1B1B,0 4px 0 #1B1B1B,0 -4px 0 #1B1B1B,3px 3px 0 #1B1B1B,-3px 3px 0 #1B1B1B,3px -3px 0 #1B1B1B,-3px -3px 0 #1B1B1B,0 10px 24px rgba(0,0,0,.35)}
/* amarelo com sombra (ref. omateuspsi) */
.amarelo{font-family:Nunito,'Noto Color Emoji';font-weight:800;font-size:calc(var(--k)*var(--t,66px));line-height:1.18;color:var(--cor,#FFE14D);text-shadow:0 4px 0 rgba(0,0,0,.25),0 8px 26px rgba(0,0,0,.55)}
/* título de cartaz + subtítulo (ref. aprendonaterapia) */
.titulo{font-family:Baloo,'Noto Color Emoji';font-weight:800;font-size:calc(var(--k)*var(--t,104px));line-height:1;color:var(--cor,#fff);letter-spacing:-1px;text-shadow:0 6px 0 rgba(0,0,0,.2),0 10px 30px rgba(0,0,0,.5)}
.sub{font-family:Nunito,'Noto Color Emoji';font-weight:800;font-style:italic;font-size:calc(var(--k)*var(--t,48px));line-height:1.2;color:var(--cor,#fff);text-shadow:0 4px 18px rgba(0,0,0,.6)}
.nota{font-family:Caveat,'Noto Color Emoji';font-weight:700;font-size:calc(var(--k)*var(--t,70px));line-height:1.05;color:var(--cor,${c.texto})}
.texto{font-family:Nunito,'Noto Color Emoji';font-weight:600;font-size:calc(var(--k)*var(--t,46px));line-height:1.35;color:var(--cor,${c.texto})}
b,strong{font-weight:800}
.cartao{background:var(--fundo,rgba(255,255,255,.94));border-radius:calc(var(--k)*44px);padding:calc(var(--k)*44px) calc(var(--k)*50px);box-shadow:0 14px 40px rgba(0,0,0,.16)}
.etiqueta{font-family:Nunito,'Noto Color Emoji';font-weight:800;font-size:calc(var(--k)*var(--t,32px));letter-spacing:.06em;text-transform:uppercase;color:var(--cor,#fff);background:var(--fundo,${c.primaria});padding:.35em .9em;border-radius:999px}
.balao{font-family:Fredoka,'Noto Color Emoji';font-weight:600;font-size:calc(var(--k)*var(--t,56px));line-height:1.2;color:var(--cor,#1E1C1A);background:var(--fundo,#fff);border-radius:calc(var(--k)*56px);padding:calc(var(--k)*34px) calc(var(--k)*46px);box-shadow:0 12px 30px rgba(0,0,0,.22)}
.balao::after{content:'';position:absolute;left:18%;bottom:calc(var(--k)*-34px);border:calc(var(--k)*20px) solid transparent;border-top:calc(var(--k)*34px) solid var(--fundo,#fff)}
.adesivos{display:flex;gap:calc(var(--k)*40px);justify-content:center;font-size:calc(var(--k)*var(--t,130px));line-height:1.15;padding-top:calc(var(--k)*20px)}
.adesivos span{display:inline-block;font-family:'Noto Color Emoji';transform:rotate(var(--g));filter:drop-shadow(5px 0 0 #fff) drop-shadow(-5px 0 0 #fff) drop-shadow(0 5px 0 #fff) drop-shadow(0 -5px 0 #fff) drop-shadow(0 12px 14px rgba(0,0,0,.28))}
.espaco{width:100%;border:4px dashed rgba(255,255,255,.0)}
.sticker{position:absolute;z-index:2;line-height:1;font-family:'Noto Color Emoji';transform:translate(-50%,-50%) rotate(var(--g,0deg));
  filter:drop-shadow(5px 0 0 #fff) drop-shadow(-5px 0 0 #fff) drop-shadow(0 5px 0 #fff) drop-shadow(0 -5px 0 #fff) drop-shadow(0 12px 14px rgba(0,0,0,.28))}
.assinatura{position:absolute;left:0;right:0;text-align:center;font-family:Nunito;font-weight:800;font-size:26px;letter-spacing:.04em;z-index:4}
`;
}

function bloco(b) {
  const vars = [];
  if (b.tamanho) vars.push(`--t:${b.tamanho}px`);
  if (b.cor) vars.push(`--cor:${b.cor}`);
  if (b.fundo) vars.push(`--fundo:${b.fundo}`);
  if (b.destaque) vars.push(`--destaque:${b.destaque}`);
  if (b.giro) vars.push(`transform:rotate(${b.giro}deg)`);
  if (b.largura) vars.push(`max-width:${b.largura}%`);
  const cls = ['b', b.estilo || 'texto'];
  if (b.cartao) cls.push('cartao');
  if (b.alinhar === 'esquerda') cls.push('esq');
  if (b.estilo === 'adesivos') {
    const giros = [-12, 8, -5, 14, -9];
    return `<div class="b adesivos">${(b.emojis || []).map((e, i) => `<span style="--g:${giros[i % 5]}deg">${e}</span>`).join('')}</div>`;
  }
  if (b.estilo === 'espaco') return `<div class="espaco" style="height:${b.altura || 300}px"></div>`;
  const conteudo = b.estilo === 'faixa'
    ? b.texto.split('\n').map((l) => `<span>${formatar(l)}</span>`).join('<br>')
    : formatar(b.texto);
  return `<div class="${cls.join(' ')}" style="${vars.join(';')}">${conteudo}</div>`;
}

function htmlSlide(slide, fmt, post, dirPost, i, total) {
  const { w, h, safe } = FORMATOS[fmt];
  const rnd = semente(`${post.id}-${i}-${slide.semente || ''}`);
  const f = slide.fundo || { tipo: 'confete' };
  let fundo = (FUNDOS[f.tipo] || FUNDOS.confete)(w, h, rnd, f);
  if (slide.imagem) {
    const arq = path.resolve(dirPost, slide.imagem);
    if (fs.existsSync(arq)) {
      const pos = slide.imagem_posicao || 'center';
      fundo = `<img class="foto" src="file://${arq}" style="object-position:${pos}">`;
    } else {
      console.warn(`  ! imagem não encontrada (${slide.imagem}); usando fundo ilustrado "${f.tipo}"`);
    }
  }
  const esc_ = slide.escurecer ?? (slide.imagem ? 0.3 : 0);
  const veu = esc_ ? `<div class="veu" style="background:linear-gradient(rgba(0,0,0,${esc_}),rgba(0,0,0,${esc_ * 0.4}) 45%,rgba(0,0,0,${esc_}))"></div>` : '';

  const zonas = { topo: [], centro: [], base: [] };
  for (const b of slide.blocos || []) zonas[b.zona || 'centro'].push(bloco(b));

  const stickers = (slide.stickers || [])
    .map((s) => {
      // em stories o y é comprimido para a área segura, para o sticker não cair sob a interface
      const y = fmt === 'stories' ? (safe.t + (s.y / 100) * (h - safe.t - safe.b)) / h * 100 : s.y;
      return `<div class="sticker" style="left:${s.x}%;top:${y}%;font-size:${s.tamanho || 150}px;--g:${s.giro || 0}deg">${s.emoji}</div>`;
    })
    .join('');

  const corAss = slide.cor_assinatura || (['explosao', 'lousa', 'cor'].includes(f.tipo) || slide.imagem ? 'rgba(255,255,255,.85)' : 'rgba(30,28,26,.6)');
  const assBottom = fmt === 'stories' ? safe.b - 70 : 42;
  const contador = post.tipo === 'carrossel' && slide.mostrar_contador !== false && total > 1
    ? `<div class="assinatura" style="top:36px;bottom:auto;text-align:right;padding-right:60px;color:${corAss}">${i + 1}/${total}</div>` : '';

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${css()}</style></head><body>
<div id="c" style="width:${w}px;height:${h}px">
  ${fundo}${veu}
  <div class="safe" id="safe" style="top:${safe.t}px;right:${safe.r}px;bottom:${safe.b}px;left:${safe.l}px">
    <div class="zona topo">${zonas.topo.join('')}</div>
    <div class="zona centro">${zonas.centro.join('')}</div>
    <div class="zona base">${zonas.base.join('')}</div>
  </div>
  ${stickers}${contador}
  <div class="assinatura" style="bottom:${assBottom}px;color:${corAss}">${esc(MARCA.assinatura)}</div>
</div>
<script>
  // Escala o texto (--k) para o maior valor que ainda cabe na área segura,
  // ocupando no máximo "ocupacao" da altura. Mede o conteúdo real das zonas
  // (a zona central estica com flex:1, então a altura da área não serve de medida).
  window.ajustar = (kMax, ocupacao) => {
    const c = document.getElementById('c'), s = document.getElementById('safe');
    const cabe = () => {
      const gap = parseFloat(getComputedStyle(s).rowGap) || 0;
      let alt = 0;
      for (const z of s.children) {
        const filhos = [...z.children];
        if (!filhos.length) continue;
        const g = parseFloat(getComputedStyle(z).rowGap) || 0;
        alt += filhos.reduce((a, el) => a + el.getBoundingClientRect().height, 0) + g * (filhos.length - 1) + gap;
      }
      const largo = [...s.querySelectorAll('.b:not(.adesivos)')].every((el) => el.scrollWidth <= el.clientWidth + 2);
      return alt <= s.clientHeight * ocupacao && largo;
    };
    let lo = 0.4, hi = kMax;
    c.style.setProperty('--k', hi);
    if (cabe()) return hi;
    for (let i = 0; i < 14; i++) {
      const m = (lo + hi) / 2;
      c.style.setProperty('--k', m);
      if (cabe()) lo = m; else hi = m;
    }
    c.style.setProperty('--k', lo);
    return lo;
  };
</script></body></html>`;
}

// ---------- renderização ----------
async function renderPost(browser, arqPost) {
  const dirPost = path.dirname(path.resolve(arqPost));
  const post = JSON.parse(fs.readFileSync(arqPost, 'utf8'));
  const saida = path.join(dirPost, 'saida');
  fs.rmSync(saida, { recursive: true, force: true });
  fs.mkdirSync(saida, { recursive: true });

  const trabalhos = [];
  const slides = post.slides || [];
  if (post.tipo === 'feed') {
    if (slides.length !== 1) throw new Error('post "feed" deve ter exatamente 1 slide (use "carrossel" para mais).');
    trabalhos.push({ fmt: 'feed', slide: slides[0], i: 0, nome: 'feed-01.png' });
    const st = post.stories_adaptado ? { ...slides[0], ...post.stories_adaptado } : slides[0];
    trabalhos.push({ fmt: 'stories', slide: st, i: 0, nome: 'stories-01-adaptado.png' });
  } else if (post.tipo === 'carrossel') {
    if (slides.length < 2 || slides.length > 20) throw new Error('carrossel precisa de 2 a 20 slides.');
    slides.forEach((s, i) => trabalhos.push({ fmt: 'feed', slide: s, i, nome: `feed-${String(i + 1).padStart(2, '0')}.png` }));
  } else if (post.tipo === 'story') {
    slides.forEach((s, i) => trabalhos.push({ fmt: 'stories', slide: s, i, nome: `stories-${String(i + 1).padStart(2, '0')}.png` }));
  } else throw new Error(`tipo desconhecido: ${post.tipo}`);

  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'render-'));
  const page = await browser.newPage({ deviceScaleFactor: 1 });
  const gerados = [];
  for (const t of trabalhos) {
    const { w, h } = FORMATOS[t.fmt];
    await page.setViewportSize({ width: w, height: h });
    const arqHtml = path.join(tmp, `${t.nome}.html`);
    fs.writeFileSync(arqHtml, htmlSlide(t.slide, t.fmt, post, dirPost, t.i, slides.length));
    await page.goto('file://' + arqHtml);
    await page.evaluate(() => document.fonts.ready);
    const k = await page.evaluate(([m, o]) => window.ajustar(m, o), [t.slide.escala_max || FORMATOS[t.fmt].kMax, t.slide.ocupacao || 0.9]);
    if (k < 0.75) console.warn(`  ! ${t.nome}: texto reduzido para ${Math.round(k * 100)}% — considere encurtar.`);
    await page.locator('#c').screenshot({ path: path.join(saida, t.nome) });
    gerados.push(t);
  }

  // legenda
  const leg = [post.legenda || '', '', (post.hashtags || []).join(' ')].join('\n').trim() + '\n';
  fs.writeFileSync(path.join(saida, 'legenda.txt'), leg);

  // prévia (folha de contato)
  const thumbs = gerados
    .map((t) => `<figure><img src="file://${path.join(saida, t.nome)}" style="height:${t.fmt === 'feed' ? 540 : 768}px"><figcaption>${t.nome}</figcaption></figure>`)
    .join('');
  const prev = path.join(tmp, 'previa.html');
  fs.writeFileSync(prev, `<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{margin:0;background:#EEE;font-family:sans-serif}#p{display:inline-flex;gap:24px;padding:24px;align-items:flex-end;flex-wrap:wrap;width:${Math.min(gerados.length, 5) * 470 + 48}px}figure{margin:0}figcaption{font-size:18px;color:#444;margin-top:6px}img{display:block;border-radius:8px;box-shadow:0 4px 14px rgba(0,0,0,.2)}</style></head><body><div id="p">${thumbs}</div></body></html>`);
  await page.setViewportSize({ width: 2600, height: 1000 });
  await page.goto('file://' + prev);
  await page.locator('#p').screenshot({ path: path.join(saida, 'previa.png') });
  await page.close();
  if (!process.env.MANTER_HTML) fs.rmSync(tmp, { recursive: true, force: true }); else console.log("html em", tmp);
  console.log(`✓ ${post.id}: ${gerados.map((g) => g.nome).join(', ')} → ${path.relative(process.cwd(), saida)}`);
}

(async () => {
  let alvos = process.argv.slice(2);
  if (!alvos.length) {
    console.error('Uso: node conteudo/render/render.js <post.json> [...] | --todos');
    process.exit(1);
  }
  if (alvos[0] === '--todos') {
    const base = path.join(RAIZ, 'psicojaquelinesauer', 'posts');
    alvos = fs.readdirSync(base).map((d) => path.join(base, d, 'post.json')).filter((p) => fs.existsSync(p));
  }
  const browser = await chromium.launch();
  let falhas = 0;
  for (const a of alvos) {
    try { await renderPost(browser, a); } catch (e) { falhas++; console.error(`✗ ${a}: ${e.message}`); }
  }
  await browser.close();
  process.exit(falhas ? 1 : 0);
})();
