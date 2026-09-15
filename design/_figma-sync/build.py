# -*- coding: utf-8 -*-
"""extract.mjs の JSON → use_figma に貼るプラグイン JS。1 回 50,000 字の上限があるので分割する。
usage: python3 build.py <in.json> <frameName> <outPrefix> [--page 90:1599] [--x 0 --y 0]
  出力: <outPrefix>-0.js（フレームを作って最初のノードを置く）, <outPrefix>-1.js …（フレーム id を引数に追記）
  2 つ目以降は先頭の FRAME_ID を、1 つ目の実行結果の id に書き換えて実行する"""
import json, sys, math

LIMIT = 46000
args = sys.argv[1:]
src, frame_name, prefix = args[0], args[1], args[2]
page = args[args.index('--page') + 1] if '--page' in args else None
fx = float(args[args.index('--x') + 1]) if '--x' in args else 0
fy = float(args[args.index('--y') + 1]) if '--y' in args else 0

d = json.load(open(src, encoding='utf-8'))

# 既存の MV の画像ハッシュ（develop ページ 116:6〜 の div.blk。ファイル名で対応）
IMG = {
    'give_mv.png': '373dc39f9502d011a4afdfb6b5b61611c6245af2',
    'sharedan.png': '5c5db48944e3012c9db2cf88c5f5f6a030557ea3',
    'shot-1.png': 'b3b12a3b26b716f3f5ae087de4682daeab7c5a28',
    'symdirect.png': '4b1954da9cd969bbe2397664944c29fc45563a2a',
    'shot-4.png': '883f48e1009060facd97883937faff04c9eacc81',
    'shot-2.png': 'bf333513e3cf553ddcc76c66ba2a127880e2bd83',
    'shot-5.png': 'f66d8f43370b4a2ae7e536dc63311d0984fec494',
    'shot-3.png': '036fde0d4f24ac530a66930b1d20f96d7272922b',
}

def compact(n):
    """キーを短く、数値を丸める"""
    o = {'k': n['k'], 'x': n['x'], 'y': n['y'], 'nm': n.get('name', '')[:40], 'op': n.get('op', 1)}
    if n['k'] == 'r':
        o.update({'w': n['w'], 'h': n['h'], 'f': n.get('f'), 'rad': n.get('rad'), 'el': n.get('el', False), 'st': n.get('st'), 'sh': n.get('sh') or None, 'rot': n.get('rot', 0)})
    elif n['k'] == 't':
        o.update({'t': n['t'], 'fo': n['font'], 'c': n['c'], 'al': n.get('al', 'left')})
        if n.get('w'): o['w'] = n['w']
    elif n['k'] == 's':
        o.update({'w': n['w'], 'h': n['h'], 'svg': n['svg']})
    elif n['k'] == 'i':
        o.update({'w': n['w'], 'h': n['h'], 'img': IMG.get(n['file']), 'rad': n.get('rad')})
    return o

nodes = [compact(n) for n in d['nodes']]

HEAD = r'''
const FRAME_ID = %s;
const PAGE_ID = %s;
const FRAME = {name: %s, w: %s, h: %s, x: %s, y: %s};
const NODES = %s;

const FAM = {'Arial': 'Noto Sans JP', 'Hiragino Kaku Gothic ProN': 'Noto Sans JP', 'sans-serif': 'Noto Sans JP'};
const fam = f => FAM[f] || f;
const styleFor = (f, w) => fam(f) === 'Manrope' ? (w >= 800 ? 'ExtraBold' : w >= 700 ? 'Bold' : 'Regular')
  : (w >= 900 ? 'Black' : w >= 700 ? 'Bold' : w >= 500 ? 'Medium' : w <= 300 ? 'Light' : 'Regular');
const P = c => ({ r: c[0] / 255, g: c[1] / 255, b: c[2] / 255 });
const solid = (c, op) => [{ type: 'SOLID', color: P(c), opacity: Math.max(0, Math.min(1, c[3] * (op === undefined ? 1 : 1))) }];

let frame;
if (FRAME_ID) frame = await figma.getNodeByIdAsync(FRAME_ID);
else {
  frame = figma.createFrame();
  frame.name = FRAME.name; frame.resize(FRAME.w, FRAME.h); frame.fills = []; frame.clipsContent = true;
  frame.x = FRAME.x; frame.y = FRAME.y;
  if (PAGE_ID) { const pg = await figma.getNodeByIdAsync(PAGE_ID); await pg.loadAsync(); pg.appendChild(frame); }
}

const fonts = {}; NODES.forEach(n => { if (n.k === 't') fonts[fam(n.fo.f) + '|' + styleFor(n.fo.f, n.fo.w)] = 1; });
const loaded = {};
for (const key of Object.keys(fonts)) {
  const [family, style] = key.split('|');
  try { await figma.loadFontAsync({ family, style }); loaded[key] = { family, style }; }
  catch (e) { try { await figma.loadFontAsync({ family, style: 'Regular' }); loaded[key] = { family, style: 'Regular' }; } catch (e2) { await figma.loadFontAsync({ family: 'Noto Sans JP', style: 'Regular' }); loaded[key] = { family: 'Noto Sans JP', style: 'Regular' }; } }
}

const failed = [];
for (const n of NODES) {
  try {
    let node;
    if (n.k === 'r' || n.k === 'i') {
      node = n.el ? figma.createEllipse() : figma.createRectangle();
      node.resize(Math.max(n.w, 0.01), Math.max(n.h, 0.01));
      if (n.k === 'i') node.fills = n.img ? [{ type: 'IMAGE', scaleMode: 'FILL', imageHash: n.img }] : [{ type: 'SOLID', color: { r: .89, g: .94, b: .96 } }];
      else node.fills = n.f ? solid(n.f) : [];
      if (!n.el && n.rad) { node.topLeftRadius = n.rad[0]; node.topRightRadius = n.rad[1]; node.bottomRightRadius = n.rad[2]; node.bottomLeftRadius = n.rad[3]; }
      if (n.st) {
        node.strokes = solid(n.st.c); node.strokeAlign = 'INSIDE';
        const w = n.st.w; const mx = Math.max(...w);
        if (n.el || w.every(v => v === mx)) node.strokeWeight = mx;
        else { node.strokeTopWeight = w[0]; node.strokeRightWeight = w[1]; node.strokeBottomWeight = w[2]; node.strokeLeftWeight = w[3]; }
        if (n.st.d) node.dashPattern = [4, 4];
      }
      if (n.sh && n.sh.length) node.effects = n.sh.map(e => ({ type: 'DROP_SHADOW', color: { ...P(e.c), a: e.c[3] }, offset: { x: e.x, y: e.y }, radius: e.b, spread: e.s, visible: true, blendMode: 'NORMAL' }));
      node.x = n.x; node.y = n.y;
      frame.appendChild(node);
      if (n.rot) {
        const cx = n.x + n.w / 2, cy = n.y + n.h / 2;
        node.rotation = -n.rot;
        const bb = node.absoluteBoundingBox, fb = frame.absoluteBoundingBox;
        node.x += cx - ((bb.x - fb.x) + bb.width / 2); node.y += cy - ((bb.y - fb.y) + bb.height / 2);
      }
    } else if (n.k === 't') {
      node = figma.createText();
      const key = fam(n.fo.f) + '|' + styleFor(n.fo.f, n.fo.w);
      node.fontName = loaded[key];
      node.characters = n.t;
      node.fontSize = n.fo.s;
      node.lineHeight = { value: n.fo.lh, unit: 'PIXELS' };
      node.letterSpacing = { value: n.fo.ls, unit: 'PIXELS' };
      node.fills = solid(n.c);
      if (n.w) { node.textAutoResize = 'HEIGHT'; node.resize(n.w, n.fo.lh); node.textAlignHorizontal = n.al === 'center' ? 'CENTER' : n.al === 'right' ? 'RIGHT' : 'LEFT'; }
      else node.textAutoResize = 'WIDTH_AND_HEIGHT';
      node.x = n.x; node.y = n.y;
      frame.appendChild(node);
    } else if (n.k === 's') {
      node = figma.createNodeFromSvg(n.svg);
      if (Math.abs(node.width - n.w) > 0.5 && node.width > 0) node.rescale(n.w / node.width);
      node.x = n.x; node.y = n.y;
      frame.appendChild(node);
    }
    if (node) { node.name = n.nm; if (n.op < 1) node.opacity = n.op; }
  } catch (e) { failed.push(n.nm + ': ' + e); }
}
return { id: frame.id, name: frame.name, children: frame.children.length, failed: failed.slice(0, 20) };
'''

def js(v): return json.dumps(v, ensure_ascii=False, separators=(',', ':'))

# 分割：ノード列を LIMIT に収まるように
chunks, cur, size = [], [], 0
base = len(HEAD) + 400
for n in nodes:
    s = len(js(n)) + 1
    if cur and base + size + s > LIMIT:
        chunks.append(cur); cur, size = [], 0
    cur.append(n); size += s
if cur: chunks.append(cur)

for i, ch in enumerate(chunks):
    code = HEAD % ('null' if i == 0 else '"__FRAME_ID__"', js(page) if (page and i == 0) else 'null',
                   js(frame_name), d['w'], d['h'], fx, fy, js(ch))
    open('%s-%d.js' % (prefix, i), 'w', encoding='utf-8').write(code)
    print('%s-%d.js' % (prefix, i), len(code), 'chars', len(ch), 'nodes')
