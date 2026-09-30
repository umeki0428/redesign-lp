/* B案（b.html）の動き [DESIGN.md §77・§79]
   1. ふわっと出す表示（.rv → .in）
   2. ヘッダーのメニューと、いま見ているセクションの下線（A案と同じ）
   3. スマホの追従バー（MV を過ぎたら出す。フォームが見えているあいだは隠す）
   4. ホームページ診断（4 問 → おすすめの進め方。結果をフォームに引き継ぐ）
   5. お問い合わせフォーム（A案と同じ処理・同じ送信先。§54・§68） */

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

/* ===== 2. ヘッダー：ハンバーガーのメニュー、いま見ているセクションに下線 [§66] ===== */
(function () {
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
  window.matchMedia('(min-width:1100px)').addEventListener('change', function (m) { if (m.matches) setOpen(false); });

  var links = [].slice.call(document.querySelectorAll('.hd__nav a'));
  var targets = links.map(function (a) { return document.querySelector(a.getAttribute('href')); });
  if (!('IntersectionObserver' in window)) return;
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
  var bar = document.getElementById('bar'), mv = document.getElementById('s1'), form = document.getElementById('s12');
  if (!bar || !mv || !form) return;
  var pastMv = false, onForm = false;
  var paint = function () { bar.classList.toggle('on', pastMv && !onForm); };
  if (!('IntersectionObserver' in window)) { pastMv = true; paint(); return; }
  new IntersectionObserver(function (entries) {
    entries.forEach(function (e) { pastMv = !e.isIntersecting && e.boundingClientRect.top < 0; });
    paint();
  }, { threshold: 0 }).observe(mv);
  new IntersectionObserver(function (entries) {
    entries.forEach(function (e) { onForm = e.isIntersecting; });
    paint();
  }, { rootMargin: '0px 0px -30% 0px', threshold: 0 }).observe(form);
})();

/* ===== 4. ホームページ診断 [§79] =====
   金額と納期は §8 の目安と同じ。結果は「わが社の結果」として手元に残し（保有効果）、ボタンでフォームに引き継ぐ */
(function () {
  var form = document.getElementById('diag'), result = document.getElementById('diagResult'), hint = document.getElementById('diagHint');
  if (!form || !result) return;
  var QUESTIONS = ['status', 'purpose', 'pages', 'when'];
  var LABELS = {
    status: { none: 'まだない', old: 'あるが、古い', issue: 'あるが、成果が出ていない' },
    purpose: { inquiry: '問い合わせを増やす', recruit: '採用', sell: '商品を売る', card: '会社の信頼を示す' },
    pages: { '1': '1ページ', '5': '〜5ページ', '10': '〜10ページ', '11': '10ページ以上' },
    when: { rush: '1か月以内', soon: '1〜2か月', later: '3か月以上先', tbd: '未定' }
  };
  var PLANS = {
    lp:    { name: 'LP制作', price: '15万円〜', time: '約3〜4週間', kind: 'LP（広告・商品紹介の1ページ）' },
    card:  { name: '名刺代わりのホームページ', price: '15万円〜', time: '約3〜4週間', kind: '名刺代わりのサイト（1〜3ページ）' },
    small: { name: '小規模ホームページ', price: '30万円〜', time: '約1.5〜2か月', kind: '小規模サイト（〜5ページ）' },
    corp:  { name: 'コーポレート・サービスサイト', price: '50万円〜', time: '約2〜3か月', kind: 'コーポレートサイト（〜10ページ・更新機能つき）' },
    large: { name: 'コーポレート・サービスサイト', price: '50万円〜（ページ数により個別お見積り）', time: '約2〜3か月〜', kind: 'コーポレートサイト（〜10ページ・更新機能つき）' },
    ec:    { name: 'ECサイト', price: '都度お見積り', time: '内容により異なります', kind: 'ECサイト・その他' }
  };
  var FIRST = {
    inquiry: '「誰に、何を伝えるか」を整理する',
    recruit: '求める人物像と、伝える強みを整理する',
    sell: '売りたい商品と、購入までの導線を整理する',
    card: '会社情報と、信頼につながる要素を整理する'
  };
  var NOTE_STATUS = {
    none: 'まずは必要なページだけで公開し、反応を見ながら育てる進め方もできます。',
    old: '今のサイトの良い点は残し、伝わっていない部分から直します。',
    issue: '成果が出ていない原因を整理してから、直す範囲を決めます。'
  };
  var NOTE_WHEN = {
    rush: 'お急ぎの場合は、範囲を絞って先に公開する進め方をご提案します。',
    soon: '1〜2か月なら、LPや小規模ホームページの納期に合います。',
    later: '時間があるので、事業の整理からじっくり進められます。',
    tbd: '公開時期が未定でも、相談は始められます。'
  };

  var answers = function () {
    var a = {};
    QUESTIONS.forEach(function (q) { var el = form.querySelector('[name="' + q + '"]:checked'); a[q] = el ? el.value : ''; });
    return a;
  };
  var choosePlan = function (a) {
    if (a.purpose === 'sell') return PLANS.ec;
    if (a.pages === '1') return a.purpose === 'card' ? PLANS.card : PLANS.lp;
    if (a.pages === '5') return PLANS.small;
    if (a.pages === '10') return PLANS.corp;
    return PLANS.large;
  };
  var current = null;
  var render = function () {
    var a = answers();
    var done = QUESTIONS.every(function (q) { return a[q]; });
    if (!done) {
      result.hidden = true; current = null;
      var n = QUESTIONS.filter(function (q) { return a[q]; }).length;
      hint.textContent = n ? 'あと ' + (QUESTIONS.length - n) + ' つ選ぶと、結果が出ます。' : '4つすべて選ぶと、結果が出ます。';
      return;
    }
    var plan = choosePlan(a);
    current = { plan: plan, answers: a };
    document.getElementById('rPlan').textContent = plan.name;
    document.getElementById('rPrice').textContent = plan.price;
    document.getElementById('rTime').textContent = plan.time;
    document.getElementById('rFirst').textContent = FIRST[a.purpose];
    var notes = document.getElementById('rNotes');
    notes.textContent = '';
    [NOTE_STATUS[a.status], NOTE_WHEN[a.when]].forEach(function (t) { var li = document.createElement('li'); li.textContent = t; notes.appendChild(li); });
    hint.textContent = '結果が出ました。選び直すと、結果も変わります。';
    var wasHidden = result.hidden;
    result.hidden = false;
    if (wasHidden) result.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  };
  form.addEventListener('change', render);

  /* 結果をフォームへ：つくりたいものを選択済みにし、相談内容に要約を入れる */
  document.getElementById('diagToForm').addEventListener('click', function () {
    if (!current) return;
    var a = current.answers, plan = current.plan;
    var kind = document.querySelector('#ctForm [name="kind"][value="' + plan.kind + '"]');
    if (kind) { kind.checked = true; kind.dispatchEvent(new Event('change', { bubbles: true })); }
    var msg = document.getElementById('ctMsg');
    if (msg && !msg.value.trim()) {
      msg.value = ['【ホームページ診断の結果】', 'おすすめ：' + plan.name + '（目安 ' + plan.price + '）',
        '今のホームページ：' + LABELS.status[a.status], '目的：' + LABELS.purpose[a.purpose],
        'ページ数：' + LABELS.pages[a.pages], '公開したい時期：' + LABELS.when[a.when], '', 'この内容で相談したいです。'].join('\n');
    }
    document.getElementById('s12').scrollIntoView({ behavior: 'smooth' });
    setTimeout(function () { var n = document.getElementById('ctName'); if (n) n.focus({ preventScroll: true }); }, 700);
  });
})();

/* ===== 5. お問い合わせ：入力の確認、Google フォームへの送信、サンクスページへ（§54・§68）=====
   送信先と entry ID は gas/ の setupContactForm が出力した値。A案（index.html）と同じ。選択肢の文言は gas/config.gs と一字一句そろえる */
var CONTACT_FORM = {
  action: 'https://docs.google.com/forms/d/e/1FAIpQLSeluzyi08uUEk9Y3kDNOly3p9OM4HBZdKf-xOuiHJifl5Q8Qg/formResponse',
  entries: { kind: 'entry.1686821301', name: 'entry.841739636', org: 'entry.282699455', email: 'entry.519150214',
             url: 'entry.160571641', budget: 'entry.1083968863', extras: 'entry.848307915', message: 'entry.1231923885', source: 'entry.676258905' },
  thanksUrl: 'thanks.html'
};

/* 流入元：最初に来たときの utm・gclid・参照元をセッションに残す。page に b.html が入るので、シートで A・B を分けられる */
var contactSource = (function () {
  var KEY = 'rd_first_touch', PARAMS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'gclid'];
  var read = function () { try { return JSON.parse(sessionStorage.getItem(KEY) || 'null'); } catch (e) { return null; } };
  var q = new URLSearchParams(location.search);
  var found = PARAMS.filter(function (k) { return q.get(k); }).map(function (k) { return k + '=' + q.get(k); });
  if (!read() || found.length) {
    var first = { params: found.join('&'), referrer: document.referrer || '' };
    try { sessionStorage.setItem(KEY, JSON.stringify(first)); } catch (e) { /* 保存できない環境では送信時の値だけを使う */ }
  }
  return function () {
    var first = read() || { params: found.join('&'), referrer: document.referrer || '' };
    return ['params: ' + (first.params || '（なし）'), 'referrer: ' + (first.referrer || '（なし）'), 'page: ' + location.origin + location.pathname].join('\n');
  };
})();

(function () {
  var form = document.getElementById('ctForm');
  if (!form) return;
  var note = document.getElementById('ctNote'), btn = form.querySelector('.ct__btn');
  var DEFAULT_NOTE = note.textContent, BTN_HTML = btn.innerHTML;
  var MESSAGES = { kind: 'つくりたいものをお選びください。', name: 'お名前をご入力ください。', email: 'メールアドレスを正しい形式でご入力ください。', message: 'ご相談内容をご入力ください。' };
  var setSending = function (on) { btn.disabled = on; btn.innerHTML = on ? '送信しています…' : BTN_HTML; };
  var showNote = function (text, isError) { note.textContent = text; note.style.color = isError ? '#d93832' : ''; };

  var fieldOf = function (el) { return el.closest('.fld'); };
  var setFieldError = function (el, text) {
    var fld = fieldOf(el), id = (fld.id || el.id) + 'Err', err = document.getElementById(id);
    fld.classList.toggle('is-err', !!text);
    [].slice.call(fld.querySelectorAll('input,select,textarea')).forEach(function (f) {
      if (text) { f.setAttribute('aria-invalid', 'true'); f.setAttribute('aria-describedby', id); }
      else { f.removeAttribute('aria-invalid'); if (f.getAttribute('aria-describedby') === id) f.removeAttribute('aria-describedby'); }
    });
    if (!text) { if (err) err.remove(); return; }
    if (!err) { err = document.createElement('p'); err.className = 'fld__err'; err.id = id; fld.appendChild(err); }
    err.textContent = text;
  };
  var invalidFields = function () {
    var seen = {};
    return [].slice.call(form.querySelectorAll('input:not([name=hp]),select,textarea')).filter(function (f) {
      if (seen[f.name]) return false;
      var bad = !f.checkValidity() || (f.required && !f.value.trim());
      if (bad) seen[f.name] = true;
      return bad;
    });
  };
  form.addEventListener('input', function (e) { if (fieldOf(e.target) && fieldOf(e.target).classList.contains('is-err')) setFieldError(e.target, ''); });
  form.addEventListener('change', function (e) { if (fieldOf(e.target) && fieldOf(e.target).classList.contains('is-err')) setFieldError(e.target, ''); });

  var toBody = function () {
    var body = new URLSearchParams();
    Object.keys(CONTACT_FORM.entries).forEach(function (key) {
      var entry = CONTACT_FORM.entries[key];
      if (!entry) return;
      if (key === 'source') { body.append(entry, contactSource()); return; }
      [].slice.call(form.querySelectorAll('[name="' + key + '"]'))
        .filter(function (f) { return (f.type !== 'radio' && f.type !== 'checkbox') || f.checked; })
        .map(function (f) { return String(f.value || '').trim(); })
        .filter(Boolean)
        .forEach(function (value) { body.append(entry, value); });
    });
    return body;
  };

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (btn.disabled) return;
    var bad = invalidFields();
    [].slice.call(form.querySelectorAll('.fld.is-err')).forEach(function (fld) { setFieldError(fld.querySelector('input,select,textarea'), ''); });
    if (bad.length) {
      bad.forEach(function (f) { setFieldError(f, MESSAGES[f.name] || '入力内容をご確認ください。'); });
      showNote('入力内容をご確認ください。', true);
      fieldOf(bad[0]).scrollIntoView({ block: 'center' });
      bad[0].focus({ preventScroll: true });
      return;
    }
    showNote(DEFAULT_NOTE, false);
    if (form.elements.hp.value) { location.href = CONTACT_FORM.thanksUrl; return; }

    setSending(true);
    fetch(CONTACT_FORM.action, { method: 'POST', mode: 'no-cors', body: toBody() })
      .then(function () {
        var checked = function (name) { return [].slice.call(form.querySelectorAll('[name="' + name + '"]:checked')).map(function (f) { return f.value; }).join('、'); };
        if (window.rdTracking) window.rdTracking.saveLead({ kind: checked('kind'), budget: form.elements.budget.value, extras: checked('extras') });
        location.href = CONTACT_FORM.thanksUrl;
      })
      .catch(function (err) {
        console.error('お問い合わせの送信に失敗しました', err);
        setSending(false);
        showNote('送信できませんでした。通信環境をご確認のうえ、もう一度お試しください。', true);
      });
  });
})();
