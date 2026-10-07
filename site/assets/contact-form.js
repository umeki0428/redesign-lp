/* お問い合わせフォームの処理 [DESIGN.md §54・§68・§85]
   送信先・entry ID・選択肢の文言は A案のときから同じ。直すときは gas/config.gs もそろえる [§111] */

var CONTACT_FORM = {
  action: 'https://docs.google.com/forms/d/e/1FAIpQLSeluzyi08uUEk9Y3kDNOly3p9OM4HBZdKf-xOuiHJifl5Q8Qg/formResponse',
  entries: { kind: 'entry.1686821301', name: 'entry.841739636', org: 'entry.282699455', email: 'entry.519150214',
             url: 'entry.160571641', budget: 'entry.1083968863', extras: 'entry.848307915', message: 'entry.1231923885', source: 'entry.676258905' },
  thanksUrl: 'thanks.html'
};

/* 流入元：最初に来たときの utm・gclid・参照元をセッションに残す。page にページの URL が入る（公開後は https://redesign.tokyo/）。
   lead_id は広告の CV を取り消すときの手がかり [§127] */
var contactSource = (function () {
  var KEY = 'rd_first_touch', PARAMS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'gclid'];
  var read = function () { try { return JSON.parse(sessionStorage.getItem(KEY) || 'null'); } catch (e) { return null; } };
  var q = new URLSearchParams(location.search);
  var found = PARAMS.filter(function (k) { return q.get(k); }).map(function (k) { return k + '=' + q.get(k); });
  if (!read() || found.length) {
    var first = { params: found.join('&'), referrer: document.referrer || '' };
    try { sessionStorage.setItem(KEY, JSON.stringify(first)); } catch (e) { /* 保存できない環境では送信時の値だけを使う */ }
  }
  return function (leadId, suspects) {
    var first = read() || { params: found.join('&'), referrer: document.referrer || '' };
    var check = suspects && suspects.length ? '営業の疑い（' + suspects.join('・') + '）' : 'なし';
    return ['lead_id: ' + (leadId || '（なし）'), 'params: ' + (first.params || '（なし）'), 'referrer: ' + (first.referrer || '（なし）'),
            'page: ' + location.origin + location.pathname, 'check: ' + check].join('\n');
  };
})();

/* 営業ツールの見分け [DESIGN.md §130]。人の入力では起きにくい兆候を返す（なければ空）。
   送信は止めない。流入元に印を付け、GAS が Chatwork と自動返信を止める */
var contactSuspects = (function () {
  var FAST_SECONDS = 10, firstInputAt = 0;
  document.addEventListener('input', function (e) {
    if (!firstInputAt && e.isTrusted && e.target.closest && e.target.closest('#ctForm')) firstInputAt = Date.now();
  }, true);
  return function () {
    var seconds = firstInputAt ? Math.round((Date.now() - firstInputAt) / 1000) : null;
    return [
      navigator.webdriver ? '自動操作のブラウザ' : '',
      seconds === null ? 'キー入力なし' : '',
      seconds !== null && seconds < FAST_SECONDS ? '入力 ' + seconds + ' 秒' : ''
    ].filter(Boolean);
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

  var toBody = function (leadId, suspects) {
    var body = new URLSearchParams();
    Object.keys(CONTACT_FORM.entries).forEach(function (key) {
      var entry = CONTACT_FORM.entries[key];
      if (!entry) return;
      if (key === 'source') { body.append(entry, contactSource(leadId, suspects)); return; }
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
    // 古い tracking.js がキャッシュに残っていると newLeadId がない。そのときも送信は止めない [DESIGN.md §125]
    var leadId = window.rdTracking && typeof window.rdTracking.newLeadId === 'function' ? window.rdTracking.newLeadId() : '';
    var suspects = contactSuspects();
    fetch(CONTACT_FORM.action, { method: 'POST', mode: 'no-cors', body: toBody(leadId, suspects) })
      .then(function () {
        var checked = function (name) { return [].slice.call(form.querySelectorAll('[name="' + name + '"]:checked')).map(function (f) { return f.value; }).join('、'); };
        // 営業の疑いがあるときは記録しない。完了ページで generate_lead（GA4・広告の CV）が出ない [§130]
        if (window.rdTracking && !suspects.length) window.rdTracking.saveLead({ id: leadId, kind: checked('kind'), budget: form.elements.budget.value, extras: checked('extras') });
        location.href = CONTACT_FORM.thanksUrl;
      })
      .catch(function (err) {
        console.error('お問い合わせの送信に失敗しました', err);
        setSending(false);
        showNote('送信できませんでした。通信環境をご確認のうえ、もう一度お試しください。', true);
      });
  });
})();
