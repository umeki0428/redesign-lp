# AGENTS.md — AIへの指示

## 読む順番

1. `docs/BRIEF.md` — 案件の前提と確定事項。すべての作業の基準
2. `docs/STRUCTURE.md` — サイト構成（全12セクション）
3. `docs/DESIGN.md` — トンマナ・配色・タイポ。Codex Design への入力
4. `docs/CONTENT.md` — 原稿（デザインの文言ミラー。原本ではない）
5. `site/index.html` — 本番のサイト。見た目と原稿はここが正（`design/` は v1〜v15 の案の履歴、凍結）。CSS は `site/scss/`（セクションごとに 1 ファイル）

## ルール

- BRIEF.md の確定事項（日付つきの項目）と矛盾する提案・出力をしない。矛盾を見つけたら勝手に直さず、BRIEF.md §9 に論点として書き残す
- STRUCTURE.md が確定する前に `design/` へビジュアルを出力しない
- CONTENT.md のセクションは STRUCTURE.md と1対1で対応させる。勝手にセクションを増減しない
- **原稿はデザイン上で確定させる** [2026-08-26]。CONTENT.md はデザインの文言を書き戻すミラーであり、ここを直してデザインに流し込むのではない。食い違ったらデザイン側が正
- サイトの修正は **`site/` の中を直接編集する** [2026-09-24]。`design/v1〜v15` は案の履歴で凍結、編集しない。公開用の `dist/` は `npm run build` で出す（DESIGN.md §75・§84）
- **CSS は `site/scss/` に書く** [2026-09-25]。`site/assets/css/style.css` はコンパイル結果なので直接編集しない。scss を直したら `npm run css`（DESIGN.md §84）。画面幅の境界は `_breakpoints.scss` の mixin で書き、`@media` を直に書かない
- デザインの修正指示はチャットで完結させず、必ず DESIGN.md §6 修正ログに追記してから着手する
- 不明点は仮定で進めず、BRIEF.md に `[仮]` として書き残すか発注者に確認する
