# redesign-lp

RE DESIGN コーポレートサイト（広告受け皿LP）制作リポジトリ。

## ファイル構成

```
├── CLAUDE.md          # AIへの指示（読む順・禁止事項）
├── docs/
│   ├── BRIEF.md       # 前提・確定事項（決定ログ兼用）
│   ├── STRUCTURE.md   # 構成（全12セクション）
│   ├── CONTENT.md     # 原稿 — デザインの文言ミラー（文量の目安）
│   └── DESIGN.md      # トンマナ・参考デザイン → Claude Designへの入力
├── assets/
│   ├── logo/          # 実ロゴ（logo.svg / logo_symbol.svg）
│   ├── refs/          # 参考サイトのスクショ
│   └── photos/        # 実素材写真（未支給）
└── design/
    ├── v7/            # デザイン案（枠線なし・多色・スクロール連動）★検討中
    │   ├── index.html
    │   └── screenshots/
    ├── v6/            # デザイン案（全12セクション）
    │   ├── index.html      # ★作業ファイル。デザイン調整はここを編集する
    │   ├── index.dc.html   # Claude Design 出力の原典（凍結）
    │   ├── HANDOFF.md      # 仕様（色・タイポ・数値の正）
    │   └── screenshots/
    └── v3/            # 旧HTMLドラフト（A〜D案）※参考資料
```

## ルール

- ドキュメントは docs/ の4ファイル＋CLAUDE.mdで打ち止め。増やさない
- 前提・決定事項はすべて BRIEF.md に集約する（確定は `[日付確定]`、未確定は `[仮]`）
- デザインの修正指示は DESIGN.md に追記してから再出力（チャットで完結させない）
- **原稿はデザイン上で確定させる。** CONTENT.md は原本ではなくデザインの文言ミラー。食い違ったらデザイン側が正

## デザインの進め方 [2026-08-26〜]

**デザインの調整は Claude Code で行う。** 現在 v6 と v7 の2案が併存している [仮]。

- `design/v7/index.html` — v7案。黒い枠線を全廃、色ステージ8色、スクロール連動、MVは幾何学アニメーション
- `design/v6/index.html` — v6案。枠線ベースの構成
- `design/v6/index.dc.html` — Claude Design の出力そのまま。原典として凍結し、編集しない
- `design/v6/HANDOFF.md` — v6 の仕様書（色・タイポ・数値の正）

手順:

1. 修正内容を `docs/DESIGN.md` §6 修正ログに追記する（チャットで完結させない）
2. 対象の `index.html` を編集する
3. ローカルサーバで確認する（`?v=2` のようにクエリを付ける。304で古い内容が返るため）

   ```bash
   cd design/v7 && python3 -m http.server 8766
   ```

4. スクリーンショットを `design/v{n}/screenshots/` に保存する
5. 文言を変えたら `docs/CONTENT.md` に書き戻す（デザイン側が正）

## 進行状況

- [x] BRIEF.md 初版
- [x] STRUCTURE.md 全12セクション（v6反映）
- [x] CONTENT.md 全12セクション（v6の文言ミラー。文言は未確定）
- [x] DESIGN.md 記入（v6の配色・タイポを反映）
- [x] Claude Design 出力（v6）
- [x] v6 を素の静的HTML（`design/v6/index.html`）へ変換
- [x] v6 の要修正4点を反映（代表写真削除／実績5要素化／会社名統一／実ロゴSVG化）
- [x] v7 案を作成（枠線なし・多色・スクロール連動・MV幾何学）
- [ ] v6 / v7 のどちらを採用するか決定
- [ ] 料金の確定（BRIEF §5）
- [ ] 実績・お客様の声の回収（BRIEF §7）
- [ ] 代表名・所在地・設立年の確定
- [ ] 実装・QA・公開
