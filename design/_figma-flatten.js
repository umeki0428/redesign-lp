// HTML→Figma変換の前処理
// 手順: アニメ停止/リビール解除 → 疑似要素の実DOM化 → clip-pathのSVG化 → 算出スタイルのインライン化
window.__flatten = function () {
  const PROPS = [
    'display','position','top','right','bottom','left','z-index','float','clear',
    'width','height','min-width','min-height','max-width','max-height','box-sizing','aspect-ratio',
    'margin-top','margin-right','margin-bottom','margin-left',
    'padding-top','padding-right','padding-bottom','padding-left',
    'flex-direction','flex-wrap','flex-grow','flex-shrink','flex-basis','order',
    'justify-content','align-items','align-content','align-self','gap','row-gap','column-gap',
    'grid-template-columns','grid-template-rows','grid-column','grid-row','grid-auto-flow','grid-auto-rows',
    'font-family','font-size','font-weight','font-style','line-height','letter-spacing','text-align',
    'text-decoration-line','text-transform','white-space','word-break','overflow-wrap','writing-mode',
    'color','background-color','background-image','background-size','background-position','background-repeat',
    'border-top-width','border-right-width','border-bottom-width','border-left-width',
    'border-top-style','border-right-style','border-bottom-style','border-left-style',
    'border-top-color','border-right-color','border-bottom-color','border-left-color',
    'border-top-left-radius','border-top-right-radius','border-bottom-right-radius','border-bottom-left-radius',
    'box-shadow','opacity','overflow-x','overflow-y','list-style-type','vertical-align',
    'object-fit','object-position','mix-blend-mode'
  ];
  // SVG内部要素はプレゼンテーション属性を確定させる
  const SVG_PROPS = ['fill','fill-opacity','fill-rule','stroke','stroke-width','stroke-dasharray',
    'stroke-dashoffset','stroke-linecap','stroke-linejoin','stroke-opacity','opacity','transform-origin'];

  const isInSvg = el => el.ownerSVGElement != null || el.tagName === 'svg';

  // 1) アニメーション停止・リビール解除
  const st = document.createElement('style');
  st.textContent = '*,*::before,*::after{animation:none !important;transition:none !important;}';
  document.head.appendChild(st);
  document.querySelectorAll('body *').forEach(el => {
    const s = getComputedStyle(el);
    if (parseFloat(s.opacity) === 0) el.style.setProperty('opacity','1','important');
    if (s.transform && s.transform !== 'none' && !isInSvg(el)) el.style.setProperty('transform','none','important');
    if (s.visibility === 'hidden') el.style.setProperty('visibility','visible','important');
  });

  // 2) 疑似要素を実DOMへ（clip-path も引き継ぐ。後段でSVG化される）
  let pseudoCount = 0;
  [...document.querySelectorAll('body *')].forEach(el => {
    if (isInSvg(el)) return;
    ['::before','::after'].forEach(pos => {
      const cs = getComputedStyle(el, pos);
      if (!cs || cs.content === 'none' || cs.content === 'normal' || cs.display === 'none') return;
      const span = document.createElement('span');
      span.setAttribute('data-pseudo', pos.replace(/:/g,''));
      let css = '';
      PROPS.forEach(p => { const v = cs.getPropertyValue(p); if (v) css += `${p}:${v};`; });
      const cp = cs.getPropertyValue('clip-path');
      if (cp && cp !== 'none') css += `clip-path:${cp};`;
      const tf = cs.getPropertyValue('transform');
      if (tf && tf !== 'none') css += `transform:${tf};`;
      span.style.cssText = css;
      const c = cs.content;
      if (c && c !== '""' && c !== "''" && !c.startsWith('url')) {
        span.textContent = c.replace(/^["']|["']$/g,'');
      }
      if (pos === '::before') el.insertBefore(span, el.firstChild); else el.appendChild(span);
      pseudoCount++;
    });
  });

  // 3) clip-path:polygon をインラインSVGへ（塗りが取れないものは変換せず温存）
  let clipCount = 0, clipSkipped = 0;
  [...document.querySelectorAll('body *')].forEach(el => {
    if (isInSvg(el)) return;
    const cs = getComputedStyle(el);
    const cp = cs.clipPath;
    if (!cp || cp === 'none' || !cp.startsWith('polygon')) return;
    const r = el.getBoundingClientRect();
    const bg = cs.backgroundColor;
    // 塗りが透明なものは形が判定できないので触らない（黒く塗り潰す事故を防ぐ）
    if (r.width < 1 || r.height < 1 || !bg || bg === 'rgba(0, 0, 0, 0)') { clipSkipped++; return; }
    const pts = cp.replace(/^polygon\(|\)$/g,'').split(',').map(p => {
      const t = p.trim().split(/\s+/);
      const toPct = (v, size) => v.endsWith('%') ? parseFloat(v) : (parseFloat(v)/size)*100;
      return `${toPct(t[0], r.width)},${toPct(t[1], r.height)}`;
    }).join(' ');
    const svg = document.createElementNS('http://www.w3.org/2000/svg','svg');
    svg.setAttribute('viewBox','0 0 100 100');
    svg.setAttribute('preserveAspectRatio','none');
    svg.setAttribute('data-from-clip-path','1');
    svg.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;display:block;overflow:visible;';
    const poly = document.createElementNS('http://www.w3.org/2000/svg','polygon');
    poly.setAttribute('points', pts);
    poly.setAttribute('fill', bg);
    svg.appendChild(poly);
    el.style.setProperty('clip-path','none','important');
    el.style.setProperty('background-color','transparent','important');
    if (cs.position === 'static') el.style.setProperty('position','relative');
    el.insertBefore(svg, el.firstChild);
    clipCount++;
  });

  // 4) 算出スタイルのインライン化
  let styled = 0, svgStyled = 0;
  [...document.querySelectorAll('body *')].forEach(el => {
    if (el.tagName === 'SCRIPT' || el.tagName === 'STYLE') return;
    const cs = getComputedStyle(el);
    if (isInSvg(el)) {
      // SVG: 塗り・線をプレゼンテーション属性として固定（CSS除去後も保持されるように）
      SVG_PROPS.forEach(p => {
        const v = cs.getPropertyValue(p);
        if (v && v !== 'none' || p === 'fill') {
          if (v) el.setAttribute(p, v);
        }
      });
      svgStyled++;
      return;
    }
    let css = '';
    PROPS.forEach(p => { const v = cs.getPropertyValue(p); if (v) css += `${p}:${v};`; });
    el.style.cssText = css + el.style.cssText;
    styled++;
  });

  // 5) スタイルシート・スクリプトを除去（すべてインライン化済み）
  document.querySelectorAll('style,script').forEach(n => n.remove());
  document.querySelectorAll('body *').forEach(el => el.removeAttribute('class'));

  return { pseudoCount, clipCount, clipSkipped, styled, svgStyled };
};
