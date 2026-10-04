#!/usr/bin/env bash
# Screenshot an entry's work into assets/thumbs/ and set `thumb:` in its front matter.
#
#   scripts/thumb.sh _posts/2026-10-04-abyss.md
#
# Needs Chrome/Chromium (set CHROME=/path/to/chrome if it isn't found) and ImageMagick.
set -euo pipefail
cd "$(dirname "$0")/.."

post="${1:?usage: thumb.sh _posts/<entry>.md}"
name=$(basename "$post" .md)
src=$(sed -n 's/^src: *//p' "$post" | head -1)
[[ -z "$src" ]] && { echo "$post has no src: — nothing to screenshot" >&2; exit 1; }

chrome="${CHROME:-}"
for c in google-chrome chromium chromium-browser /opt/pw-browsers/chromium-*/chrome-linux/chrome \
         "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"; do
  [[ -z "$chrome" ]] && command -v "$c" >/dev/null 2>&1 && chrome="$c"
done
[[ -z "$chrome" ]] && { echo "Chrome not found; set CHROME=/path/to/chrome" >&2; exit 1; }

port=8765
python3 -m http.server "$port" --bind 127.0.0.1 >/dev/null 2>&1 &
server=$!
trap 'kill $server' EXIT
sleep 1

out="assets/thumbs/${name}.jpg"
shot="$(mktemp -d)/shot.png"
"$chrome" --headless --no-sandbox --hide-scrollbars --enable-unsafe-swiftshader \
  --window-size=1280,900 --virtual-time-budget="${WAIT_MS:-8000}" \
  --screenshot="$shot" "http://127.0.0.1:${port}${src}" >/dev/null 2>&1
convert "$shot" -crop 1280x800+0+0 +repage -resize 800x500 -quality 82 "$out"
rm -rf "$(dirname "$shot")"

if grep -q '^thumb:' "$post"; then
  sed -i.bak "s|^thumb:.*|thumb: /${out}|" "$post"
else
  sed -i.bak "s|^# thumb:.*|thumb: /${out}|" "$post"
fi
rm -f "$post.bak"
echo "$out"
