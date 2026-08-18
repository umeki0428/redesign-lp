# プラグイン・MCP導入リスト

本プロジェクト(LPリデザイン)で導入を検討・利用するClaude Codeのプラグイン/MCPサーバー/スキルの一覧。

- **プラグイン/スキル**: Claude Code内で `/plugin` から導入。デザイン指針やコマンドを追加する
- **MCPサーバー**: ターミナルで `claude mcp add` により登録。外部ツール連携(ブラウザ操作・計測など)

## 導入予定・検討リスト

### デザイン品質(個性的なデザインを引き出す)

| 名称 | 種別 | 提供元 | 優先度 | 状態 |
|---|---|---|---|---|
| frontend-design | プラグイン | Anthropic公式 | ★★★ | 未導入 |
| awwwards | スキル | コミュニティ | ★★★ | 未導入 |
| Impeccable | スキル | コミュニティ | ★☆☆ | 未導入 |
| ui-ux-pro-max | スキル/プラグイン | コミュニティ | ★☆☆ | 未導入 |
| Mobbin MCP | MCP | Mobbin公式(要有料プラン) | ★☆☆ | 未導入 |

#### frontend-design(Anthropic公式)

「AIっぽい無難なデザイン」を避け、個性的で本番品質のUI(大胆なタイポグラフィ、印象的な配色、明確なヒエラルキー)を生成させる公式プラグイン。導入後は自動で効く。

```
/plugin install frontend-design@claude-plugins-official
```

#### awwwards(コミュニティ)

Awwwardsの審査基準をベースにした具体的なデザイン語彙(流体タイポグラフィ、OKLCHカラー、ベントーグリッド、GSAPモーションパターン)と、AIっぽいアンチパターンの回避ルールを提供。frontend-designと併用可。

- 導入前にGitHubで実リポジトリを確認すること(フォーク・名称変動あり)

#### Impeccable(コミュニティ)

`typeset` / `colorize` / `animate` / `bolder` / `quieter` など23コマンドでデザイン調整。27のアンチパターン検出ルールを持つ「校閲者」的スキル。

#### ui-ux-pro-max(コミュニティ)

67のUIスタイル、161のカラーパレット、タイポグラフィ/アクセシビリティルールのデータベース。「UI/UX Pro Maxを使って〜」と明示指示すると効果的。

```
/plugin marketplace add nextlevelbuilder/ui-ux-pro-max-skill
/plugin install ui-ux-pro-max
```

#### Mobbin MCP(Mobbin公式)

実在プロダクトの62万枚以上のUIスクリーンを参照させるMCP。実際に世に出たパターンに基づいた提案が可能。Mobbin有料プランが必要。

### アニメーション

| 名称 | 種別 | 提供元 | 優先度 | 状態 |
|---|---|---|---|---|
| GSAP(gsap-skills) | スキル | GreenSock公式 | ★★☆ | 未導入 |
| gsap-mcp | MCP | コミュニティ | ★☆☆ | 未導入 |

#### GSAP

スクロール連動・パララックス・タイムライン制御などのアニメーション実装支援。信頼性重視ならGreenSock公式の [gsap-skills](https://github.com/greensock/gsap-skills) を推奨。コミュニティ製MCPの場合:

```
claude mcp add gsap npx @vinhnguyen/gsap-mcp@latest
```

導入タイミング: アニメーション実装フェーズに入ってから。

### 検証・QA・パフォーマンス

| 名称 | 種別 | 提供元 | 優先度 | 状態 |
|---|---|---|---|---|
| Playwright MCP | MCP | Microsoft公式 | ★★☆ | 未導入 |
| Chrome DevTools MCP | MCP | Google | ★★☆ | 未導入 |
| Claude in Chrome | MCP | Anthropic公式 | - | 導入済み |

#### Playwright MCP

Claudeが実ブラウザを操作。表示確認、レスポンシブチェック、自然言語でのQA(「CTAをクリックしてフォームが出るか確認」)が可能。使用時は「Playwright MCPで」と明示すると確実。

```
claude mcp add playwright npx @playwright/mcp@latest
```

#### Chrome DevTools MCP

パフォーマンス計測、Lighthouse監査、アニメーションのカクつき診断。GSAP導入後の60fps確認・レイアウトシフト検出に有効。

```
claude mcp add chrome-devtools npx chrome-devtools-mcp@latest
```

#### Claude in Chrome(導入済み)

Anthropic公式のブラウザ操作ツール。表示確認レベルならPlaywrightなしで代替可能。

### デプロイ・デザイン連携(状況次第)

| 名称 | 種別 | 提供元 | 条件 |
|---|---|---|---|
| Vercel MCP | MCP | Vercel公式 | Vercelでホスティングする場合 |
| Figma MCP | MCP | Figma公式 | Figmaでカンプを扱う場合 |

## 導入時の注意

- **公式(Anthropic / Microsoft / Google / Vercel / Figma / Mobbin)**: 低リスク
- **コミュニティ製**: 導入前にGitHubリポジトリの実在・中身を確認する。スキルはClaudeへの指示文なので一読してから導入するのが理想
- MCPサーバーの実行には Node.js(`npx`)が必要
- プラグイン導入後は再起動または `/reload-plugins` で反映
