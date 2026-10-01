/* 計測：GTM の読み込みと、お問い合わせのコンバージョン（generate_lead）の受け渡し [DESIGN.md §69]
   各ページの head で読む。GTM の中身は tracking/gtm-container.json */
(function () {
  // GTM のコンテナ ID（redesign.tokyo）[2026-09-21]
  var GTM_ID = 'GTM-MBWHWBVQ';
  var LEAD_KEY = 'rd_lead';

  window.dataLayer = window.dataLayer || [];

  var storage = {
    get: function (key) { try { return sessionStorage.getItem(key); } catch (e) { return null; } },
    set: function (key, value) { try { sessionStorage.setItem(key, value); return true; } catch (e) { return false; } },
    remove: function (key) { try { sessionStorage.removeItem(key); } catch (e) { /* 保存できない環境では何もしない */ } }
  };

  if (/^GTM-[A-Z0-9]+$/.test(GTM_ID) && GTM_ID !== 'GTM-XXXXXXX') {
    window.dataLayer.push({ 'gtm.start': new Date().getTime(), event: 'gtm.js' });
    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtm.js?id=' + GTM_ID;
    document.head.appendChild(s);
  }

  window.rdTracking = {
    /* 問い合わせ 1 件ごとの ID。流入元の欄と広告のコンバージョン（トランザクション ID）に同じ値を入れ、
       営業だった問い合わせを後から広告の CV から取り消すときに使う [DESIGN.md §127] */
    newLeadId: function () {
      var d = new Date(), pad = function (n) { return ('0' + n).slice(-2); };
      var stamp = String(d.getFullYear()).slice(-2) + pad(d.getMonth() + 1) + pad(d.getDate()) + pad(d.getHours()) + pad(d.getMinutes());
      return 'L' + stamp + '-' + (Math.random().toString(36) + '0000').slice(2, 6);
    },
    /* フォームの送信に成功したとき（thanks.html へ移る直前）に呼ぶ。個人を特定できる値は渡さない */
    saveLead: function (lead) {
      storage.set(LEAD_KEY, JSON.stringify({
        lead_id: String(lead.id || ''),
        lead_kind: String(lead.kind || ''),
        lead_budget: String(lead.budget || ''),
        lead_extras: String(lead.extras || '')
      }));
    },
    /* thanks.html で呼ぶ。送信してきたときだけ generate_lead を 1 回入れる */
    flushLead: function () {
      var raw = storage.get(LEAD_KEY);
      if (!raw) return false;
      storage.remove(LEAD_KEY);
      var lead;
      try { lead = JSON.parse(raw); } catch (e) { return false; }
      window.dataLayer.push({ event: 'generate_lead', lead_id: lead.lead_id, lead_kind: lead.lead_kind, lead_budget: lead.lead_budget, lead_extras: lead.lead_extras });
      return true;
    }
  };
})();
