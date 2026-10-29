# Development

The repository separates browser assets, server modules, scripts, and tests. It runs directly on Node.js without a bundler or npm dependencies.

## Games and shared code

Each game lives under `public/games/<name>/`. Most have `index.html`, `styles.css`, and `game.js`; the puzzle adaptations use ES modules. Sudoku engines and the Brick Ninja control adapter have their own files. City Flight keeps its city data together, with Berlin in `city-flight/berlin/`.

`public/shared/gamepad-std.js` is the common controller implementation. Its exit target is always `/index.html`, regardless of the script URL. `public/shared/profiles.js` owns browser profile storage and synchronization. Puzzle games share UI code under `public/shared/still/`. Third-party engines retain their licenses within their game folders; Three.js and Water are shared under `public/shared/vendor/three/`.

HTML pages use explicit base URLs so relative game links and workers resolve consistently at both historical and canonical addresses. Script extraction preserves execution order; profile bootstrap loads before game code. Runtime-generated shader and worker strings remain in their owning modules.

## Routing and state

`server/index.mjs` serves only approved file types within the public asset tree. `server/routes.mjs` maps historical URLs to their current files. Hidden files, path traversal, and symlinks are rejected.

`server/paths.mjs` defines filesystem roots. Credentials and saves remain in `.hosting/` by default. `ARCADE_DATA_DIR` can select a separate private directory for tests or another installation. Browser storage keys, profile cookies, API endpoints, and saved data formats are unchanged by the reorganization.

The main server defaults to port 8780. The local proxy defaults to port 8777 and connects to 8780; use `ARCADE_PORT` and `ARCADE_UPSTREAM_PORT` to configure test instances. The proxy supplies shared authentication only on loopback. It does not expose signing material to browsers.

## Adding a game

1. Create a folder under `public/games/` with its assets and license notices.
2. Load `/api/profile/bootstrap`, `/shared/profiles.js`, and `/shared/gamepad-std.js` before game code.
3. Use a stable, unique save key with `ArcadeProfile.storage`.
4. Add a launcher tile in `public/index.html` and a browser scenario under `tests/browser/`.
5. Add a route mapping only when preserving an existing URL.

## Local deployment

The stable `./play.sh` entry point delegates to `scripts/play.sh`; desktop shortcuts can continue using it. Systemd services should run `server/index.mjs` and `server/local.mjs` from the project directory and allow writes only to `.hosting/`. Keep machine-specific services and hosting notes under `.local/` and `docs/HOSTING.local.md`; these paths are ignored.

Local installation files, source-download caches, backups, and reference artwork are never committed. Run a secret scan before publishing, including compressed map payloads when they change.
