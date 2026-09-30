"""場面の HTML を 1 コマずつ書き出し、ナレーションを重ねて mp4 にする。

HTML 側は window.__render(t) と window.__duration を持つこと（pilot/scene1-v3.html を参照）。

使い方:
    pip install playwright   # 初回だけ。ブラウザは手元の Google Chrome を使う
    python render.py pilot/scene1-v3.html audio/s1-satoru.wav pilot/scene1-v3.mp4 --offset 0.40
    python render.py pilot/scene1-v3.html audio/s1-satoru.wav pilot/scene1-v3-motion.mp4 --offset 0.40 --query motion
"""

import argparse
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

from playwright.sync_api import sync_playwright

FPS = 30
WIDTH, HEIGHT = 1920, 1080


def render_frames(html: Path, out_dir: Path, query: str) -> float:
    with sync_playwright() as p:
        browser = p.chromium.launch(channel="chrome")
        page = browser.new_page(viewport={"width": WIDTH, "height": HEIGHT})
        page.goto(html.resolve().as_uri() + (f"?{query}" if query else ""))
        page.wait_for_load_state("networkidle")
        # 動画を使う場面は、全部の動画が読み込まれるまで待つ
        page.wait_for_function(
            "[...document.querySelectorAll('video')].every(v => v.readyState >= 2)"
        )
        page.evaluate("document.fonts.ready")
        duration = page.evaluate("window.__duration")
        if not isinstance(duration, (int, float)) or duration <= 0:
            raise ValueError(f"window.__duration が不正です: {duration!r}")
        total = round(duration * FPS)
        for i in range(total):
            page.evaluate(f"window.__render({i / FPS})")
            page.screenshot(path=str(out_dir / f"f{i:05d}.png"))
        browser.close()
    return duration


def encode(frames: Path, audio: Path, offset: float, duration: float, out: Path) -> None:
    delay_ms = round(offset * 1000)
    cmd = [
        "ffmpeg", "-v", "error", "-y",
        "-framerate", str(FPS), "-i", str(frames / "f%05d.png"),
        "-i", str(audio),
        "-filter_complex", f"[1:a]adelay={delay_ms}:all=1,apad[a]",
        "-map", "0:v", "-map", "[a]", "-t", f"{duration:.3f}",
        "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "18",
        "-c:a", "aac", "-b:a", "192k", str(out),
    ]
    subprocess.run(cmd, check=True)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("html", type=Path)
    ap.add_argument("audio", type=Path)
    ap.add_argument("out", type=Path)
    ap.add_argument("--offset", type=float, default=0.0, help="ナレーションを遅らせる秒数")
    ap.add_argument("--query", default="", help="HTML に付ける URL パラメータ（例: motion）")
    args = ap.parse_args()
    for f in (args.html, args.audio):
        if not f.exists():
            print(f"見つかりません: {f}", file=sys.stderr)
            return 1
    tmp = Path(tempfile.mkdtemp(prefix="explainer-"))
    try:
        duration = render_frames(args.html, tmp, args.query)
        encode(tmp, args.audio, args.offset, duration, args.out)
    finally:
        shutil.rmtree(tmp, ignore_errors=True)
    print(f"書き出しました: {args.out}（{duration} 秒）")
    return 0


if __name__ == "__main__":
    sys.exit(main())
