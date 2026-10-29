# Video Games Lab

A collection of custom browser games and adaptations with keyboard, touch, and controller support, shared player profiles, saved progress, and selected multiplayer games.

## Games

- Sudoku Safari and Still Sudoku
- Still Nonograms, Still Mahjong, and Still Reversi
- Beat Safari and Chess Quest
- Super Mario and Brick Ninja Quest
- City Flight, including Berlin and 16 additional city tours
- Rocket Pals and Pip and the Moonstone
- Cheese Chase, Orchard Catch, and Kitchen Pals

## Run locally

Requires Node.js 22 or later, Python 3, and a modern browser. No npm installation or game build step is required.

```sh
git clone https://github.com/VigneshSrinivasan10/video-games-lab.git
cd video-games-lab
python3 scripts/setup-auth.py
node server/index.mjs
```

In a second terminal, from the same directory:

```sh
node server/local.mjs
```

Open <http://127.0.0.1:8777/> and choose a player name. The local proxy supplies the shared login on loopback; the main server handles saves. The password configured during setup protects access through the main server on port 8780. For remote hosting, use an HTTPS reverse proxy to that main server.

On Linux with Chromium installed, `./play.sh` opens the local arcade with controller-friendly audio settings. Start the main server first. The launcher starts the local proxy if necessary.

## Local data

Authentication, signing keys, player profiles, and saves are generated locally under `.hosting/`. That entire directory is ignored by Git. Back it up privately. Existing installations should keep their current `.hosting/` directory and skip authentication setup.


Machine-specific services, hosting notes, source-download caches, backups, and design references are also excluded.

## Third-party components and data

Some custom games use third-party engines and libraries. Their existing licenses and attribution remain alongside the code:

- Nonogram solver/generator: MIT; Mahjong algorithms: Unlicense; Reversi engine: MIT. See [credits](public/shared/still/credits.html) and [source notes](docs/third-party-sources.txt).
- Three.js and Water: MIT. See [library license](public/shared/vendor/three/LICENSE.txt).
- City map data: OpenStreetMap contributors, ODbL 1.0. See [map sources and rebuild instructions](docs/city-flight.txt) and the [OpenStreetMap copyright page](https://www.openstreetmap.org/copyright).

No blanket license is assigned to the collection. Third-party terms apply to their respective components; a code license does not establish rights to third-party characters or branding.

## Repository layout

```text
public/
  index.html, launcher.js, styles.css
  games/              # One folder per game: HTML, styles, logic, and assets
  multiplayer/        # Online lobby
  shared/             # Profiles, controllers, puzzle UI, and licensed libraries
server/               # HTTP routing, authentication, saves, and multiplayer APIs
scripts/              # Local launcher, setup, test server, and map generation
tests/               # Browser scenarios, server checks, helpers, and fixtures
docs/                # Architecture, test instructions, and map provenance
.hosting/             # Private credentials and saved progress; ignored by Git
```

Existing game URLs remain valid through explicit mappings in `server/routes.mjs`. The server serves game assets from `public/`; it does not serve the project root.

## Development and tests

```sh
node --test tests/server/*.test.mjs
node tests/browser/refactor-smoke.mjs
node tests/browser/flight-smoke.mjs
node tests/browser/multiplayer-smoke.mjs
```

Browser tests require Chromium. Each smoke suite starts an isolated server with temporary credentials and saves.

See [development and architecture](docs/development.md), [test instructions](tests/README.md), and [city map sources and rebuilding](docs/city-flight.txt).
