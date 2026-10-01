# 計測の設定（GTM・GA4・Google 広告）

前提は BRIEF §6「公開先と計測」、作業記録は DESIGN.md §69。

## しくみ

1. フォームの送信に成功 → `index.html` が「つくりたいもの・ご予算・あわせて相談したいこと」をセッションに残して thanks.html へ
2. thanks.html → `tracking.js` がそれを見つけたときだけ `dataLayer` に `generate_lead` を 1 回入れる
3. GTM → GA4 のイベント `generate_lead` と、Google 広告のコンバージョンを送る

名前・メールアドレス・相談内容は GA4 にも広告にも送らない。

## 手順

| # | どこで | すること | 状態 |
|---|---|---|---|
| 1 | Google 広告（MCC） | RE DESIGN のアカウントを作成、支払い情報を登録 | 済：689-847-7992（2026-09-22 有効） |
| 2 | Google 広告 | コンバージョン「問い合わせ」を作成（API で作れる）→ ID とラベルを控える | 済：18465405666 / ons-CNmp94AdEOL1_uRE |
| 3 | GTM | コンテナ（ウェブ・redesign.tokyo）を作成 → `GTM-` の ID を控える | 済：GTM-MBWHWBVQ |
| 4 | GTM | 管理 → コンテナをインポート → `gtm-container.json`（新規 or 統合） | 済。ID 入りの JSON をもう一度インポートする（要） |
| 5 | GTM | 変数「広告 コンバージョン ID／ラベル」を入れ、タグ「Google 広告 - 問い合わせ」の停止を解除 | JSON に反映済み。再インポートで入る |
| 6 | サイト | `site/tracking.js` の `GTM_ID` を入れる | 済 |
| 7 | GTM | プレビューで確かめてから公開 | 済 [2026-10-01]：バージョン 4 |
| 8 | GA4 | 管理 → キーイベント → `generate_lead` を追加 | 済 [2026-10-01]：Admin API で作成（1 イベントごとに 1 回） |
| 9 | GA4 | 管理 → カスタム定義 → イベントスコープで lead_kind・lead_budget・lead_extras を追加 | 済 [2026-10-01]：つくりたいもの／ご予算／あわせて相談したいこと |
| 10 | GA4 | 管理 → Google 広告のリンク → RE DESIGN のアカウントをリンク | 済 [2026-09-21]。GA4 の generate_lead は広告に読み込まない（広告のタグと二重になる） |
| 11 | GTM | GA4 とリンカーも「本番のみ」にした JSON を再インポート（統合・上書き）→ 公開（lead_id をトランザクション ID に入れる変更もいっしょ）。使わなくなったトリガー「CE - generate_lead」は消してよい | 済 [2026-10-01]：バージョン 4 |

## Microsoft Clarity [2026-09-24]

- プロジェクト ID：`yn40ls2nvm`（GTM の変数「Clarity プロジェクト ID」）
- GTM のカスタム HTML タグ。トリガーは「全ページ（本番のみ）」。ローカルや検証環境では発火しない
- お問い合わせフォームには `data-clarity-mask="true"` を付けている。加えて Clarity 側のマスク設定を「厳格」にする（要）
- Clarity の設定で GA4 と連携すると、GA4 のレポートから録画に飛べる（要）

## 本番だけで動かす [2026-09-30]

すべてのタグは、ホスト名が redesign.tokyo（www 付きも）のときだけ発火する。

- Google タグ（GA4）：初期化（本番のみ）
- GA4 - generate_lead・Google 広告 - 問い合わせ：CE - generate_lead（本番のみ）
- コンバージョン リンカー・Microsoft Clarity：全ページ（本番のみ）

ローカル（127.0.0.1・localhost）で見たページや試しの送信は、GA4 にも広告にも記録されない。
前は GA4 だけ全ホストで動いていて、2026-09-29〜30 にローカルの 9 セッション・91 ページビューが GA4 に入った。

## 確かめ方

- ローカル：dataLayer に `gtm.js` は入るが、`analytics.google.com/g/collect` への送信が出ないこと
- 本番：GTM のプレビュー（Tag Assistant）で redesign.tokyo を開く → Google タグ・リンカー・Clarity が発火すること
- 本番：フォームを送る → thanks.html で `generate_lead` が出て、GA4 と広告のタグが発火すること。GA4 のリアルタイムにも出ること
- 本番のテスト送信は GA4 と広告に 1 件として残る。試すなら、GA4 の内部トラフィックの除外（自分の IP）を先に設定しておく

## 営業の問い合わせを広告の CV から取り消す [2026-09-30]

1. 通知メールか Chatwork の「流入元（自動）」の 1 行目にある `lead_id` を控える（例：`L2609302222-h3xh`）
2. `python3 tracking/ads/retract_lead.py <lead_id>` で検証 → `--apply` を付けて反映。複数まとめて渡せる
3. 「見つからない」と出たら、広告から来た問い合わせではない（取り消し不要）か、まだ反映前（1 日ほど待つ）

GA4 の generate_lead は取り消せない。くわしくは DESIGN.md §127。

## AI の回答ページからの流入 [2026-10-01]

- GA4 にカスタム チャネル グループ「流入元（AI を分ける）」を作った（Admin API）。既定のチャネルを写し、Referral の前に「AI（回答ページ）」を足したもの
- 「AI（回答ページ）」の条件：GA4 の既定の「AI Assistant」か、参照元が chatgpt.com・perplexity.ai・gemini.google.com・copilot.microsoft.com・claude.ai など
- 見方：レポート → 集客 → トラフィック獲得 → 表の 1 列目の「▼」で「流入元（AI を分ける）」を選ぶ。過去のデータにもさかのぼって当てはまる
- 既定（メイン）のチャネル グループは変えていない
- AI の画面からリンクを押しても参照元が渡らないことがあり、その分は Direct に入る
