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
          'favicon.ico', 'favicon.svg', 'apple-touch-icon.png', 'icon-192.png', 'icon-512.png', 'ogp.png', '.htaccess']   # .htaccess は 404 ページの設定 [§128]
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


def strip_comments(html: str) -> str:
    """HTML のコメント（作業の覚え書き。DESIGN.md の節番号や [仮] の印）は公開用には要らないので外す [§124]"""
    return re.sub(r'[ \t]*<!--[\s\S]*?-->\n?', '', html)


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
            dst.write_text(add_versions(strip_comments(src.read_text(encoding='utf-8'))), encoding='utf-8')
        elif rel == 'assets/css/style.css':
            # 公開用は圧縮した CSS を scss から作り直す（ソースマップなし）。site/ の style.css は検証用に展開のまま [§115・§124]
            import subprocess
            r = subprocess.run(['npx', 'sass', '--no-source-map', '--style=compressed', str(SRC / 'scss/style.scss'), str(dst)], capture_output=True, text=True)
            if r.returncode != 0:
                print('NG: sass の圧縮に失敗\n' + r.stderr, file=sys.stderr)
                return 1
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
