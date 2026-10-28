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
node arcade-server.mjs
```

In a second terminal, from the same directory:

```sh
node arcade-local.mjs
```

Open <http://127.0.0.1:8777/> and choose a player name. The local proxy supplies the shared login on loopback; the main server handles saves. The password configured during setup protects access through the main server on port 8780. For remote hosting, use an HTTPS reverse proxy to that main server.

On Linux with Chromium installed, `./play.sh` opens the local arcade with controller-friendly audio settings. Start the main server first. The launcher starts the local proxy if necessary.

## Local data and optional games

Authentication, signing keys, player profiles, and saves are generated locally under `.hosting/`. That entire directory is ignored by Git. Back it up privately. Existing installations should keep their current `.hosting/` directory and skip authentication setup.

The standalone Astray, Hextris, Infinite Mario, Neverball, Platforms, and Tetris installations are excluded from this repository. The launcher only displays those optional games when their local assets are present. They are not downloaded automatically.

Machine-specific services, hosting notes, source-download caches, backups, and design references are also excluded.

## Third-party components and data

Some custom games use third-party engines and libraries. Their existing licenses and attribution remain alongside the code:

- Nonogram solver/generator: MIT; Mahjong algorithms: Unlicense; Reversi engine: MIT. See [credits](adult-games/credits.html) and [source notes](adult-games/vendor/SOURCES.txt).
- Three.js and Water: MIT. See [library license](world-flight/vendor/LICENSE.txt).
- City map data: OpenStreetMap contributors, ODbL 1.0. See [map sources and rebuild instructions](world-flight/README.txt) and the [OpenStreetMap copyright page](https://www.openstreetmap.org/copyright).

No blanket license is assigned to the collection. Third-party terms apply to their respective components; a code license does not establish rights to third-party characters or branding.

## Development

The `.tools/` directory contains map-building scripts and a Chromium DevTools test harness. See [.tools/README.md](.tools/README.md). Map rebuilding has additional Python dependencies documented in [world-flight/README.txt](world-flight/README.txt).
