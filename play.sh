#!/bin/sh
# Serves this project folder on http://127.0.0.1:8777 and opens the launcher (or the page given
# as $1) full screen in a dedicated Chromium profile.
# A dedicated browser profile supports controller play: a gamepad press is not a browser
# "user gesture", so the normal profile would keep WebAudio silent until a key is pressed.
# --autoplay-policy=no-user-gesture-required only applies to a freshly started Chromium, hence the
# separate --user-data-dir (snap Chromium may only write under ~/snap/chromium/common).
# Several games (Neverball, Astray) load assets with XHR and do not run from file://.
cd "$(dirname "$0")" || exit 1
PORT=8777
if ! curl -s -o /dev/null "http://127.0.0.1:$PORT/"; then
  nohup python3 serve.py "$PORT" >/dev/null 2>&1 &
  sleep 1
fi
URL="http://127.0.0.1:$PORT/${1:-index.html}"
PROFILE="$HOME/snap/chromium/common/arcade-profile"
mkdir -p "$PROFILE"
nohup chromium --user-data-dir="$PROFILE" \
  --autoplay-policy=no-user-gesture-required \
  --start-fullscreen --no-first-run --no-default-browser-check \
  --disable-session-crashed-bubble --password-store=basic \
  "$URL" >/dev/null 2>&1 &
