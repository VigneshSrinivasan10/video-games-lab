#!/bin/sh
# Serves the project folder for headless tests on 127.0.0.1:8766 (snap Chromium cannot read /tmp, so serve the real folder).
PROJECT_ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd) || exit 1
curl -s -o /dev/null http://127.0.0.1:8766/ && exit 0
nohup python3 -m http.server 8766 --bind 127.0.0.1 -d "$PROJECT_ROOT" >/dev/null 2>&1 &
sleep 1
