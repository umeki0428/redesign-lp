#!/usr/bin/env bash
# 場面の mp4 をつないで 1 本にする。章の切り替えは右→左のワイプ（0.4 秒）
# 各場面の最後のコマを 0.4 秒のばして、その上をワイプで次の場面に替えるので、全体の長さは各場面の合計と同じ
#
# 使い方: ./assemble.sh 出力.mp4 場面1.mp4 場面2.mp4 ...
set -euo pipefail

WIPE=0.4

if [ "$#" -lt 3 ]; then
  echo "使い方: $0 出力.mp4 場面1.mp4 場面2.mp4 ..." >&2
  exit 1
fi
out="$1"; shift
for f in "$@"; do
  [ -f "$f" ] || { echo "見つかりません: $f" >&2; exit 1; }
done

inputs=(); durs=()
for f in "$@"; do
  inputs+=(-i "$f")
  durs+=("$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$f")")
done
n=$#

filter=""
# 映像: 最後以外は末尾を 0.4 秒のばす → 順に xfade（wipeleft）
for ((i = 0; i < n; i++)); do
  if ((i < n - 1)); then
    filter+="[$i:v]settb=AVTB,fps=30,tpad=stop_mode=clone:stop_duration=$WIPE[v$i];"
  else
    filter+="[$i:v]settb=AVTB,fps=30[v$i];"
  fi
done
prev="v0"; offset=0
for ((i = 1; i < n; i++)); do
  offset=$(echo "$offset + ${durs[$((i - 1))]}" | bc -l)
  filter+="[$prev][v$i]xfade=transition=wipeleft:duration=$WIPE:offset=$offset[x$i];"
  prev="x$i"
done
# 音声: 各場面の長さにそろえて順につなぐ（映像の場面の頭と同じ位置に来る）
for ((i = 0; i < n; i++)); do
  filter+="[$i:a]apad,atrim=0:${durs[$i]},asetpts=PTS-STARTPTS[a$i];"
done
for ((i = 0; i < n; i++)); do filter+="[a$i]"; done
filter+="concat=n=$n:v=0:a=1[aout]"

ffmpeg -v error -y "${inputs[@]}" -filter_complex "$filter" -map "[$prev]" -map "[aout]" \
  -c:v libx264 -pix_fmt yuv420p -crf 18 -c:a aac -b:a 192k "$out"
echo "書き出しました: $out（$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$out") 秒）"
