import re, sys

VW, VH = 14.40, 9.00          # 1440 x 900 で固定
CQW_MV_LINE = 7.128           # .mv__copy の実幅 712.8px の 1%

VARS = {
 '--base':'#f5f2eb','--paper':'#fcfcfc','--ink':'#2b2b2b','--mint':'#b0dedb',
 '--support':'#e3eff5','--terra':'#9c6054','--red':'#d93832','--red-dark':'#c22f2a',
 '--lightred':'#ff9b8d','--text':'#333330','--muted':'#55524c','--container':'1240px',
 '--display':'"Zen Kaku Gothic New","Noto Sans JP","Hiragino Kaku Gothic ProN",sans-serif',
 '--body':'"Noto Sans JP","Zen Kaku Gothic New","Hiragino Kaku Gothic ProN",sans-serif',
 '--mono':'"JetBrains Mono","Noto Sans JP",ui-monospace,monospace',
}

def to_px(tok, cq=None):
    tok = tok.strip()
    m = re.fullmatch(r'(-?[\d.]+)(px|vw|vh|svh|cqw|%)?', tok)
    if not m: return None
    v, u = float(m.group(1)), m.group(2) or 'px'
    if u == 'px':  return v
    if u == 'vw':  return v * VW
    if u in ('vh','svh'): return v * VH
    if u == 'cqw': return v * (cq if cq else CQW_MV_LINE)
    return None

def split_args(s):
    out, depth, cur = [], 0, ''
    for ch in s:
        if ch == '(': depth += 1
        if ch == ')': depth -= 1
        if ch == ',' and depth == 0:
            out.append(cur); cur = ''
        else: cur += ch
    out.append(cur)
    return [a.strip() for a in out]

def resolve_fns(text, cq=None):
    """clamp() / min() / max() を内側から px に畳む"""
    pattern = re.compile(r'\b(clamp|min|max)\(')
    while True:
        m = None
        for cand in pattern.finditer(text):
            rest = text[cand.end():]
            depth = 1; i = 0
            while i < len(rest) and depth:
                if rest[i] == '(': depth += 1
                elif rest[i] == ')': depth -= 1
                i += 1
            inner = rest[:i-1]
            if not pattern.search(inner):     # 最内側のものだけ処理
                m = (cand, cand.end() + i, inner)
                break
        if not m: break
        cand, end, inner = m
        fn = cand.group(1)
        args = split_args(inner)
        vals = [to_px(a, cq) for a in args]
        if any(v is None for v in vals):
            # px化できない（fr や % 混在）ものは触らない
            text = text[:cand.start()] + fn.upper() + '(' + inner + ')' + text[end:]
            continue
        if fn == 'clamp': out = sorted(vals)[1]
        elif fn == 'min': out = min(vals)
        else: out = max(vals)
        text = text[:cand.start()] + f'{round(out,2):g}px' + text[end:]
    return text.replace('', '').replace('CLAMP(', 'clamp(').replace('MIN(', 'min(').replace('MAX(', 'max(')

def resolve_vars(text):
    for _ in range(6):
        def rep(m):
            name = m.group(1).strip()
            return VARS.get(name, m.group(0))
        new = re.sub(r'var\((--[a-z-]+)\)', rep, text)
        if new == text: break
        text = new
    return text

def resolve_units(text):
    def rep(m):
        v, u = float(m.group(1)), m.group(2)
        px = v*VW if u=='vw' else v*VH
        return f'{round(px,2):g}px'
    return re.sub(r'(-?[\d.]+)(vw|vh|svh)\b', rep, text)

src = open('index.html', encoding='utf-8').read()

# ---- 1. アニメーション／トランジション／未対応プロパティを除去 ----
src = re.sub(r'@media \(prefers-reduced-motion:no-preference\)\{.*?\n\}\n', '', src, flags=re.S)
src = re.sub(r'@media\(max-width:[^)]*\)\{[^{}]*(\{[^{}]*\}[^{}]*)*\}\n?', '', src)
src = re.sub(r'\s*(animation|transition|will-change|clip-path|text-wrap|container-type)\s*:[^;}]*;?', '', src)
src = re.sub(r'transform:translateX\(calc\([^)]*\)\)[;]?', '', src)
src = src.replace('overflow:clip', 'overflow:hidden')

# ---- 2. スクリプトを除去（静止版） ----
src = re.sub(r'<script>.*?</script>', '', src, flags=re.S)
src = re.sub(r'\son(submit|click)="[^"]*"', '', src)

# ---- 3. 疑似要素を実DOMへ（Figma変換で最も落ちやすい） ----
src = re.sub(r'\.flow__i::before\{[^}]*\}\n?', '', src)
src = re.sub(r'\.flow__i:last-child::before\{[^}]*\}\n?', '', src)
src = re.sub(r'\.flow__i:last-child::after\{[^}]*\}\n?', '', src)
src = src.replace('*,*::before,*::after{box-sizing:border-box}', '*{box-sizing:border-box}')
src = src.replace('.faq summary::-webkit-details-marker{display:none}\n', '')
src = src.replace('.flow__dot{',
  '.flow__line{position:absolute;top:10px;left:9px;width:calc(100% + 18px);height:2px;background:rgba(43,43,43,.28)}\n'
  '.flow__arrow{position:absolute;top:4px;left:26px;width:0;height:0;'
  'border-left:11px solid #d93832;border-top:7px solid transparent;border-bottom:7px solid transparent}\n'
  '.flow__dot{')
def add_flow_parts(m):
    i = add_flow_parts.n; add_flow_parts.n += 1
    extra = '<i class="flow__line"></i>' if i < 5 else '<i class="flow__arrow"></i>'
    return m.group(0) + extra
add_flow_parts.n = 0
src = re.sub(r'<li class="flow__i[^"]*">', add_flow_parts, src)

# ---- 4. details/summary を通常のdivへ（変換で閉じた状態になるのを防ぐ） ----
src = src.replace('<details class="faq" open>', '<div class="faq">').replace('<details class="faq">', '<div class="faq">')
src = src.replace('</details>', '</div>')
src = src.replace('<summary>', '<div class="faq__q">').replace('</summary>', '</div>')
src = src.replace('.faq summary{', '.faq__q{')

# ---- 5. カルーセルの translate をパディングに置換 ----
src = src.replace('<div id="work-track" class="track" style="">', '<div id="work-track" class="track" style="padding-left:331px">')
src = src.replace('<div id="work-track" class="track" >', '<div id="work-track" class="track" style="padding-left:331px">')

# ---- 6. CSS変数・clamp・相対単位を実値へ ----
src = resolve_vars(src)
src = resolve_fns(src)
src = resolve_units(src)
src = re.sub(r'\.mv__line\{([^}]*)font-size:[\d.]+px', lambda m: '.mv__line{'+m.group(1)+'font-size:50.6px', src)
src = src.replace('min-height:900px', 'height:900px')
src = re.sub(r':root\{[^}]*\}\n', '', src)

# ---- 7. 1440px固定 ----
src = src.replace('<body>', '<body style="width:1440px;margin:0">')
src = src.replace('<title>RE DESIGN LP v7</title>',
 '<title>RE DESIGN LP v7 (Figma)</title>\n'
 '<!-- html.to.design 取り込み用。1440px固定・アニメーション/疑似要素/CSS変数/clip-path を除去した静止版。\n'
 '     編集しない。index.html を変更したらこのファイルを再生成する（scratchpad/tofigma.py） -->')

leftover = re.findall(r'var\(--[a-z-]+\)|clamp\(|[\d.]+(?:vw|vh|svh|cqw)\b|::before|::after|animation:', src)
open('index.figma.html','w',encoding='utf-8').write(src)
print('leftover dynamic values:', sorted(set(leftover)) or 'なし')
print('lines:', src.count(chr(10)))
