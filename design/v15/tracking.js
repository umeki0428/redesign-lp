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
    /* フォームの送信に成功したとき（thanks.html へ移る直前）に呼ぶ。個人を特定できる値は渡さない */
    saveLead: function (lead) {
      storage.set(LEAD_KEY, JSON.stringify({
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
      window.dataLayer.push({ event: 'generate_lead', lead_kind: lead.lead_kind, lead_budget: lead.lead_budget, lead_extras: lead.lead_extras });
      return true;
    }
  };
})();
