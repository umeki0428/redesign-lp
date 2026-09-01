# STORYBOARD — 広告動画 A案・B案

Googleリスティング広告（P-Max）用の15秒動画2本の絵コンテと、制作フロー。
絵（線画の絵コンテ）は `design/storyboard/index.html` をブラウザで開く。このファイルは文言・プロンプト・手順の正とする。

作成: 2026-08-26 ／ ステータス: **[仮]** — §5 の確認事項が未回答

---

## 1. 前提

- 尺 **15秒 ／ 5秒 × 3カット**、16:9 で制作し、あとから 9:16・1:1 に展開する
- **制作方式: 実写プレート ＋ グラフィック後乗せ** [2026-08-26確定]
  - AI動画には**実写の芝居だけ**を生成させる（人の動き・光・空気感）
  - **テロップ・赤い矢羽・ロゴ・CTAは一切生成させず、後から合成する**
  - 理由: AI生成の最大の失敗要因である文字崩れ・ロゴ崩れをゼロにでき、ブランド要素が常に完璧な状態で出せる
- **画づくり: 柔らかい昼光・浅い被写界深度・低彩度・顔を主役にしない**
  - 参考動画（静かな間で引っ張り、最後にロゴへ着地する日本のTVCMの空気）に準拠
  - 顔を避けるのは、①AI動画は顔のクローズアップで不気味さが出やすくリトライ消費の最大要因になる ②LPの「顔写真を使わない」方針（BRIEF §2・§9）と揃い、広告→LPの空気が連続する、の2点から
- **2本とも作る**。P-Maxはアセットグループに動画を複数入れたほうが配信が最適化されるため、直接型・間接型の2本体制は運用上も合理的で、どちらが効くかの実データも取れる

---

## 2. A案「選ばれたのは、伝わったほう。」

直接型。同一人物の行動対比で「離脱」と「即決」を描く。画面の中身を一度も映さず、仕草だけでサイトの良し悪しを語る。

| カット | 尺 | 画 | 音・テロップ |
|---|---|---|---|
| 1 | 0:00–0:05 | カフェの窓際、午後の柔らかい光。手前にスマホを持つ手（ピント面）、奥の横顔は浅いボケで顔は判別できない。**ピンチズームを繰り返す → スクロールが速くなる → 小さくため息 → スマホを伏せる** | 環境音のみ／テロップ「伝わらないサイトは、静かに離脱されていく。」 |
| 2 | 0:05–0:10 | 同じ人物・同じ席の引き。**画面を一度タップし、すっと立ち上がって外の光へ歩き出す**。後ろ姿。伏せたままのスマホと引かれた椅子が残る。カメラはごく遅く寄る | 環境音・椅子の音／テロップ「選ばれたのは、伝わったほうでした。」 |
| 3 | 0:10–0:15 | 白の色面がすっと広がり、**赤い矢羽 → ロゴに変化して静止**。下にタグライン。※AI生成なし | ナレーション「届け方と伝え方で、結果は変わる。**ホームページ制作なら、リデザイン。**」 |

**狙い**: 「迷う仕草 → 即決の仕草」という人間の芝居はAI動画の得意領域。層B（リニューアル検討層）の経営者が見ると「離脱されている側は自社かもしれない」と読める構造にしてある。

---

## 3. B案「同じ商品なのに。」

間接型。店先の before / after を**同一構図・同一光**で見せる。Webの話を一度も画にしないため、層A（Web未保有層）にも届く。

| カット | 尺 | 画 | 音・テロップ |
|---|---|---|---|
| 1 | 0:00–0:05 | 商店街の小さなパン屋の店先、朝の光。商品は雑然と積まれ、**通行人の足が一度も止まらず流れていく**。足元のみのフレーミング。少し寂しい静けさ | 環境音のみ／テロップ「同じ商品。」 |
| 2 | 0:05–0:10 | 同じ店先。**並べ方と見せ方だけが変わっている**（余白のある陳列、主役の一品が手前に）。足が止まり、手が商品に伸びる | 環境音・足が止まる音／テロップ「見せ方を変えただけ。」 |
| 3 | 0:10–0:15 | A案と共通のロゴ落ち | A案と同じ |

**命**: カット1と2が**同じ構図・同じ光で「陳列だけ違う」**こと。ここが崩れると企画が成立しない。だからカット2の画像は新規生成せず、**カット1の画像を編集して作る**（§4 工程2）。

---

## 4. 作業フロー

画像生成は GPT Image 2、動画生成は Higgsfield、合成は手元の ffmpeg。**クレジットを消費するのは工程4だけ**で、そこに入る前に静止画で品質を確定させる。

| 工程 | 内容 | 使うもの | クレジット |
|---|---|---|---|
| 1 | 絵コンテで構図・カット割り・文言を確定 | `design/storyboard/index.html` | 0 |
| 2 | キーフレーム静止画を生成（8枚） | GPT Image 2 | 0 |
| 3 | 受け入れチェック | Claude Code（画像を目視） | 0 |
| 4 | 動画化（4本 × 5秒、start/end 両端固定） | Higgsfield | **80** |
| 5 | カット3（ロゴ落ち）を制作 | HTML/SVG → 連番書き出し | 0 |
| 6 | 結合・テロップ・矢羽の合成 | ffmpeg | 0 |
| 7 | 9:16 / 1:1 へ展開 | Higgsfield reframe | 後日 |

残高110クレジットに対し工程4で80、**残り30がリトライの余力**。カット3は生成しないので、費用はカット1・2だけにかかる。

### 4.1 キーフレームの受け渡し

生成した画像は次の名前で `assets/storyboard/` に置く。この命名でそのまま工程4に流せる。

```
assets/storyboard/
  a1-start.png   a1-end.png
  a2-start.png   a2-end.png
  b1-start.png   b1-end.png
  b2-start.png   b2-end.png
```

置いたら Claude Code に「storyboard の画像を置いた」と伝える。工程3で内容を確認し、そのまま Higgsfield へアップロードして工程4に進む。

### 4.2 受け入れチェックの観点（工程3）

- **文字が写り込んでいないか** — 看板・値札・スマホ画面。1文字でも入っていたら不採用
- **顔が判別できないか** — ボケ・後ろ姿・見切れで処理されているか
- **A案の同一人物性** — カット1とカット2で服・髪・体格が一致しているか
- **B案の同一ロケ性** — カット1とカット2で庇・台・歩道・光の向きが完全に一致しているか
- **トーン** — 4枚（各案）で彩度・コントラストが揃っているか
- **9:16セーフ** — 主題が画面中央の縦長領域（幅の約56%）に収まっているか

---

## 5. GPT Image 2 用プロンプト

すべて英語・16:9。冒頭の共通ブロックを各プロンプトの先頭に付ける。

### 共通ブロック（毎回先頭に付ける）

```
Photorealistic still frame from a quiet Japanese television commercial.
Soft overcast daylight, muted low-saturation color grade, gentle contrast, natural skin tones.
Shallow depth of field. Locked-off camera at eye level unless noted.
Absolutely no text of any kind: no signage lettering, no labels, no price tags, no logos, no watermarks, no readable screen content.
No identifiable faces.
Landscape 16:9.
```

### A案

**`a1-start.png`**
```
Interior of a small quiet cafe beside a large window, mid-afternoon.
Foreground: a person's two hands holding a smartphone at chest height, hands in sharp focus, the screen dark and unreadable.
Background: the same person's shoulder and jawline fall into heavy bokeh; the face is not identifiable.
Warm wooden table, a pale ceramic cup at the edge of frame.
50mm, f/1.8, focus on the hands. Subject centered in frame.
```

**`a1-end.png`**
```
Same cafe, same window, same light, same framing as the previous image.
The smartphone now lies face down on the wooden table.
The hands are withdrawing from it, relaxed, resigned.
The same shoulder remains in heavy bokeh behind. 50mm, f/1.8.
```

**`a2-start.png`**
```
Wider view of the same cafe. Camera behind and slightly above a person seated at the window table, seen from the back; the face is never visible.
On the right side of frame, a doorway glows with soft daylight.
A smartphone lies face down on the table. An empty wooden chair beside.
35mm, f/2.8, eye level.
```

**`a2-end.png`**
```
Same cafe, same framing and light as the previous image.
The chair is now pushed back and empty.
The person stands mid-stride, seen from behind, walking toward the bright doorway on the right.
Backlit silhouette with soft rim light. The smartphone still lies face down on the table.
35mm, f/2.8.
```

### B案

**`b1-start.png`**
```
Exterior of a small neighborhood bakery on a Japanese shopping street, early morning side light.
A fabric awning with a scalloped edge hangs above a display counter.
The counter is cluttered: breads, trays and boxes piled densely and unevenly, no breathing room, no price tags.
Low camera framed on the pavement and the counter; any passers-by are visible only from the knees down.
Empty pavement in this frame. 35mm, f/4.
```

**`b1-end.png`**
```
Same bakery, identical framing, identical light as the previous image.
Several pedestrians' legs and feet pass through the frame mid-stride, slight motion blur on the feet.
None of them stop or turn toward the shop. 35mm, f/4.
```

**`b2-start.png`** — **新規生成せず `b1-start.png` を編集する**
```
Edit the given image. Keep the storefront, awning, display counter, pavement, camera angle and lighting exactly as they are.
Change only the display: remove all the clutter and arrange a few items with generous spacing on low wooden risers,
with one larger hero item on a taller riser at the center front.
Keep the pavement empty, no people. Do not add any text, labels or price tags.
```

**`b2-end.png`** — **`b2-start.png` を編集する**
```
Edit the given image. Keep everything identical.
Add one pair of feet standing still at the center of frame, toes turned toward the shop, no motion blur.
Add a single hand and forearm entering from the right edge, reaching toward the hero item.
Do not add any text or faces.
```

---

## 6. 未確定事項 [仮]

先に決めてから工程2に進む。

- **A案の場面** — カフェでよいか。オフィス・自宅・移動中も選べる。また「立ち上がって歩き出す」より「その場で電話をかける」のほうが結果として分かりやすい可能性がある
- **B案の業種** — パン屋でよいか。青果店・雑貨店・花屋も候補。花屋は画が華やかで、かつLPの低彩度トーンとも噛み合う
- **テロップ文言** — 落ちの2文「届け方と伝え方で、結果は変わる。」「ホームページ制作なら、リデザイン。」以外はすべて仮。特にA案カット1「静かに離脱されていく。」が強すぎないか
- **ナレーションの有無** — 音声を入れるか、テロップだけで見せるか。P-Maxは音声オフ再生が多いため、テロップだけでも成立する設計にしてある
- **会社表記** — 落ちのロゴは「RE DESIGN.」のロゴタイプのみとし、法人格表記（BRIEF §9）は入れない想定。広告表示上の要否は要確認
