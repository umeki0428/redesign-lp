#!/usr/bin/env python3
"""site/ から公開用の dist/ をつくる [DESIGN.md §73・§75]

site/ が本番の元。公開する 4 ページ（index・privacy・thanks・404）と、そのページが参照しているファイルだけを dist/ に写す
（site/ に検討用のファイルを置かないための保険）。
使い方:  npm run build（= npm run css → python3 scripts/build_site.py）→ dist/ ができる（.gitignore 済み）
CSS は site/scss/ が元で、site/assets/css/style.css はそのコンパイル結果 [§84]。scss のほうが新しいときは止まる
"""
import re, shutil, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / 'site'
DST = ROOT / 'dist'
PAGES = ['index.html', 'privacy.html', 'thanks.html', '404.html']   # 公開するのは C案だけ [§111]
STATIC = ['tracking.js', 'robots.txt', 'sitemap.xml', 'site.webmanifest',
          'favicon.ico', 'favicon.svg', 'apple-touch-icon.png', 'icon-192.png', 'icon-512.png', 'ogp.png']
REF = re.compile(r'''(?:src|href|content)=["']((?!https?:|#|mailto:|data:)[^"']+\.(?:png|jpe?g|webp|svg|gif|css|js|ico|json))["']''')


def referenced(html: str) -> set[str]:
    return {r.lstrip('/') for r in REF.findall(html)}  # 404.html はルートからの絶対パス


def css_is_stale() -> bool:
    """site/scss/ のどれかが style.css より新しければ True（npm run css を忘れている）[§84]"""
    css = SRC / 'assets/css/style.css'
    if not css.is_file():
        return True
    return any(p.stat().st_mtime > css.stat().st_mtime for p in (SRC / 'scss').glob('*.scss'))


VERSIONED = ('assets/css/style.css', 'assets/main.js', 'assets/contact-form.js', 'tracking.js')   # 中身が変わるたびに ?v= が変わるファイル


def file_version(rel: str) -> str:
    """ファイルの中身から 8 桁の印をつくる。dist のページでは style.css?v=印 のように読み、公開後にブラウザの古いキャッシュが残らないようにする [§84]。
    JS も同じにする（スマホの Safari は main.js を再取得せず、古い動きのまま残ったことがある）[§122]"""
    import hashlib
    return hashlib.sha1((SRC / rel).read_bytes()).hexdigest()[:8]


def add_versions(html: str) -> str:
    """ページの中の style.css・JS の参照に ?v=印 を付ける"""
    for rel in VERSIONED:
        html = html.replace(f'{rel}"', f'{rel}?v={file_version(rel)}"')
    return html


def main() -> int:
    if css_is_stale():
        print('NG: site/scss/ が site/assets/css/style.css より新しい。先に npm run css を実行してください', file=sys.stderr)
        return 1
    if DST.exists():
        shutil.rmtree(DST)
    DST.mkdir()
    files: set[str] = set(PAGES) | set(STATIC)
    missing: list[str] = []
    for page in PAGES:
        html = (SRC / page).read_text(encoding='utf-8')
        refs = referenced(html)
        outside = sorted(r for r in refs if r.startswith('../'))
        if outside:
            print(f'NG: {page} が site/ の外を参照しています: {outside}', file=sys.stderr)
            return 1
        files |= refs
    for rel in sorted(files):
        src = SRC / rel
        if not src.is_file():
            missing.append(rel)
            continue
        dst = DST / rel
        dst.parent.mkdir(parents=True, exist_ok=True)
        if rel in PAGES:
            dst.write_text(add_versions(src.read_text(encoding='utf-8')), encoding='utf-8')
        elif rel.endswith('.css'):
            # ソースマップは検証用（site/ で使う）。公開用には要らないので、参照の行だけ外す [§115]
            css = re.sub(r'\n/\*# sourceMappingURL=[^*]*\*/\s*$', '\n', src.read_text(encoding='utf-8'))
            dst.write_text(css, encoding='utf-8')
        else:
            shutil.copy2(src, dst)
    if missing:
        print('NG: 見つからないファイル: ' + ', '.join(missing), file=sys.stderr)
        return 1
    total = sum(p.stat().st_size for p in DST.rglob('*') if p.is_file())
    print(f'OK: {len(files)} ファイル、{total/1e6:.1f} MB → {DST}')
    return 0


if __name__ == '__main__':
    sys.exit(main())
