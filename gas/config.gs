/**
 * お問い合わせフォームの定義 [DESIGN.md §68]
 *
 * 選択肢の文言は、サイト（design/v15/index.html の #s12）と一字一句そろえる。
 * 1 文字でも違うと、Google フォームが回答を受け付けない。
 * そろっているかは `node --test gas/test/*.test.js` で確かめる。
 */

const FORM_TITLE = 'RE DESIGN お問い合わせ';

const KIND_CHOICES = [
  '名刺代わりのサイト（1〜3ページ）',
  '小規模サイト（〜5ページ）',
  'コーポレートサイト（〜10ページ・更新機能つき）',
  'LP（広告・商品紹介の1ページ）',
  'ECサイト・その他',
  '公開後の運用・改善の相談',
  'まだ決まっていない',
];

// [仮] 料金（BRIEF §5）が仮のため、区切りも仮
const BUDGET_CHOICES = [
  '30万円未満',
  '30〜60万円',
  '60〜100万円',
  '100万円以上',
  '未定・相談して決めたい',
];

// 公開後のサポートや集客もあわせて頼みたいか（複数可）[§68 の 5]
const EXTRAS_CHOICES = [
  '広告運用（Google 広告など）',
  'アクセス解析・改善',
  '更新・保守',
  'SEO・SNSなどの集客',
];

/**
 * key はサイトの input の name と同じにする。
 * required はサイトと GAS で確かめる。Google フォーム側の質問は必須にしない
 * （サイトからの送信が弾かれても、no-cors では気づけないため）。
 */
const FIELDS = [
  { key: 'kind', title: 'つくりたいもの', type: 'radio', required: true, choices: KIND_CHOICES },
  { key: 'name', title: 'お名前', type: 'text', required: true, maxLength: 80 },
  { key: 'org', title: '会社名・屋号', type: 'text', required: false, maxLength: 120 },
  { key: 'email', title: 'メールアドレス', type: 'text', required: true, maxLength: 254 },
  { key: 'url', title: '今のサイトのURL', type: 'text', required: false, maxLength: 500 },
  { key: 'budget', title: 'ご予算の目安（税込）', type: 'select', required: false, choices: BUDGET_CHOICES },
  { key: 'extras', title: 'あわせて相談したいこと', type: 'checkbox', required: false, choices: EXTRAS_CHOICES },
  { key: 'message', title: 'ご相談内容', type: 'paragraph', required: true, maxLength: 4000 },
  // サイトの画面には出さない。utm・gclid・送信ページの URL をサイトの JS が入れる
  { key: 'source', title: '流入元（自動）', type: 'paragraph', required: false, maxLength: 1000 },
];

const COMPANY_NAME = 'RE DESIGN合同会社';
const SITE_URL = 'https://redesign.tokyo/'; // [仮] 公開時の URL に合わせる
const REPLY_DEADLINE = '2営業日以内';

// 同じ宛先への自動返信の上限。Google フォームへ直接送られた場合の悪用（第三者への大量送信）を防ぐ
const AUTO_REPLY_LIMIT = { count: 3, windowSeconds: 6 * 60 * 60 };

// メールアドレス・トークン・ルーム ID は、ここではなく「プロジェクトの設定 → スクリプト プロパティ」に入れる。
// 使う名前：ADMIN_EMAIL／CHATWORK_TOKEN／CHATWORK_ROOM_ID／CHATWORK_TO_ID（任意）。FORM_ID は setupContactForm が入れる
