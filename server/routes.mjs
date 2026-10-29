import { publicRoot, localGamesRoot, docsRoot } from './paths.mjs';

// Existing bookmarks and third-party game links keep their original URLs.
// New /games/.../ and /shared/... paths are served directly from public/.
const legacyFiles = new Map(Object.entries({
  "world-flight/README.txt": "@docs/city-flight.txt",
  "world-flight/map-references.json": "@docs/city-flight-references.json",
  "beat-safari.html": "games/beat-safari/index.html",
  "brick-ninja-quest.html": "games/brick-ninja-quest/index.html",
  "cheese-chase.html": "games/cheese-chase/index.html",
  "chess-quest.html": "games/chess-quest/index.html",
  "kitchen-pals.html": "games/kitchen-pals/index.html",
  "orchard-catch.html": "games/orchard-catch/index.html",
  "pip-and-the-moonstone.html": "games/pip-and-the-moonstone/index.html",
  "rocket-pals.html": "games/rocket-pals/index.html",
  "super-mario.html": "games/super-mario/index.html",
  "sudoku.html": "games/sudoku/index.html",
  "nonograms.html": "games/nonograms/index.html",
  "mahjong.html": "games/mahjong/index.html",
  "reversi.html": "games/reversi/index.html",
  "berlin-city-flight.html": "games/city-flight/berlin/index.html",
  "index.html": "index.html",
  "family-room.html": "multiplayer/index.html",
  "family-room.js": "multiplayer/lobby.js",
  "arcade-profile.js": "shared/profiles.js",
  "gamepad-std.js": "shared/gamepad-std.js",
  "adult-games/nonograms.mjs": "games/nonograms/game.mjs",
  "adult-games/nonograms.css": "games/nonograms/styles.css",
  "adult-games/mahjong.mjs": "games/mahjong/game.mjs",
  "adult-games/mahjong.css": "games/mahjong/styles.css",
  "adult-games/reversi.mjs": "games/reversi/game.mjs",
  "adult-games/reversi.css": "games/reversi/styles.css",
  "adult-games/nonograms.json": "games/nonograms/puzzles.json",
  "adult-games/mahjong-engine.mjs": "games/mahjong/engine.mjs",
  "adult-games/reversi-worker.mjs": "games/reversi/worker.mjs",
  "adult-games/common.mjs": "shared/still/common.mjs",
  "adult-games/common.css": "shared/still/common.css",
  "adult-games/credits.html": "shared/still/credits.html",
  "adult-games/vendor/SOURCES.txt": "@docs/third-party-sources.txt"
}));
const legacyPrefixes = [
  ['world-flight/vendor/', 'shared/vendor/three/'],
  ['adult-games/vendor/nonogram/', 'games/nonograms/vendor/'],
  ['adult-games/vendor/mahjong/', 'games/mahjong/vendor/'],
  ['adult-games/vendor/reversi/', 'games/reversi/vendor/'],
  ['world-flight/', 'games/city-flight/'],
  ['sudoku-kids/', 'games/sudoku-safari/'],
];
const localGames = new Set(['astray', 'hextris', 'infinite-mario', 'neverball', 'platforms', 'tetris']);

export function resolveAsset(raw) {
  const parts = raw.split('/').filter(Boolean);
  if (raw.includes('\\') || raw.includes('\0') || parts.some(p => p.startsWith('.') || ['node_modules', 'package.json', 'package-lock.json'].includes(p))) return null;
  const relative = parts.join('/') || 'index.html';
  if (localGames.has(parts[0])) return { root: localGamesRoot, relative };
  const mapped = legacyFiles.get(relative);
  if (mapped?.startsWith('@docs/')) return { root: docsRoot, relative: mapped.slice(6) };
  if (mapped) return { root: publicRoot, relative: mapped };
  for (const [oldPrefix, newPrefix] of legacyPrefixes) {
    if (relative === oldPrefix.slice(0, -1)) return { root: publicRoot, relative: newPrefix.slice(0, -1) };
    if (relative.startsWith(oldPrefix)) return { root: publicRoot, relative: newPrefix + relative.slice(oldPrefix.length) };
  }
  return { root: publicRoot, relative };
}
