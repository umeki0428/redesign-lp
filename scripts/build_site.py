#!/usr/bin/env python3
"""design/v15 から公開用の dist/ をつくる [DESIGN.md §73]

design/v15 には検討用のファイル（screenshots/、proposals/、cta-variations.html、使っていない画像）も
入っているので、公開する 4 ページ（index・privacy・thanks・404）と、そのページが参照しているファイルだけを dist/ に写す。
使い方:  python3 scripts/build_site.py      → dist/ ができる（.gitignore 済み）
"""
import re, shutil, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / 'design' / 'v15'
DST = ROOT / 'dist'
PAGES = ['index.html', 'privacy.html', 'thanks.html', '404.html']
STATIC = ['tracking.js', 'robots.txt', 'sitemap.xml', 'site.webmanifest',
          'favicon.ico', 'favicon.svg', 'apple-touch-icon.png', 'icon-192.png', 'icon-512.png', 'ogp.png']
REF = re.compile(r'''(?:src|href|content)=["']((?!https?:|#|mailto:|data:)[^"']+\.(?:png|jpe?g|webp|svg|gif|css|js|ico|json))["']''')


def referenced(html: str) -> set[str]:
    return {r.lstrip('/') for r in REF.findall(html)}  # 404.html はルートからの絶対パス


def main() -> int:
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
            print(f'NG: {page} が design/v15 の外を参照しています: {outside}', file=sys.stderr)
            return 1
        files |= refs
    for rel in sorted(files):
        src = SRC / rel
        if not src.is_file():
            missing.append(rel)
            continue
        dst = DST / rel
        dst.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(src, dst)
    if missing:
        print('NG: 見つからないファイル: ' + ', '.join(missing), file=sys.stderr)
        return 1
    total = sum(p.stat().st_size for p in DST.rglob('*') if p.is_file())
    print(f'OK: {len(files)} ファイル、{total/1e6:.1f} MB → {DST}')
    return 0


if __name__ == '__main__':
    sys.exit(main())
