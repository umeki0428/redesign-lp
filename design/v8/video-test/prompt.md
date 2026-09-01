# 02 機構図アニメーション — 動画生成テスト用素材

## 素材

| ファイル | 用途 |
|---|---|
| `frame-start.png` | 始点画像（1920×1080 / 16:9）。ローカルMiniMax H3のi2v入力はこれ |
| `frame-end.png` | 終点画像（同サイズ、CTAが発光）。Seedance 2.0/2.5 の start+end frame 実験用 |

再生成する場合: `design/v8` で `python3 -m http.server 8767` →
`video-test/frame-start.html` / `frame-end.html` を1920×1080でスクショ。

## ねらう動き（6〜10秒ループ）

1. 0–2s: 入口の4つの箱（検索/広告/SNS/紹介）が順に小さく点灯し、白い光の粒がこぼれ出す
2. 2–5s: 粒が収束線に沿って流れ、ブラウザ枠に吸い込まれる。中の3行が上から順にハイライト
3. 5–8s: 粒が下の矢印を通って赤いボタンに到達。ボタンがひと呼吸ふくらんで発光
4. カメラは完全固定。図形と文字は変形させない

## i2vプロンプト（日本語）

```
フラットデザインのインフォグラフィックを、モーショングラフィックス風にアニメーションさせる。
カメラは完全に固定。図形・レイアウト・日本語の文字は一切変形させず、そのまま維持する。
上部の4つの白い箱から小さな白い光の粒が流れ出し、細い線に沿って中央のブラウザウィンドウへ
吸い込まれていく。ブラウザ内の3つのベージュの行が上から順にやわらかくハイライトされる。
その後、粒が下向きの矢印を通って赤いボタンへ流れ、赤いボタンがゆっくり脈打つように発光する。
ミニマルな2Dモーショングラフィックス。滑らかで上品な動き。ループ可能。
```

## i2v prompt (English)

```
Animate this flat-design infographic as subtle motion graphics.
Camera completely static, locked off. Do not deform, redraw or morph any shapes,
layout or Japanese text — keep them pixel-stable.
Small white light particles emit from the four white boxes at the top, flow along
the thin connector lines, and get absorbed into the browser window in the center.
The three beige rows inside the browser highlight softly one by one, top to bottom.
Then particles travel down the arrow into the red button, which pulses with a soft glow.
Minimal 2D motion graphics style, smooth elegant easing, seamless loop.
```

## ネガティブ/制約（対応していれば）

```
no camera movement, no zoom, no pan, no text morphing, no shape distortion,
no 3D, no people, no photorealism, no added objects
```

## パラメータの目安

- ローカルH3: 6s / 1080p / cfg高め（プロンプト追従優先）。文字が崩れる場合は解像度を上げるより cfg・プロンプト強化が先
- 判定基準: ①文字が読めるか ②箱・線が形を保つか ③粒の流れが意図の方向か。3つ通ればクラウド実験へ

## クラウド実験（Higgsfield / Seedance）

利用可能モデル（確認済み 2026-08-30）:

| モデル | 特徴 |
|---|---|
| `seedance1_5` (1.5 Pro) | 4/8/12s、〜1080p、モーション堅実 |
| `seedance_2_0` | 4–15s、〜4K、**start+end frame両対応**・参照画像/映像/音声、unlim対象 |
| `seedance_2_0_mini` | 速い・安い、〜720p |
| `seedance_2_5` | t2v/omni_reference/**video_edit**/**video_extension**、4–30s |

実験プラン案:
1. `seedance_2_0` に frame-start + frame-end を渡し、同じENプロンプトで 8s / 720p / 音声off
2. 良ければ 1080p or 4K で本番書き出し
3. H3のローカル出力が良かった場合、その動画を `seedance_2_5` の video_edit / extension に食わせて高品質化する経路もあり
