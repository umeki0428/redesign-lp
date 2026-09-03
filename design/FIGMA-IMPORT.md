# Figma 取り込み用ファイル

## 対象

| 元ファイル | Figma取り込み用 |
|---|---|
| `design/v11/index.html`（柔らかい多色版） | `design/v11/figma/v11-figma.html` |
| `design/fable-test/design-C.html`（参考あり・赤基調） | `design/fable-test/figma/design-C-figma.html` |

## 取り込み手順

1. Figma で「リソース → プラグイン →**html.to.design**」を実行
2. **File タブ → Upload** で上記の `*-figma.html` を選択
3. ビューポート幅 **1440** で Import（モバイルも要るなら 390 でもう一度）

## 何を変換してあるか

HTML→Figma 変換プラグインが取りこぼす機能を、事前に潰してある。

| 変換で失われるもの | 対処 |
|---|---|
| 疑似要素 `::before` / `::after` | **実DOM要素に変換**（v11: 60件 / C案: 44件） |
| `clip-path: polygon()` | **インラインSVGのpolygonに変換**（v11: 6件 / C案: 16件） |
| CSS変数 `var(--x)` | 算出値に解決してインライン化（残存0〜3件） |
| CSS由来のSVGの塗り・線 | `fill` / `stroke` などを**プレゼンテーション属性として固定**（v11: 29要素 / C案: 78要素） |
| スクロールで出現する要素 | 全要素を可視化した状態で固定 |
| アニメーション・トランジション | 除去（取り込み時の中間状態を防止） |

`<style>` と `<script>` は全て除去し、スタイルは各要素のインラインに確定させてある。

## 検証済み

- 元ファイルと**同一の見た目**でレンダリングされることを確認（v11: 10,594px / C案: 12,876px、いずれも横スクロールなし・12セクション）
- SVG図解（三角図・体制図など）の塗りと線が保持されることを確認

## 再生成

元のHTMLを編集したら、この変換版も作り直す必要がある。変換スクリプトは `design/_figma-flatten.js`。
ローカルサーバでページを開き、このJSを読み込んで `window.__flatten()` を実行 → `document.documentElement.outerHTML` を保存する。

## 注意

- 変換版は**Figma取り込み専用**。ブラウザでの本番用途には元ファイル（`index.html` / `design-C.html`）を使うこと
- フォント（Zen Kaku Gothic New / Manrope / Noto Sans JP など）は Google Fonts のため Figma 側にも存在する。置き換わった場合は Figma でフォント指定し直す
