#!/bin/sh
# Stable entry point for desktop shortcuts.
exec "$(dirname "$0")/scripts/play.sh" "$@"
