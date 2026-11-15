# Arcade monitoring

Open `/monitor/` on the hosted arcade or http://127.0.0.1:8777/monitor/.
The arcade login still applies on the hosted link. Monitoring additionally requires
its own admin key; player profiles and the shared arcade password do not grant
access to statistics.

## Setup

Run `node scripts/setup-monitoring.mjs`, then restart the main server. This creates
`.hosting/monitoring-key` with owner-only permissions and preserves any existing
key. Read that private file locally and paste its contents into the dashboard.
Alternatively supply `ARCADE_MONITOR_KEY` (at least 24 characters) to the main
server. The dashboard holds the key in memory only; reload or Lock clears it.

Restart both the main and local proxy processes when installing this change.
On this device: `systemctl --user restart arcade-host arcade-local`.

## What is measured

- Successful HTML requests, including the login page, grouped by UTC day, IP,
  selected player, source and pathname. Assets and API polls are excluded.
- Browser heartbeats every 15 seconds: profile name, page, last selected level,
  visibility and approximate visible-tab duration. After 45 seconds without a
  heartbeat a session is offline. Hidden tabs are background sessions. This is
  tab presence, not proof someone is interacting or progressing.
- Existing shared-profile saves, plus Sudoku, Nonograms, Mahjong and Reversi
  records. Save keys and field names retain their original meaning and indexing.
  Unlocked progress is deliberately separate from current selected level.
- Live level hooks cover Rocket Pals, Mario, Brick Ninja, Pip, Chess Quest,
  Cheese Chase, Kitchen Pals, Beat Safari, Sudoku Safari, Sudoku, Nonograms and
  Mahjong, Orchard Catch, Rumble Riders and City Flight. Other games still report visits/presence and shared saved fields;
  unsupported current levels explicitly show “Not reported”. New games can call
  `window.ArcadeMonitor?.level('Level 3')` when selecting a level.

The logged-in arcade profile identifies the browser. A second couch co-op player
is not a separate identified person unless the game supplies their identity.
Monitoring begins after installation and page reload. Native executables,
`file://` games, and unrelated localhost servers are not instrumented.
Local play through the documented proxy on port 8777 is included automatically.

## IP addresses and proxies

By default only the actual socket IP is trusted. For a loopback reverse proxy
that **overwrites** a single client-IP header, configure
`ARCADE_CLIENT_IP_HEADER=x-forwarded-for` (or its trusted header name) on the main
server. Comma-separated chains and invalid IPs are ignored. Never enable this
for a proxy that passes arbitrary client-supplied values through.

This installation uses Tailscale Funnel's HTTP reverse proxy. The installed
Tailscale v1.104.5 replaces X-Forwarded-For with its connection source address:
https://github.com/tailscale/tailscale/blob/v1.104.5/ipn/ipnlocal/serve.go
A local systemd override enables that header for this deployment. The local arcade
proxy cryptographically marks its own requests; it ignores claimed forwarded IPs.
Shared networks and VPNs can share an address. Localhost usually records
127.0.0.1, not the computer's public IP. IPs are not person identifiers.

## Storage and limits

Visit history lives privately in `.hosting/monitoring.json`, flushed every ten
seconds and on normal shutdown. It is capped at 30 days and 10,000 daily groups.
A crash can lose the most recent unflushed visits. Sessions are held in memory,
expire after one day and reset on server restart (maximum 5,000 sessions).
Player saves retain their existing storage and retention. Back up `.hosting/`
privately. Never publish the admin key or monitoring data. The dashboard shows
storage errors and stale-refresh errors explicitly.

## Checks

`node --test tests/server/*.test.mjs`

`node tests/browser/monitoring.mjs`
