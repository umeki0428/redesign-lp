// node --test gas/test/*.test.js
// GAS のファイルをそのまま読み込み、副作用のない関数と、サイトとの選択肢の一致を確かめる
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const GAS_DIR = path.join(__dirname, '..');
const SITE_HTML = path.join(GAS_DIR, '..', 'design', 'v15', 'index.html');

const ctx = vm.createContext({});
['config.gs', 'message.gs'].forEach(function (file) {
  vm.runInContext(fs.readFileSync(path.join(GAS_DIR, file), 'utf8'), ctx, { filename: file });
});
const g = function (expr) { return vm.runInContext(expr, ctx); };

const sample = function (overrides) {
  return Object.assign({
    kind: '小規模サイト（〜5ページ）', name: '山田 太郎', org: '', email: 'taro@example.com',
    url: '', budget: '', message: 'つくり直したい', source: 'utm_source=google',
  }, overrides);
};

test('サイトのラジオとセレクトの選択肢が GAS の定義と一致する', function () {
  const html = fs.readFileSync(SITE_HTML, 'utf8');
  const form = html.slice(html.indexOf('<form id="ctForm"'), html.indexOf('</form>'));
  const kinds = [...form.matchAll(/name="kind" value="([^"]+)"/g)].map(function (m) { return m[1]; });
  const select = form.slice(form.indexOf('<select id="ctBudget"'), form.indexOf('</select>'));
  const budgets = [...select.matchAll(/<option>([^<]+)<\/option>/g)].map(function (m) { return m[1]; });
  assert.deepEqual(kinds, [...g('KIND_CHOICES')]);
  assert.deepEqual(budgets, [...g('BUDGET_CHOICES')]);
  const extras = [...form.matchAll(/name="extras" value="([^"]+)"/g)].map(function (m) { return m[1]; });
  assert.deepEqual(extras, [...g('EXTRAS_CHOICES')]);
});

test('サイトの input の name が GAS の key と一致する', function () {
  const html = fs.readFileSync(SITE_HTML, 'utf8');
  const form = html.slice(html.indexOf('<form id="ctForm"'), html.indexOf('</form>'));
  const names = new Set([...form.matchAll(/name="([a-z]+)"/g)].map(function (m) { return m[1]; }));
  const keys = g('FIELDS').filter(function (f) { return f.key !== 'source'; }).map(function (f) { return f.key; });
  keys.forEach(function (key) { assert.ok(names.has(key), key + ' がサイトにない'); });
});

test('isValidEmail_ は正しい形式だけを通す', function () {
  const ok = g('isValidEmail_');
  assert.equal(ok('taro@example.com'), true);
  assert.equal(ok('taro@example'), false);
  assert.equal(ok('taro@example.com\nBcc: x@y.z'), false);
  assert.equal(ok('a b@example.com'), false);
  assert.equal(ok(''), false);
  assert.equal(ok(undefined), false);
});

test('normalizeData_ は改行を 1 行の項目から取り、長さを切り、定義にない key を捨てる', function () {
  const data = g('normalizeData_')(sample({ name: '山田\r\n太郎', message: 'a'.repeat(5000), extra: 'x' }));
  assert.equal(data.name, '山田 太郎');
  assert.equal(data.message.length, 4000);
  assert.equal('extra' in data, false);
});

test('normalizeData_ は元のオブジェクトを変えない', function () {
  const raw = sample({ name: '  山田  ' });
  g('normalizeData_')(raw);
  assert.equal(raw.name, '  山田  ');
});

test('validateData_ は必須の抜けとメールの形式を返す', function () {
  const validate = g('validateData_');
  assert.deepEqual([...validate(sample())], []);
  const problems = [...validate(sample({ kind: '', email: 'bad' }))];
  assert.ok(problems.includes('つくりたいものが空です'));
  assert.ok(problems.includes('メールアドレスの形式が正しくありません'));
});

test('自動返信は名前・受付内容・返信の目安を含み、流入元は含まない', function () {
  const mail = g('buildAutoReply_')(sample());
  assert.match(mail.body, /^山田 太郎 様/);
  assert.match(mail.body, /■ つくりたいもの：小規模サイト/);
  assert.match(mail.body, /■ 会社名・屋号：（未記入）/);
  assert.match(mail.body, /2営業日以内/);
  assert.doesNotMatch(mail.body, /utm_source/);
});

test('通知メールの件名に種類と名前が入り、本文に流入元が入る', function () {
  const mail = g('buildAdminMail_')(sample(), '2026/09/21 10:00');
  assert.equal(mail.subject, '【お問い合わせ】小規模サイト（〜5ページ）／山田 太郎 様');
  assert.match(mail.body, /utm_source=google/);
});

test('Chatwork の記法は無効になり、自分宛ての [To] だけが付く', function () {
  const msg = g('buildChatworkMessage_')(sample({ message: '[toall] [To:1] 失礼します' }), '2026/09/21 10:00', '12345');
  assert.ok(msg.startsWith('[To:12345]\n[info][title]'));
  assert.ok(msg.includes('［toall］ ［To:1］'));
  assert.equal((msg.match(/\[To:/g) || []).length, 1);
  assert.ok(msg.endsWith('[/info]'));
});

test('Chatwork の宛先 ID が数字でなければ [To] を付けない', function () {
  const msg = g('buildChatworkMessage_')(sample(), '2026/09/21 10:00', '1][toall');
  assert.ok(msg.startsWith('[info]'));
});

test('チェックボックスの回答（配列）は「、」でつなぐ', function () {
  const data = g('normalizeData_')(sample({ extras: ['広告運用（Google 広告など）', '更新・保守'] }));
  assert.equal(data.extras, '広告運用（Google 広告など）、更新・保守');
  assert.match(g('buildAdminMail_')(data, 'x').body, /■ あわせて相談したいこと：広告運用（Google 広告など）、更新・保守/);
});
