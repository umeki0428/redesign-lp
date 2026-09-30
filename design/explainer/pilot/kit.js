// 説明動画の部品キット（場面2〜6で共通）。場面ごとの HTML は、この上で render(t) だけを書く
// 書き出しは ../render.py。window.__render(t)（Promise を返す）と window.__duration を使う

const Kit = (() => {
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const easeOut = t => 1 - Math.pow(1 - t, 3);
  const easeInOut = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  const prog = (t, t0, t1, e = easeOut) => t1 <= t0 ? (t >= t1 ? 1 : 0) : e(clamp((t - t0) / (t1 - t0), 0, 1));
  const E = id => document.getElementById(id);

  // ポップ: 0.27s で 1.12 倍 → 0.13s で 1.0
  function popScale(t, t0) {
    const a = t - t0;
    if (a < 0) return { o: 0, s: .7 };
    if (a < 0.27) return { o: clamp(a / 0.14, 0, 1), s: .7 + (1.12 - .7) * easeOut(a / 0.27) };
    if (a < 0.40) return { o: 1, s: 1.12 - 0.12 * easeOut((a - 0.27) / 0.13) };
    return { o: 1, s: 1 };
  }
  // 要素をポップで出す。tOut を渡すとそこから 0.25s で消える。extra は transform に足す文字列
  function put(el, t, t0, tOut = null, extra = '') {
    const p = popScale(t, t0);
    const out = tOut === null ? 1 : 1 - prog(t, tOut, tOut + 0.25, easeInOut);
    el.style.opacity = (p.o * out).toFixed(3);
    el.style.transform = `${extra} scale(${p.s.toFixed(3)})`;
  }
  // フェードで出す（跳ねない・0.17s）
  function fade(el, t, t0, tOut = null) {
    let o = prog(t, t0, t0 + 0.17);
    if (tOut !== null) o *= 1 - prog(t, tOut, tOut + 0.25, easeInOut);
    el.style.opacity = o.toFixed(3);
  }
  // 1文字ずつ（0.067s間隔）。accent は赤くする文字の [開始, 終了) の組
  function typeIn(el, text, t, t0, accent = []) {
    if (el.dataset.txt !== text) {
      el.dataset.txt = text;
      el.innerHTML = [...text].map(c => `<span style="display:inline-block">${c}</span>`).join('');
    }
    [...el.children].forEach((sp, i) => {
      const a = prog(t, t0 + i * 0.067, t0 + i * 0.067 + 0.18);
      sp.style.opacity = a.toFixed(3);
      sp.style.transform = `translateY(${(10 * (1 - a)).toFixed(1)}px)`;
      sp.style.color = accent.some(([s, e]) => i >= s && i < e) ? 'var(--accent)' : '';
    });
  }
  // SVG の線を t0→t1 で伸ばす。d は 0〜1 を受け取ってパス文字列を返す関数
  function grow(path, t, t0, t1, d) {
    const k = prog(t, t0, t1, easeInOut);
    // 伸び始める前は何も描かない（線端の丸だけが点で残らないように）
    path.setAttribute('d', k > 0 ? d(k) : '');
    return k;
  }
  // 章の頭のワイプ（右→左・0.4s）は、つなぐとき（../assemble.sh の xfade）に入れる。
  // 場面単体では前の章の色面を出さない。?wipe を付けると単体でも確認できる
  const SHOW_WIPE = new URLSearchParams(location.search).has('wipe');
  function wipe(el, t) {
    const k = prog(t, 0, 0.4, easeInOut);
    el.style.transform = `translateX(${(-1920 * k).toFixed(0)}px)`;
    el.style.opacity = SHOW_WIPE && k < 1 ? 1 : 0;
  }
  function caption(el, caps, t) {
    const c = caps.find(c => t >= c.t0 && t <= c.t1);
    el.textContent = c ? c.s : '';
  }

  // 丸バッジの人物: ?still を付けると静止画、付けなければ動画（../assets/motion/*.mp4）
  const MOTION = !new URLSearchParams(location.search).has('still');
  const clips = []; // {video, t0}
  function badge(id, name, t0) {
    const circle = document.querySelector(`#${id} .circle`);
    if (MOTION) {
      const v = document.createElement('video');
      v.src = `../assets/motion/${name}.mp4`;
      v.muted = true; v.preload = 'auto'; v.playsInline = true;
      circle.appendChild(v);
      clips.push({ video: v, t0 });
    } else {
      const img = document.createElement('img');
      img.src = `../assets/${name}.png`;
      circle.appendChild(img);
    }
  }
  // 動画は5秒なので、それより長い場面では往復させる（先頭→末尾→先頭…）
  function pingPong(time, dur) {
    if (dur <= 0 || time <= 0) return 0;
    const k = time % (2 * dur);
    return k <= dur ? k : 2 * dur - k;
  }
  function seek(v, time) {
    const dur = Math.max(0, (v.duration || 0) - 0.05);
    const target = pingPong(time, dur);
    if (Math.abs(v.currentTime - target) < 0.001) return Promise.resolve();
    return new Promise(res => { v.addEventListener('seeked', res, { once: true }); v.currentTime = target; });
  }
  // 場面の render(t) を登録する
  function start(render, duration) {
    window.__duration = duration;
    window.__render = async t => {
      render(t);
      await Promise.all(clips.map(c => seek(c.video, t - c.t0)));
    };
    render(0);
  }

  return { clamp, easeOut, easeInOut, prog, E, put, fade, typeIn, grow, wipe, caption, badge, start };
})();
