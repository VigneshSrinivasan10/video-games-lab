#!/bin/sh
# Run a disposable arcade; never serve the repository or real player data directly.
exec node "$(dirname "$0")/test-server.mjs" "$@"
