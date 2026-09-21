/**
 * Google フォームの送信時トリガー（setupContactForm が登録する）。
 * 自動返信 → 通知メール → Chatwork の順に送る。1 つが失敗しても残りは送り、
 * 最後にまとめてエラーにする（GAS の失敗通知メールが届く）。
 */
function onContactSubmit(e) {
  const settings = readSettings_();
  const data = normalizeData_(responseToRaw_(e.response));
  const submittedAt = Utilities.formatDate(e.response.getTimestamp(), 'Asia/Tokyo', 'yyyy/MM/dd HH:mm');
  const problems = validateData_(data);
  if (problems.length) console.warn('入力に不備のある送信：' + problems.join('／'));

  const steps = [
    { name: '自動返信', run: function () { sendAutoReply_(data, settings); } },
    { name: '通知メール', run: function () { sendAdminMail_(data, submittedAt, settings); } },
    { name: 'Chatwork', run: function () { postChatwork_(buildChatworkMessage_(data, submittedAt, settings.chatworkToId), settings); } },
  ];
  const failures = steps.reduce(function (acc, step) {
    try {
      step.run();
      return acc;
    } catch (err) {
      console.error(step.name + 'に失敗：' + err.message, { name: data.name, email: data.email });
      return acc.concat(step.name + '：' + err.message);
    }
  }, []);
  if (failures.length) throw new Error('お問い合わせの処理に一部失敗しました（受付 ' + submittedAt + '）。' + failures.join(' ／ '));
}

function responseToRaw_(response) {
  return response.getItemResponses().reduce(function (acc, itemResponse) {
    const field = FIELDS.filter(function (f) { return f.title === itemResponse.getItem().getTitle(); })[0];
    return field ? Object.assign({}, acc, { [field.key]: itemResponse.getResponse() }) : acc;
  }, {});
}

function readSettings_() {
  const props = PropertiesService.getScriptProperties();
  const required = ['ADMIN_EMAIL', 'CHATWORK_TOKEN', 'CHATWORK_ROOM_ID'];
  const missing = required.filter(function (key) { return !props.getProperty(key); });
  if (missing.length) throw new Error('スクリプトプロパティが足りません：' + missing.join(', '));
  const adminEmail = props.getProperty('ADMIN_EMAIL');
  if (!isValidEmail_(adminEmail)) throw new Error('ADMIN_EMAIL の形式が正しくありません');
  return {
    adminEmail: adminEmail,
    chatworkToken: props.getProperty('CHATWORK_TOKEN'),
    chatworkRoomId: props.getProperty('CHATWORK_ROOM_ID'),
    chatworkToId: props.getProperty('CHATWORK_TO_ID') || '',
  };
}

function sendAutoReply_(data, settings) {
  if (!isValidEmail_(data.email)) throw new Error('宛先の形式が正しくないため送っていません');
  if (!takeReplyQuota_(data.email)) throw new Error('同じ宛先への送信が上限を超えたため送っていません');
  const mail = buildAutoReply_(data);
  GmailApp.sendEmail(data.email, mail.subject, mail.body, { name: COMPANY_NAME, replyTo: settings.adminEmail });
}

function sendAdminMail_(data, submittedAt, settings) {
  const mail = buildAdminMail_(data, submittedAt);
  const options = isValidEmail_(data.email) ? { name: 'RE DESIGN サイト', replyTo: data.email } : { name: 'RE DESIGN サイト' };
  GmailApp.sendEmail(settings.adminEmail, mail.subject, mail.body, options);
}

/** 同じ宛先への自動返信を AUTO_REPLY_LIMIT までに抑える。送ってよければ true */
function takeReplyQuota_(email) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const cache = CacheService.getScriptCache();
    const key = 'reply:' + Utilities.base64EncodeWebSafe(email.toLowerCase());
    const count = Number(cache.get(key) || 0);
    if (count >= AUTO_REPLY_LIMIT.count) return false;
    cache.put(key, String(count + 1), AUTO_REPLY_LIMIT.windowSeconds);
    return true;
  } finally {
    lock.releaseLock();
  }
}

function postChatwork_(body, settings) {
  if (!/^\d+$/.test(settings.chatworkRoomId)) throw new Error('CHATWORK_ROOM_ID は数字だけで入れてください');
  const res = UrlFetchApp.fetch('https://api.chatwork.com/v2/rooms/' + settings.chatworkRoomId + '/messages', {
    method: 'post',
    headers: { 'X-ChatWorkToken': settings.chatworkToken },
    payload: { body: body },
    muteHttpExceptions: true,
  });
  const code = res.getResponseCode();
  if (code !== 200) throw new Error('Chatwork API が ' + code + ' を返しました：' + res.getContentText().slice(0, 300));
}

/** 設定の確認用。エディタから実行すると、自分宛てにテストの通知メールと Chatwork を送る（自動返信は送らない） */
function testNotify() {
  const settings = readSettings_();
  const data = normalizeData_({
    kind: KIND_CHOICES[1], name: 'テスト 太郎', org: 'テスト株式会社', email: settings.adminEmail,
    url: 'https://example.com', budget: BUDGET_CHOICES[1], message: 'これはテスト送信です。\n[toall] の記法が無効になっているかも確かめます。',
    source: 'utm_source=test',
  });
  const now = Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyy/MM/dd HH:mm');
  sendAdminMail_(data, now, settings);
  postChatwork_(buildChatworkMessage_(data, now, settings.chatworkToId), settings);
  console.log('通知メールと Chatwork を送りました');
}

/** Chatwork の自分のアカウント ID（数字）をログに出す。CHATWORK_TO_ID に入れる値 */
function logChatworkAccountId() {
  const token = PropertiesService.getScriptProperties().getProperty('CHATWORK_TOKEN');
  if (!token) throw new Error('スクリプトプロパティに CHATWORK_TOKEN がありません');
  const res = UrlFetchApp.fetch('https://api.chatwork.com/v2/me', { headers: { 'X-ChatWorkToken': token }, muteHttpExceptions: true });
  if (res.getResponseCode() !== 200) throw new Error('Chatwork API が ' + res.getResponseCode() + ' を返しました：' + res.getContentText().slice(0, 300));
  const me = JSON.parse(res.getContentText());
  console.log('アカウント ID：' + me.account_id + '（' + me.name + '）');
}

