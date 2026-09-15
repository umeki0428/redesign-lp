// コード → Figma 反映（DESIGN.md §39 / §42）：ブラウザで実測して、Figma に置くノードの一覧を JSON で書き出す。
// usage: node extract.mjs <url> <out.json> <sectionSelector> [extraRootSelector,...]
//   例: node extract.mjs http://127.0.0.1:8137/design/v13/index.html s1.json '#s1' header.hd
// 1440×1000 で描画 → 全体をスクロールしてリビールを発火 → セクション先頭に戻す → アニメーションを止めて計測。
// 出すノード: rect（面・枠・影）/ text（1 行ずつ、または折り返し）/ svg（インライン SVG と .svg 画像。スタイルを属性に焼き込む）/ img（PNG。Figma 側で既存の画像ハッシュを当てる）
import { chromium } from 'playwright';
import { writeFileSync } from 'node:fs';

const [url, out, sel, ...extraRoots] = process.argv.slice(2);
if (!url || !out || !sel) { console.error('usage: node extract.mjs <url> <out.json> <selector> [extraRoot,...]'); process.exit(1); }

const br = await chromium.launch();
const pg = await br.newPage({ viewport: { width: 1440, height: 1000 } });
await pg.goto(url, { waitUntil: 'networkidle' });
await pg.evaluate(() => document.fonts.ready);

// リビールを全部発火させてから、対象セクションの先頭へ
const total = await pg.evaluate(() => document.documentElement.scrollHeight);
for (let y = 0; y < total; y += 300) { await pg.evaluate(y => window.scrollTo(0, y), y); await pg.waitForTimeout(40); }
await pg.evaluate(sel => {
  const el = document.querySelector(sel);
  window.scrollTo(0, Math.max(0, el.getBoundingClientRect().top + window.scrollY));
}, sel);
await pg.waitForTimeout(300);
// 動きを止める。トランジションは最終値、アニメーションは初期値で固定される
await pg.addStyleTag({ content: '*,*::before,*::after{animation:none!important;transition:none!important}' });
await pg.waitForTimeout(200);

const data = await pg.evaluate(async ({ sel, extraRoots }) => {
  const COPY = ['display', 'position', 'top', 'right', 'bottom', 'left', 'width', 'height', 'min-width', 'min-height', 'margin', 'padding',
    'background-color', 'border-radius', 'box-shadow', 'opacity', 'transform', 'transform-origin',
    'border-top-width', 'border-right-width', 'border-bottom-width', 'border-left-width',
    'border-top-style', 'border-right-style', 'border-bottom-style', 'border-left-style',
    'border-top-color', 'border-right-color', 'border-bottom-color', 'border-left-color',
    'font-family', 'font-size', 'font-weight', 'line-height', 'letter-spacing', 'color', 'text-align', 'flex', 'flex-shrink', 'order',
    'align-self', 'vertical-align', 'white-space', 'box-sizing', 'z-index'];

  /* 1) 擬似要素を実体の span にしてから計測する（ラベルの短線、チェック印、引用符、ブラウザ枠） */
  const root = document.querySelector(sel);
  const roots = [root].concat(extraRoots.map(s => document.querySelector(s)).filter(Boolean));
  const all = [];
  roots.forEach(r => { all.push(r); all.push(...r.querySelectorAll('*')); });
  all.forEach(el => {
    if (el.namespaceURI !== 'http://www.w3.org/1999/xhtml') return;
    ['::before', '::after'].forEach(ps => {
      const cs = getComputedStyle(el, ps);
      if (!cs.content || cs.content === 'none' || cs.content === 'normal') return;
      if (cs.display === 'none') return;
      const sp = document.createElement('span');
      sp.setAttribute('data-pseudo', ps.slice(2));
      COPY.forEach(p => sp.style.setProperty(p, cs.getPropertyValue(p)));
      const m = /^"(.*)"$/.exec(cs.content);
      if (m && m[1]) sp.textContent = m[1].replace(/\\([0-9a-fA-F]{1,6})\s?/g, (_, h) => String.fromCodePoint(parseInt(h, 16)));
      if (ps === '::before') el.insertBefore(sp, el.firstChild); else el.appendChild(sp);
      el.setAttribute('data-hp', '');
    });
  });
  const st = document.createElement('style');
  st.textContent = '[data-hp]::before,[data-hp]::after{content:none !important}';
  document.head.appendChild(st);
  await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));

  const R = root.getBoundingClientRect();
  const ox = R.left, oy = R.top;
  const rnd = v => Math.round(v * 100) / 100;
  const nodes = [];

  const parseColor = s => {
    const m = /rgba?\(([^)]+)\)/.exec(s || '');
    if (!m) return null;
    const a = m[1].split(',').map(v => parseFloat(v));
    const c = [a[0], a[1], a[2], a.length > 3 ? a[3] : 1];
    return c[3] <= 0 ? null : c;
  };
  const px = v => parseFloat(v) || 0;
  const shadows = v => {
    // "rgba(...) 0px 24px 48px -32px, inset rgba(...) 0px 0px 0px 1px" → 外側の影と、inset の枠
    const out = { drop: [], inset: [] };
    if (!v || v === 'none') return out;
    const parts = v.split(/,(?![^(]*\))/);
    parts.forEach(p => {
      const inset = /inset/.test(p);
      const c = parseColor(p);
      const nums = p.replace(/rgba?\([^)]+\)/, '').replace('inset', '').trim().split(/\s+/).map(px);
      if (!c) return;
      const s = { c, x: nums[0] || 0, y: nums[1] || 0, b: nums[2] || 0, s: nums[3] || 0 };
      (inset ? out.inset : out.drop).push(s);
    });
    return out;
  };
  const famOf = s => (s || '').split(',')[0].replace(/["']/g, '').trim();
  const inView = (x, y, w, h) => x < R.width && x + w > 0 && y < R.height + 2000 && y + h > -2000;

  const nameOf = el => {
    const c = (el.getAttribute && el.getAttribute('class') || '').split(/\s+/).filter(k => k && k !== 'rv' && k !== 'in' && k !== 'on' && k !== 'grp')[0];
    return (el.getAttribute && el.getAttribute('data-pseudo')) ? (nameOf(el.parentElement) + '::' + el.getAttribute('data-pseudo')) : (c || el.tagName.toLowerCase());
  };

  /* SVG：計算済みスタイルを属性に焼き込む。pathLength=1 の描画用破線は「描き終わった状態」に直す。長さ 0 の点は円に */
  const SVG_PROPS = ['fill', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin', 'stroke-dasharray', 'stroke-dashoffset', 'opacity', 'fill-opacity', 'stroke-opacity'];
  const bakeSvg = (svg, w, h) => {
    const c = svg.cloneNode(true);
    const src = [svg, ...svg.querySelectorAll('*')];
    const dst = [c, ...c.querySelectorAll('*')];
    src.forEach((s, i) => {
      const d = dst[i];
      const cs = getComputedStyle(s);
      if (getComputedStyle(s).display === 'none' || cs.visibility === 'hidden') { d.setAttribute('display', 'none'); return; }
      SVG_PROPS.forEach(p => { const v = cs.getPropertyValue(p); if (v) d.setAttribute(p, v.replace(/px/g, '')); });
      d.removeAttribute('class'); d.removeAttribute('style'); d.removeAttribute('vector-effect');
      ['aria-label', 'aria-hidden', 'role'].forEach(a => d.removeAttribute(a));
      if (d.tagName === 'style') { d.remove(); return; }
      if (d.getAttribute('stroke-dasharray') && !/[ ,]/.test(d.getAttribute('stroke-dasharray').trim())) d.removeAttribute('stroke-dasharray');
      if (d.getAttribute('stroke') === 'none') d.removeAttribute('stroke-dasharray');
      if (s.hasAttribute('pathLength')) {
        d.removeAttribute('pathLength');
        // 描画用: dasharray 1 / dashoffset 0 → 実線
        d.removeAttribute('stroke-dasharray'); d.removeAttribute('stroke-dashoffset');
      }
      if (d.getAttribute('stroke-dashoffset') === '0' || d.getAttribute('stroke-dashoffset') === '0px') d.removeAttribute('stroke-dashoffset');
      const da = (cs.getPropertyValue('stroke-dasharray') || '').split(/[ ,]+/).map(px);
      if (s.tagName === 'line' && da.length >= 2 && da[0] < 0.1 && cs.getPropertyValue('stroke-linecap') === 'round') {
        // 長さ 0 の破線＋丸いキャップ＝点の列。Figma の SVG 取り込みで点にならないので、円を並べる
        const x1 = px(s.getAttribute('x1')), y1 = px(s.getAttribute('y1')), x2 = px(s.getAttribute('x2')), y2 = px(s.getAttribute('y2'));
        const L = Math.hypot(x2 - x1, y2 - y1), step = da[0] + da[1], r = px(cs.getPropertyValue('stroke-width')) / 2;
        const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        g.setAttribute('fill', cs.getPropertyValue('stroke')); g.setAttribute('opacity', cs.getPropertyValue('opacity'));
        for (let t = 0; t <= L; t += step) {
          const ci = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
          ci.setAttribute('cx', String(x1 + (x2 - x1) * t / L)); ci.setAttribute('cy', String(y1 + (y2 - y1) * t / L)); ci.setAttribute('r', String(r));
          g.appendChild(ci);
        }
        d.replaceWith(g); return;
      }
      if (s.tagName === 'line' && Math.abs(px(s.getAttribute('x2')) - px(s.getAttribute('x1'))) < 0.1 && Math.abs(px(s.getAttribute('y2')) - px(s.getAttribute('y1'))) < 0.1) {
        // 長さ 0 の線（丸いキャップの点）→ 円
        const r = px(cs.getPropertyValue('stroke-width')) / 2;
        const ci = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        ci.setAttribute('cx', s.getAttribute('x1')); ci.setAttribute('cy', s.getAttribute('y1')); ci.setAttribute('r', String(r));
        ci.setAttribute('fill', cs.getPropertyValue('stroke')); ci.setAttribute('opacity', cs.getPropertyValue('opacity'));
        d.replaceWith(ci);
      }
    });
    c.setAttribute('width', String(w)); c.setAttribute('height', String(h));
    c.removeAttribute('preserveAspectRatio'); c.setAttribute('overflow', 'visible');
    c.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    return c.outerHTML.replace(/>\s+</g, '><');
  };
  const fetchSvg = async (src, w, h) => {
    const t = await (await fetch(src)).text();
    const host = document.createElement('div');
    host.style.cssText = 'position:absolute;left:-99999px;top:0;width:' + w + 'px;height:' + h + 'px';
    host.innerHTML = t;
    document.body.appendChild(host);
    const s = host.querySelector('svg');
    const outHtml = bakeSvg(s, w, h);
    host.remove();
    return outHtml;
  };

  /* テキスト：テキストノード単位。1 行なら行の実測位置に、折り返すならブロック幅で折り返しノードに */
  const emitText = (tn, el, eff) => {
    const cs = getComputedStyle(el);
    const rg = document.createRange(); rg.selectNodeContents(tn);
    const rects = Array.from(rg.getClientRects()).filter(r => r.width > 0 && r.height > 0);
    if (!rects.length) return;
    const size = px(cs.fontSize);
    const lh = cs.lineHeight === 'normal' ? size * 1.2 : px(cs.lineHeight);
    const ls = cs.letterSpacing === 'normal' ? 0 : px(cs.letterSpacing);
    const col = parseColor(cs.color); if (!col) return;
    const font = { f: famOf(cs.fontFamily), w: parseInt(cs.fontWeight, 10) || 400, s: rnd(size), lh: rnd(lh), ls: rnd(ls) };
    const base = { k: 't', font, c: col, op: rnd(eff), al: cs.textAlign, name: nameOf(el) };
    const text = tn.textContent.replace(/\s+/g, ' ');
    const lineTop = r => r.top - (lh - r.height) / 2;
    if (rects.length === 1) {
      const r = rects[0];
      nodes.push({ ...base, t: text.trim(), x: rnd(r.left - ox), y: rnd(lineTop(r) - oy) });
      return;
    }
    // 複数行。ブロックの左端から始まっていれば折り返しノード、途中から始まる（前に太字などがある）なら 1 行ずつ
    const er = el.getBoundingClientRect();
    const cl = er.left + px(cs.paddingLeft), cw = er.width - px(cs.paddingLeft) - px(cs.paddingRight);
    const first = rects[0];
    const startsAtLeft = cs.textAlign === 'center' || cs.textAlign === 'right' || Math.abs(first.left - cl) < 2;
    if (startsAtLeft && cs.display !== 'inline') {
      nodes.push({ ...base, t: text.trim(), x: rnd(cl - ox), y: rnd(lineTop(first) - oy), w: rnd(cw) });
      return;
    }
    // 1 文字ずつ行を判定
    const s = tn.textContent; let line = '', lt = null, lr = null;
    const flush = () => { if (line.trim()) nodes.push({ ...base, t: line.replace(/\s+/g, ' ').trim(), x: rnd(lr.left - ox), y: rnd(lineTop(lr) - oy) }); line = ''; lr = null; };
    for (let i = 0; i < s.length; i++) {
      const cr = document.createRange(); cr.setStart(tn, i); cr.setEnd(tn, i + 1);
      const r = cr.getBoundingClientRect(); if (r.width === 0 && r.height === 0) { line += s[i]; continue; }
      if (lt !== null && Math.abs(r.top - lt) > 2) flush();
      if (!lr) { lr = { left: r.left, top: r.top, height: r.height }; lt = r.top; }
      line += s[i];
    }
    flush();
  };

  const walk = async (el, acc) => {
    if (el.nodeType !== 1) return;
    const tag = el.tagName.toLowerCase();
    if (['script', 'style', 'noscript', 'br'].includes(tag)) return;
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') return;
    const own = parseFloat(cs.opacity); const eff = acc * (isNaN(own) ? 1 : own);
    if (eff < 0.02) return;

    const br = el.getBoundingClientRect();
    let box = { x: br.left - ox, y: br.top - oy, w: br.width, h: br.height };
    let rot = 0;
    const m = /matrix\(([^)]+)\)/.exec(cs.transform || '');
    if (m) { const a = m[1].split(',').map(Number); rot = Math.round(Math.atan2(a[1], a[0]) * 18000 / Math.PI) / 100; }
    if (Math.abs(rot) > 0.01 && el.offsetWidth) {
      const cx = br.left + br.width / 2, cy = br.top + br.height / 2;
      box = { x: cx - el.offsetWidth / 2 - ox, y: cy - el.offsetHeight / 2 - oy, w: el.offsetWidth, h: el.offsetHeight };
    }
    if (!inView(box.x, box.y, box.w, box.h)) return;

    if (tag === 'svg') {
      nodes.push({ k: 's', x: rnd(box.x), y: rnd(box.y), w: rnd(box.w), h: rnd(box.h), svg: bakeSvg(el, box.w, box.h), op: rnd(eff), name: nameOf(el) });
      return;
    }
    if (tag === 'img') {
      const bg = parseColor(cs.backgroundColor);
      if (bg) nodes.push({ k: 'r', x: rnd(box.x), y: rnd(box.y), w: rnd(box.w), h: rnd(box.h), f: bg, el: cs.borderRadius.startsWith('50%') || px(cs.borderRadius) >= box.w / 2, op: rnd(eff), name: nameOf(el) + '-bg', sh: shadows(cs.boxShadow).drop });
      const src = el.currentSrc || el.src;
      if (/\.svg(\?|$)/.test(src)) nodes.push({ k: 's', x: rnd(box.x), y: rnd(box.y), w: rnd(box.w), h: rnd(box.h), svg: await fetchSvg(src, box.w, box.h), op: rnd(eff), name: nameOf(el) });
      else {
        const pc = getComputedStyle(el.parentElement);
        const rs = (pc.overflow !== 'visible' && px(cs.borderTopLeftRadius) === 0) ? pc : cs;
        nodes.push({ k: 'i', x: rnd(box.x), y: rnd(box.y), w: rnd(box.w), h: rnd(box.h), file: src.split('/').pop(), rad: [px(rs.borderTopLeftRadius), px(rs.borderTopRightRadius), px(rs.borderBottomRightRadius), px(rs.borderBottomLeftRadius)], op: rnd(eff), name: nameOf(el) + ' ' + src.split('/').pop().replace(/\.\w+$/, '') });
      }
      return;
    }

    // 面・枠・影
    const fill = parseColor(cs.backgroundColor);
    const bw = [cs.borderTopWidth, cs.borderRightWidth, cs.borderBottomWidth, cs.borderLeftWidth].map(px);
    const bc = [cs.borderTopColor, cs.borderRightColor, cs.borderBottomColor, cs.borderLeftColor].map(parseColor);
    const bs = [cs.borderTopStyle, cs.borderRightStyle, cs.borderBottomStyle, cs.borderLeftStyle];
    let bi = -1; for (let i = 0; i < 4; i++) if (bw[i] > 0 && bc[i] && bs[i] !== 'none') { bi = i; break; }
    const sh = shadows(cs.boxShadow);
    let stroke = null;
    if (bi >= 0) stroke = { c: bc[bi], w: bw.map((w, i) => (bc[i] && bs[i] !== 'none') ? w : 0), d: bs[bi] === 'dashed' };
    else if (sh.inset.length) { const s = sh.inset[0]; if (s.s > 0 && s.b === 0) stroke = { c: s.c, w: [s.s, s.s, s.s, s.s], d: false }; }
    if ((fill || stroke || sh.drop.length) && box.w > 0 && box.h > 0) {
      const rad = [cs.borderTopLeftRadius, cs.borderTopRightRadius, cs.borderBottomRightRadius, cs.borderBottomLeftRadius].map(v => v.endsWith('%') ? Math.min(box.w, box.h) * px(v) / 100 : px(v));
      const isEl = Math.abs(box.w - box.h) < 1.5 && rad[0] >= box.w / 2 - 0.5;
      nodes.push({ k: 'r', x: rnd(box.x), y: rnd(box.y), w: rnd(box.w), h: rnd(box.h), f: fill, rad: rad.map(rnd), el: isEl, st: stroke, sh: sh.drop, rot, op: rnd(eff), name: nameOf(el) });
    }
    // 子。テキストノードと要素を文書順に
    for (const ch of Array.from(el.childNodes)) {
      if (ch.nodeType === 3) { if (ch.textContent.trim()) emitText(ch, el, eff); }
      else await walk(ch, eff);
    }
  };
  for (const r of roots) await walk(r, 1);
  return { w: rnd(R.width), h: rnd(R.height), nodes };
}, { sel, extraRoots });

writeFileSync(out, JSON.stringify(data));
console.log(out, data.w + 'x' + data.h, data.nodes.length + ' nodes',
  'rect ' + data.nodes.filter(n => n.k === 'r').length, 'text ' + data.nodes.filter(n => n.k === 't').length,
  'svg ' + data.nodes.filter(n => n.k === 's').length, 'img ' + data.nodes.filter(n => n.k === 'i').length);
await br.close();
