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
| 6 | サイト | `design/v15/tracking.js` の `GTM_ID` を入れる | 済 |
| 7 | GTM | プレビューで確かめてから公開 | |
| 8 | GA4 | 管理 → キーイベント → `generate_lead` を追加 | |
| 9 | GA4 | 管理 → カスタム定義 → イベントスコープで lead_kind・lead_budget・lead_extras を追加 | |
| 10 | GA4 | 管理 → Google 広告のリンク → RE DESIGN のアカウントをリンク | |

## Microsoft Clarity [2026-09-24]

- プロジェクト ID：`yn40ls2nvm`（GTM の変数「Clarity プロジェクト ID」）
- GTM のカスタム HTML タグ。トリガーは「全ページ（本番のみ）」。ローカルや検証環境では発火しない
- お問い合わせフォームには `data-clarity-mask="true"` を付けている。加えて Clarity 側のマスク設定を「厳格」にする（要）
- Clarity の設定で GA4 と連携すると、GA4 のレポートから録画に飛べる（要）

## 確かめ方

- GTM のプレビュー（Tag Assistant）でフォームを送る → thanks.html で `generate_lead` が出て、GA4 のタグが発火すること
- GA4 のリアルタイムに `generate_lead` が出ること
- 広告のタグは本番（redesign.tokyo）でだけ発火する。ローカルでは発火しないのが正しい
