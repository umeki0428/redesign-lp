/* サイトの動き [DESIGN.md §85・§111]
   1. ふわっと出す表示（.rv → .in）
   2. ヘッダーのメニューと、いま見ているセクションの下線
   3. スマホの追従バー（MV を過ぎたら出す。フォームが見えているあいだは隠す）
   お問い合わせフォームの処理は assets/contact-form.js */

/* ===== 1. ふわっと出す ===== */
(function () {
  var items = document.querySelectorAll('.rv');
  if (!items.length) return;
  var show = function (el) { el.classList.add('in'); };
  if (!('IntersectionObserver' in window)) { items.forEach(show); return; }
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (!e.isIntersecting) return;
      show(e.target);
      io.unobserve(e.target);
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
  items.forEach(function (el) { io.observe(el); });
})();

/* ===== 2. ヘッダー：ハンバーガーのメニュー、いま見ているセクションに下線 ===== */
(function () {
  var MENU_MAX = '(min-width:1100px)';
  var btn = document.querySelector('.hd__burger'), menu = document.getElementById('hdMenu');
  if (!btn || !menu) return;
  var setOpen = function (open) {
    btn.setAttribute('aria-expanded', String(open));
    btn.setAttribute('aria-label', open ? 'メニューを閉じる' : 'メニューを開く');
    menu.hidden = !open;
    document.body.classList.toggle('is-menu', open);
  };
  btn.addEventListener('click', function () { setOpen(btn.getAttribute('aria-expanded') !== 'true'); });
  menu.addEventListener('click', function (e) { if (e.target.closest('a')) setOpen(false); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !menu.hidden) { setOpen(false); btn.focus(); } });
  window.matchMedia(MENU_MAX).addEventListener('change', function (m) { if (m.matches) setOpen(false); });

  if (!('IntersectionObserver' in window)) return;
  var links = [].slice.call(document.querySelectorAll('.hd__nav a'));
  var targets = links.map(function (a) { return document.querySelector(a.getAttribute('href')); });
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (!e.isIntersecting) return;
      links.forEach(function (a, i) { a.classList.toggle('is-cur', targets[i] === e.target); });
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  targets.forEach(function (t) { if (t) io.observe(t); });
})();

/* ===== 3. 追従バー ===== */
(function () {
  var bar = document.getElementById('bar'), mv = document.getElementById('mv'), form = document.getElementById('contact');
  if (!bar || !mv || !form) return;
  var state = { pastMv: false, onForm: false };
  var paint = function () { bar.classList.toggle('on', state.pastMv && !state.onForm); };
  if (!('IntersectionObserver' in window)) { state = { pastMv: true, onForm: false }; paint(); return; }
  new IntersectionObserver(function (entries) {
    entries.forEach(function (e) { state = { pastMv: !e.isIntersecting && e.boundingClientRect.top < 0, onForm: state.onForm }; });
    paint();
  }, { threshold: 0 }).observe(mv);
  new IntersectionObserver(function (entries) {
    entries.forEach(function (e) { state = { pastMv: state.pastMv, onForm: e.isIntersecting }; });
    paint();
  }, { rootMargin: '0px 0px -30% 0px', threshold: 0 }).observe(form);
})();
