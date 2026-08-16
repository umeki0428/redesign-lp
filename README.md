# redesign-lp

RE DESIGN コーポレートサイト（広告受け皿LP）制作リポジトリ。

## ファイル構成

```
├── CLAUDE.md          # AIへの指示（読む順・禁止事項）
├── docs/
│   ├── BRIEF.md       # 前提・確定事項（決定ログ兼用）
│   ├── STRUCTURE.md   # 構成
│   ├── CONTENT.md     # 原稿（STRUCTUREと1対1対応）
│   └── DESIGN.md      # トンマナ・参考デザイン → Claude Designへの入力
├── assets/refs/       # 参考サイトのスクショ・画像
└── design/            # Claude Designの出力先
```

## ルール

- ドキュメントはこの5ファイルで打ち止め。増やさない
- 前提・決定事項はすべて BRIEF.md に集約する（確定は `[日付確定]`、未確定は `[仮]`）
- STRUCTURE.md 確定前に design/ へビジュアルを出力しない
- デザインの修正指示は DESIGN.md に追記してから再出力（チャットで完結させない）

## 進行状況

- [x] BRIEF.md 初版
- [ ] STRUCTURE.md 確定（たたき台まで）
- [ ] CONTENT.md 執筆
- [ ] お客様の声 依頼（並行）
- [ ] DESIGN.md 記入（並行）
- [ ] Claude Design 出力
- [ ] 実装・QA・公開
