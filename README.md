# redesign-lp

RE DESIGN のホームページ（広告の受け皿 LP）のリポジトリ。公開先は https://redesign.tokyo/ 。

## ファイル構成

```
├── CLAUDE.md / AGENTS.md   # AI への指示（読む順・ルール）
├── site/                   # ★本番の元。修正はここを直接編集する
│   ├── index.html          # LP 本体（JS はインライン。CSS は下の scss から）
│   ├── scss/               # ★CSS の元。セクションごとに 1 ファイル（_s01-mv … _s12-contact）。npm run css で assets/css/style.css に出す
│   ├── privacy.html / thanks.html / 404.html
│   ├── tracking.js         # GTM の読み込みとコンバージョンの受け渡し
│   ├── robots.txt / sitemap.xml / site.webmanifest / favicon.* / icon-*.png / ogp.png
│   └── assets/             # css/style.css（コンパイル結果。直接編集しない）、mv、works、illust、discovery、ロゴ
├── dist/                   # 公開用（scripts/build_site.py が site/ から出す。git には入れない）
├── scripts/build_site.py   # site/ → dist/（npm run build から呼ぶ）
├── package.json            # npm run css / css:watch / build（Dart Sass）
├── docs/
│   ├── BRIEF.md            # 前提・確定事項（決定ログ兼用）
│   ├── STRUCTURE.md        # 構成（全 12 セクション）
│   ├── CONTENT.md          # 原稿。デザインの文言ミラー（原本ではない）
│   ├── DESIGN.md           # トンマナと修正ログ（§6）、作業記録（§NN）
│   ├── ADS.md              # Google 広告の設計
│   └── EXPLAINER.md        # 説明動画の検討
├── gas/                    # お問い合わせフォームの GAS（自動返信・Chatwork 通知）
├── tracking/               # GTM のコンテナ JSON、広告の作成スクリプト
├── assets/                 # ロゴの原本、参考サイトのスクショ
└── design/                 # デザイン案の履歴（v1〜v15、凍結）。v15/screenshots に確認用の画面
```

## ルール

- 前提・決定事項はすべて BRIEF.md に集約する（確定は `[日付確定]`、未確定は `[仮]`）
- 修正指示は DESIGN.md §6 修正ログに追記してから着手する（チャットで完結させない）
- **原稿はデザイン上で確定させる。** CONTENT.md は原本ではなくデザインの文言ミラー。食い違ったらデザイン側が正
- `design/` は案の履歴。編集しない

## サイトの直し方

1. 修正内容を `docs/DESIGN.md` §6 修正ログに追記する
2. `site/` の中を編集する。CSS は `site/scss/` を直して `npm run css`（書きながら見るなら `npm run css:watch`）。最初の 1 回だけ `npm install`
3. ローカルサーバで確認する

   ```bash
   python3 -m http.server 8137 --bind 127.0.0.1
   ```

   PC: http://127.0.0.1:8137/site/index.html

4. スクリーンショットを `design/v15/screenshots/` に保存し、DESIGN.md に §NN として記録する
5. 文言を変えたら `docs/CONTENT.md` に書き戻す

## 公開の仕方

```bash
npm run build
```

scss のコンパイルと `dist/` の書き出しをまとめて行う。`dist/` の中身をそのままドメイン直下に置く。サーバーには「見つからないときは `/404.html` を返す」設定を入れる（DESIGN.md §74）。公開前の確認事項は DESIGN.md §73・§74。
