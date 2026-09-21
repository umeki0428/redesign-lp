/**
 * メールと Chatwork の文面をつくる。副作用のない関数だけを置く（node でテストする）
 */

function isValidEmail_(value) {
  return typeof value === 'string' && value.length <= 254 && /^[^\s@"'<>()[\]\\,;:]+@[^\s@"'<>()[\]\\,;:]+\.[^\s@"'<>()[\]\\,;:]+$/.test(value);
}

/** 件名・1 行の値から改行と制御文字を取り、長さをそろえる */
function oneLine_(value, maxLength) {
  const text = String(value == null ? '' : value).replace(/[\u0000-\u001f\u007f]+/g, ' ').trim();
  return text.length > maxLength ? text.slice(0, maxLength) + '…' : text;
}

/** 回答の値を定義にそって整える。定義にない key は捨てる */
function normalizeData_(raw) {
  return FIELDS.reduce(function (acc, field) {
    const rawValue = Array.isArray(raw[field.key]) ? raw[field.key].join('、') : raw[field.key];
    const value = String(rawValue == null ? '' : rawValue).trim();
    const limit = field.maxLength || 200;
    const clipped = value.length > limit ? value.slice(0, limit) : value;
    return Object.assign({}, acc, { [field.key]: field.type === 'paragraph' ? clipped : oneLine_(clipped, limit) });
  }, {});
}

/** 必須の抜けと形式の誤りを返す。空の配列なら問題なし */
function validateData_(data) {
  const missing = FIELDS.filter(function (f) { return f.required && !data[f.key]; })
    .map(function (f) { return f.title + 'が空です'; });
  const invalidEmail = data.email && !isValidEmail_(data.email) ? ['メールアドレスの形式が正しくありません'] : [];
  return missing.concat(invalidEmail);
}

/** 画面に出す項目を「見出し：値」で並べる（流入元は除く） */
function formatFields_(data) {
  return FIELDS.filter(function (f) { return f.key !== 'source'; })
    .map(function (f) {
      const value = data[f.key] || '（未記入）';
      return f.type === 'paragraph' ? '■ ' + f.title + '\n' + value : '■ ' + f.title + '：' + value;
    })
    .join('\n');
}

function buildAutoReply_(data) {
  const name = oneLine_(data.name, 80);
  return {
    subject: '【' + COMPANY_NAME + '】お問い合わせありがとうございます',
    body: [
      name + ' 様',
      '',
      'このたびは ' + COMPANY_NAME + ' にお問い合わせいただき、ありがとうございます。',
      '以下の内容で受け付けました。',
      '内容を確認のうえ、' + REPLY_DEADLINE + 'にメールでご連絡します。',
      '',
      '――――――――――――――――',
      formatFields_(data),
      '――――――――――――――――',
      '',
      'このメールに返信いただくと、担当者に届きます。',
      'お心当たりのない場合は、お手数ですがこのメールを破棄してください。',
      '',
      COMPANY_NAME,
      SITE_URL,
    ].join('\n'),
  };
}

function buildAdminMail_(data, submittedAt) {
  return {
    subject: '【お問い合わせ】' + oneLine_(data.kind, 40) + '／' + oneLine_(data.name, 40) + ' 様',
    body: [
      'サイトからお問い合わせがありました。',
      '受付：' + submittedAt,
      'このメールに返信すると、相談者に届きます。',
      '',
      formatFields_(data),
      '',
      '■ 流入元',
      data.source || '（なし）',
    ].join('\n'),
  };
}

/** Chatwork の記法（[To]・[toall]・[info] など）を無効にする */
function escapeChatwork_(value) {
  return String(value == null ? '' : value).replace(/\[/g, '［').replace(/\]/g, '］');
}

function buildChatworkMessage_(data, submittedAt, toAccountId) {
  const safe = Object.keys(data).reduce(function (acc, key) {
    return Object.assign({}, acc, { [key]: escapeChatwork_(data[key]) });
  }, {});
  const mention = toAccountId && /^\d+$/.test(toAccountId) ? '[To:' + toAccountId + ']\n' : '';
  return mention + '[info][title]お問い合わせ：' + safe.kind + '／' + safe.name + ' 様[/title]'
    + formatFields_(safe)
    + '\n[hr]受付：' + submittedAt + '\n流入元：' + (safe.source || '（なし）')
    + '[/info]';
}
