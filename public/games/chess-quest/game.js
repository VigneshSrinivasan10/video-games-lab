'use strict';
/* ===== ENGINE START (pure chess rules + small AI; no DOM) ===== */
/* Board: array of 64 chars, index = row * 8 + file, row 0 = rank 8 (top), row 7 = rank 1.
   'PNBRQK' = the player's sunny team (white), 'pnbrqk' = grumpy team (black), '.' empty, '#' toy block (puzzles). */
const N_OFF = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]];
const K_OFF = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];
const DIAG = [[-1, -1], [-1, 1], [1, -1], [1, 1]], ORTH = [[-1, 0], [1, 0], [0, -1], [0, 1]];
const VAL = { P: 100, N: 300, B: 315, R: 500, Q: 900, K: 0 };
function colorOf(p) { return (p === '.' || p === '#' || !p) ? null : (p === p.toUpperCase() ? 'w' : 'b'); }
function other(c) { return c === 'w' ? 'b' : 'w'; }
function posFromRows(rows, turn, castle) {
  const b = [], stars = [];
  for (let r = 0; r < 8; r++) for (let f = 0; f < 8; f++) {
    const ch = rows[r][f];
    if (ch === '*') { stars.push(r * 8 + f); b.push('.'); } else b.push(ch);
  }
  return { pos: { b, turn: turn || 'w', castle: castle || '', ep: -1 }, stars };
}
function startPosition() {
  return posFromRows(['rnbqkbnr', 'pppppppp', '........', '........', '........', '........', 'PPPPPPPP', 'RNBQKBNR'], 'w', 'KQkq').pos;
}
function attacked(b, sq, by) {
  const r = sq >> 3, f = sq & 7;
  // pawns: a white pawn attacks upward, so it sits one row below the square
  const pr = by === 'w' ? r + 1 : r - 1, pawn = by === 'w' ? 'P' : 'p';
  if (pr >= 0 && pr < 8) { if (f > 0 && b[pr * 8 + f - 1] === pawn) return true; if (f < 7 && b[pr * 8 + f + 1] === pawn) return true; }
  const kn = by === 'w' ? 'N' : 'n', kg = by === 'w' ? 'K' : 'k';
  for (const [dr, df] of N_OFF) { const r2 = r + dr, f2 = f + df; if (r2 >= 0 && r2 < 8 && f2 >= 0 && f2 < 8 && b[r2 * 8 + f2] === kn) return true; }
  for (const [dr, df] of K_OFF) { const r2 = r + dr, f2 = f + df; if (r2 >= 0 && r2 < 8 && f2 >= 0 && f2 < 8 && b[r2 * 8 + f2] === kg) return true; }
  const rq = by === 'w' ? 'RQ' : 'rq', bq = by === 'w' ? 'BQ' : 'bq';
  for (const [dirs, set] of [[ORTH, rq], [DIAG, bq]]) {
    for (const [dr, df] of dirs) {
      let r2 = r + dr, f2 = f + df;
      while (r2 >= 0 && r2 < 8 && f2 >= 0 && f2 < 8) {
        const q = b[r2 * 8 + f2];
        if (q !== '.') { if (set.indexOf(q) >= 0) return true; break; }
        r2 += dr; f2 += df;
      }
    }
  }
  return false;
}
function kingSq(b, c) { const k = c === 'w' ? 'K' : 'k'; return b.indexOf(k); }
function inCheck(pos, c) { const k = kingSq(pos.b, c); return k >= 0 && attacked(pos.b, k, other(c)); }
function genMoves(pos, c) {
  c = c || pos.turn;
  const b = pos.b, out = [];
  for (let s = 0; s < 64; s++) {
    const p = b[s]; if (colorOf(p) !== c) continue;
    const r = s >> 3, f = s & 7, t = p.toUpperCase();
    const add = (to, extra) => { const q = b[to]; const m = { from: s, to, piece: t }; if (q !== '.') m.cap = q; if (extra) Object.assign(m, extra); out.push(m); };
    const can = (to) => { const q = b[to]; return q === '.' || (q !== '#' && colorOf(q) !== c); };
    if (t === 'P') {
      const dir = c === 'w' ? -1 : 1, start = c === 'w' ? 6 : 1, last = c === 'w' ? 0 : 7, r1 = r + dir;
      if (r1 < 0 || r1 > 7) continue;
      if (b[r1 * 8 + f] === '.') {
        add(r1 * 8 + f, r1 === last ? { promo: 'Q' } : null);
        if (r === start && b[(r + 2 * dir) * 8 + f] === '.') add((r + 2 * dir) * 8 + f, { dbl: true });
      }
      for (const df of [-1, 1]) {
        const f2 = f + df; if (f2 < 0 || f2 > 7) continue;
        const to = r1 * 8 + f2, q = b[to];
        if (q !== '.' && q !== '#' && colorOf(q) !== c) add(to, r1 === last ? { promo: 'Q' } : null);
        else if (to === pos.ep && q === '.') out.push({ from: s, to, piece: 'P', ep: true, cap: c === 'w' ? 'p' : 'P' });
      }
    } else if (t === 'N' || t === 'K') {
      for (const [dr, df] of (t === 'N' ? N_OFF : K_OFF)) {
        const r2 = r + dr, f2 = f + df;
        if (r2 >= 0 && r2 < 8 && f2 >= 0 && f2 < 8 && can(r2 * 8 + f2)) add(r2 * 8 + f2);
      }
      if (t === 'K' && pos.castle) {
        const home = c === 'w' ? 60 : 4, o = other(c), rook = c === 'w' ? 'R' : 'r';
        if (s === home && !attacked(b, home, o)) {
          const ks = c === 'w' ? 'K' : 'k', qs = c === 'w' ? 'Q' : 'q';
          if (pos.castle.indexOf(ks) >= 0 && b[home + 1] === '.' && b[home + 2] === '.' && b[home + 3] === rook && !attacked(b, home + 1, o) && !attacked(b, home + 2, o)) add(home + 2, { castle: 'K' });
          if (pos.castle.indexOf(qs) >= 0 && b[home - 1] === '.' && b[home - 2] === '.' && b[home - 3] === '.' && b[home - 4] === rook && !attacked(b, home - 1, o) && !attacked(b, home - 2, o)) add(home - 2, { castle: 'Q' });
        }
      }
    } else {
      const dirs = t === 'R' ? ORTH : t === 'B' ? DIAG : ORTH.concat(DIAG);
      for (const [dr, df] of dirs) {
        let r2 = r + dr, f2 = f + df;
        while (r2 >= 0 && r2 < 8 && f2 >= 0 && f2 < 8) {
          const to = r2 * 8 + f2, q = b[to];
          if (q === '.') add(to);
          else { if (q !== '#' && colorOf(q) !== c) add(to); break; }
          r2 += dr; f2 += df;
        }
      }
    }
  }
  return out;
}
// keepTurn: puzzles where only the player moves
function makeMove(pos, m, keepTurn) {
  const b = pos.b.slice(), p = b[m.from], c = colorOf(p);
  b[m.to] = m.promo ? (c === 'w' ? m.promo : m.promo.toLowerCase()) : p;
  b[m.from] = '.';
  if (m.ep) b[m.to + (c === 'w' ? 8 : -8)] = '.';
  if (m.castle) {
    const home = c === 'w' ? 60 : 4;
    if (m.castle === 'K') { b[home + 1] = b[home + 3]; b[home + 3] = '.'; } else { b[home - 1] = b[home - 4]; b[home - 4] = '.'; }
  }
  let castle = pos.castle;
  if (castle) {
    if (p === 'K') castle = castle.replace('K', '').replace('Q', '');
    if (p === 'k') castle = castle.replace('k', '').replace('q', '');
    for (const sq of [m.from, m.to]) {
      if (sq === 63) castle = castle.replace('K', ''); if (sq === 56) castle = castle.replace('Q', '');
      if (sq === 7) castle = castle.replace('k', ''); if (sq === 0) castle = castle.replace('q', '');
    }
  }
  return { b, turn: keepTurn ? pos.turn : other(pos.turn), castle, ep: m.dbl ? (m.from + m.to) >> 1 : -1 };
}
function legalMoves(pos, c) {
  c = c || pos.turn;
  const list = genMoves(pos, c), out = [];
  for (const m of list) {
    const nb = makeMove(pos, m).b, k = kingSq(nb, c);
    if (k < 0 || !attacked(nb, k, other(c))) out.push(m);
  }
  return out;
}
function material(b, c) { let s = 0; for (const p of b) if (colorOf(p) === c) s += VAL[p.toUpperCase()]; return s; }
function evalPos(b, side) {
  let s = 0;
  for (let sq = 0; sq < 64; sq++) {
    const p = b[sq]; const c = colorOf(p); if (!c) continue;
    const t = p.toUpperCase(), r = sq >> 3, f = sq & 7, cen = 7 - Math.abs(3.5 - f) - Math.abs(3.5 - r);
    let v = VAL[t];
    if (t === 'N' || t === 'B') v += cen * 5;
    else if (t === 'P') v += (c === 'w' ? 6 - r : r - 1) * 7 + (f >= 2 && f <= 5 ? 6 : 0);
    else if (t === 'Q') v += cen;
    else if (t === 'K') v -= cen * 3;
    s += c === 'w' ? v : -v;
  }
  return side === 'w' ? s : -s;
}
function orderMoves(ms) { return ms.sort((a, b) => (b.cap ? VAL[b.cap.toUpperCase()] * 10 - VAL[b.piece] / 10 : 0) - (a.cap ? VAL[a.cap.toUpperCase()] * 10 - VAL[a.piece] / 10 : 0)); }
let searchNodes = 0;
function quiesce(pos, alpha, beta, qd) {
  searchNodes++;
  const stand = evalPos(pos.b, pos.turn);
  if (stand >= beta) return stand;
  if (stand > alpha) alpha = stand;
  if (qd >= 2) return alpha;
  for (const m of orderMoves(legalMoves(pos).filter((m) => m.cap))) {
    const v = -quiesce(makeMove(pos, m), -beta, -alpha, qd + 1);
    if (v >= beta) return v;
    if (v > alpha) alpha = v;
  }
  return alpha;
}
function negamax(pos, depth, alpha, beta, ply) {
  searchNodes++;
  const ms = legalMoves(pos);
  if (!ms.length) return inCheck(pos, pos.turn) ? -100000 + ply : 0;
  if (depth <= 0) return quiesce(pos, alpha, beta, 0);
  let best = -Infinity;
  for (const m of orderMoves(ms)) {
    const v = -negamax(makeMove(pos, m), depth - 1, -beta, -alpha, ply + 1);
    if (v > best) best = v;
    if (v > alpha) alpha = v;
    if (alpha >= beta) break;
  }
  return best;
}
// Scores every legal move for the side to move (higher = better for it), plus random noise.
function scoreMoves(pos, depth, noise) {
  const ms = orderMoves(legalMoves(pos));
  for (const m of ms) m.score = -negamax(makeMove(pos, m), depth - 1, -Infinity, Infinity, 1) + (noise ? (Math.random() * 2 - 1) * noise : 0);
  return ms.sort((a, b) => b.score - a.score);
}
function bestMove(pos, depth, noise) { const ms = scoreMoves(pos, depth, noise); return ms[0] || null; }
function gameStatus(pos) {
  const ms = legalMoves(pos);
  if (!ms.length) return inCheck(pos, pos.turn) ? 'mate' : 'stalemate';
  const left = pos.b.filter((p) => colorOf(p));
  if (left.length === 2) return 'bare';
  return inCheck(pos, pos.turn) ? 'check' : 'ok';
}
// Puzzle solver: only the player moves, grumpy pieces stand still. Breadth-first, so the path is the shortest.
// kind 'safe' forbids stopping on a square a grumpy piece can reach.
function solvePuzzle(pos0, stars0, needGob, safe, limit) {
  limit = limit || 300000;
  const stars = stars0.slice();
  const done = (b, mask) => mask === 0 && (!needGob || !b.some((p) => colorOf(p) === 'b'));
  const mask0 = (1 << stars.length) - 1;
  if (done(pos0.b, mask0)) return [];
  const startKey = pos0.b.join('') + mask0;
  const seen = new Map([[startKey, null]]);
  let frontier = [{ b: pos0.b, mask: mask0, key: startKey }];
  while (frontier.length && seen.size < limit) {
    const next = [];
    for (const st of frontier) {
      const pos = { b: st.b, turn: 'w', castle: '', ep: -1 };
      for (const m of genMoves(pos, 'w')) {
        const nb = makeMove(pos, m, true).b;
        if (safe && attacked(nb, m.to, 'b')) continue;
        const si = stars.indexOf(m.to), mask = si >= 0 ? st.mask & ~(1 << si) : st.mask;
        const key = nb.join('') + mask;
        if (seen.has(key)) continue;
        seen.set(key, { prev: st.key, m });
        if (done(nb, mask)) {
          const path = []; let k = key;
          while (seen.get(k)) { const e = seen.get(k); path.unshift(e.m); k = e.prev; }
          return path;
        }
        next.push({ b: nb, mask, key });
      }
    }
    frontier = next;
  }
  return null;
}
/* ===== ENGINE END ===== */

/* ===== Chess Quest — game ===== */
const W = 1000, H = 600, SQ = 60, BX = 260, BY = 86, PAD = 16;
const OL = 'rgba(20,24,40,0.55)', TAU = Math.PI * 2;
const FONT = '"Lilita One", "Arial Rounded MT Bold", Arial, sans-serif';
const BODY = 'Nunito, "Trebuchet MS", Arial, sans-serif';
const $ = (id) => document.getElementById(id);
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const easeOut = (t) => 1 - (1 - t) * (1 - t);
const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
function bounceOut(t) { const n = 7.5625, d = 2.75; if (t < 1 / d) return n * t * t; if (t < 2 / d) return n * (t -= 1.5 / d) * t + 0.75; if (t < 2.5 / d) return n * (t -= 2.25 / d) * t + 0.9375; return n * (t -= 2.625 / d) * t + 0.984375; }
const sqX = (sq) => BX + (sq & 7) * SQ + SQ / 2;
const sqY = (sq) => BY + (sq >> 3) * SQ + SQ / 2;
const NAME = { P: 'pawn', N: 'knight', B: 'bishop', R: 'rook', Q: 'queen', K: 'king' };
const PIECE_TIP = {
  R: 'Rooks go straight: up, down, left, right.',
  B: 'Bishops slide on slanty lines.',
  Q: 'The Queen goes straight AND slanty!',
  N: 'Knights hop in an L. They jump over things!',
  K: 'The King takes one small step.',
  P: 'Pawns walk forward. They grab sideways!'
};

/* ---------- worlds ---------- */
const THEMES = [
  { sky: ['#4fc0ff', '#e9f9ff'], hills: ['#a6e88f', '#72d05f', '#47b24a'], tree: '#2f9a44', light: '#fff4d6', dark: '#6cc04a', amb: 'flutter', ambC: '#ffe14d', music: 0 },
  { sky: ['#ff8fd0', '#fff0fa'], hills: ['#ffc6e8', '#f79bd2', '#e06db6'], tree: '#ff5fa8', light: '#fff0f7', dark: '#f07ab8', amb: 'sparkle', ambC: '#ffffff', music: 1 },
  { sky: ['#ff9a5a', '#fff1d6'], hills: ['#ffd59a', '#f6b86a', '#e09445'], tree: '#3fb37f', light: '#fff6e0', dark: '#eea052', amb: 'bubbles', ambC: '#ffffff', music: 2 },
  { sky: ['#3fc2a0', '#e6fff5'], hills: ['#8fdc8a', '#55b86a', '#2f9055'], tree: '#1f7a45', light: '#f2ffe8', dark: '#3fa36a', amb: 'fireflies', ambC: '#fff9a0', music: 3 },
  { sky: ['#6fb0ff', '#f2f8ff'], hills: ['#ffffff', '#e3efff', '#c3daff'], tree: '#3f9a8a', light: '#ffffff', dark: '#78a6ea', amb: 'snow', ambC: '#ffffff', music: 0 },
  { sky: ['#ffae3d', '#fff3d1'], hills: ['#ffd77f', '#f2b55a', '#d9973d'], tree: '#4caf50', light: '#fff4dc', dark: '#d99a4a', amb: 'sparkle', ambC: '#fff7c0', music: 1 },
  { sky: ['#22b2ff', '#dff7ff'], hills: ['#8fe6ff', '#3cc0f0', '#1a98d8'], tree: '#2ec4a0', light: '#eefcff', dark: '#2aa0d8', amb: 'bubbles', ambC: '#ffffff', music: 2 },
  { sky: ['#ff9a72', '#fff0e0'], hills: ['#ffc070', '#f08c3c', '#c9662a'], tree: '#e0482f', light: '#fff3e3', dark: '#e07a3a', amb: 'leaves', ambC: '#ff8c2a', music: 3 },
  { sky: ['#262b78', '#8a7fe0'], hills: ['#5257b8', '#3a3e96', '#272b70'], tree: '#2f8a7a', light: '#eef0ff', dark: '#6a6fd0', amb: 'fireflies', ambC: '#fff59a', night: true, music: 4 },
  { sky: ['#7a5cff', '#ffe6ff'], hills: ['#cdb0ff', '#a37cf2', '#7a54d8'], tree: '#ff6fb5', light: '#fff4ff', dark: '#9a72ea', amb: 'sparkle', ambC: '#ffe27a', music: 4 }
];

/* ---------- levels: 8 rows, top row = far side. Capitals = the player's sunny pieces, small = grumpy pieces,
   * = star, # = toy block, . = empty ---------- */
const LEVELS = [
  { name: 'Rook Road', icon: ['R', 'w'], kind: 'stars', theme: 0,
    tip: 'The ROOK goes straight: up, down, left and right. Grab the stars!',
    puzzles: [
      ['........', '........', '........', '........', '........', '........', '........', 'R.....*.'],
      ['......*.', '........', '........', '........', '........', '........', '........', 'R.....*.'],
      ['*......*', '........', '...#....', '........', '....#...', '........', '........', 'R......*']] },
  { name: 'Bishop Slide', icon: ['B', 'w'], kind: 'stars', theme: 1,
    tip: 'The BISHOP slides on slanty lines. Grab the stars!',
    puzzles: [
      ['........', '........', '........', '........', '.....*..', '........', '........', '..B.....'],
      ['........', '..*.....', '........', '........', '.....*..', '........', '........', '..B.....'],
      ['.*......', '........', '........', '......*.', '........', '....#...', '.*......', '..B.....']] },
  { name: 'Queen Power', icon: ['Q', 'w'], kind: 'stars', theme: 2,
    tip: 'The QUEEN goes straight AND slanty. She is super strong!',
    puzzles: [
      ['........', '........', '...*....', '........', '........', '........', '.......*', '...Q....'],
      ['*.......', '........', '....#...', '........', '..#....*', '........', '........', '...Q...*'],
      ['...*...*', '........', '.#....#.', '........', '*.......', '....#...', '........', '...Q.*..']] },
  { name: 'Knight Hops', icon: ['N', 'w'], kind: 'stars', theme: 3,
    tip: 'The KNIGHT hops in an L. He can jump over things!',
    puzzles: [
      ['........', '........', '........', '........', '........', '..*.....', '........', '.N......'],
      ['........', '........', '........', '........', '....*...', '..*.....', '........', '.N......'],
      ['........', '........', '..*.....', '...#.*..', '..#N#...', '...#....', '....*...', '........']] },
  { name: 'King Steps', icon: ['K', 'w'], kind: 'stars', theme: 4,
    tip: 'The KING takes one small step at a time. Any way he likes!',
    puzzles: [
      ['........', '........', '........', '........', '........', '....*...', '....*...', '....K...'],
      ['........', '........', '........', '........', '........', '....*...', '...*.*..', '....K...'],
      ['........', '........', '........', '......*.', '.....*..', '...#*...', '...K#...', '........']] },
  { name: 'Pawn Parade', icon: ['P', 'w'], kind: 'stars', theme: 5,
    tip: 'PAWNS march forward. They grab sideways. At the end they become a QUEEN!',
    owl: ['Pawns can take TWO steps on their very first move!', 'Something is in the way! Pawns grab sideways.', 'Walk to the end and become a QUEEN!'],
    puzzles: [
      ['........', '........', '........', '........', '....*...', '........', '....P...', '........'],
      ['........', '...*....', '........', '...pp...', '....P...', '........', '........', '........'],
      ['.*......', '........', '.P......', '........', '........', '........', '.......*', '........']] },
  { name: 'Grumpy Gobble', icon: ['P', 'b'], kind: 'gobble', theme: 6,
    tip: 'Gobble up all the grumpy pieces! Land on them to grab them.',
    puzzles: [
      ['........', '........', 'p....p..', '........', '........', '........', '........', 'R.......'],
      ['........', '........', '........', '......r.', '........', '.....n..', '........', '..B...N.'],
      ['...b....', '........', '........', '.......n', 'p.......', '........', '........', '...Q....']] },
  { name: 'Safe Squares', icon: ['N', 'b'], kind: 'safe', theme: 7,
    tip: 'Watch out! Grumpy pieces bump you if you stop where they can reach.',
    owl: ['The grumpy bishop guards the knight. Grab the bishop first!', 'Grumpy pawns guard each other. Find a safe way in!', 'Orange dots are not safe. Pick green dots!'],
    puzzles: [
      ['...b....', '........', '........', 'n.......', '........', '........', '........', 'R.......'],
      ['........', '.p......', '..p.....', '........', '........', '........', '........', '...Q....'],
      ['.......r', '........', '........', '....b...', '........', '........', '........', '.N.....R']] },
  { name: 'Trap the King', icon: ['K', 'b'], kind: 'mate', theme: 8,
    tip: 'Trap the grumpy king so he cannot get away. That is CHECKMATE!',
    owl: ['Can your rook reach the top row?', 'Your king helps the queen!', 'The rook blocks one row. The queen does the rest!'],
    puzzles: [
      ['......k.', '.....ppp', '........', '........', '........', '........', '........', 'R.....K.'],
      ['.......k', 'Q.......', '......K.', '........', '........', '........', '........', '........'],
      ['....k...', 'R.......', '........', '........', '........', '........', '........', '......KQ']] },
  { name: 'The Big Game', icon: ['K', 'b'], kind: 'game', theme: 9,
    tip: 'Real chess with King Grumble! Take turns. Trap his king to win!' }
];
function validateLevels() {
  LEVELS.forEach((lv, li) => {
    (lv.puzzles || []).forEach((rows, pi) => {
      const tag = 'Level ' + (li + 1) + ' puzzle ' + (pi + 1) + ': ';
      if (rows.length !== 8 || rows.some((r) => r.length !== 8)) { console.error(tag + 'board must be 8x8'); return; }
      if (rows.some((r) => /[^.#*PNBRQKpnbrqk]/.test(r))) console.error(tag + 'unknown character');
      const { pos, stars } = posFromRows(rows, 'w', '');
      if (!pos.b.some((p) => colorOf(p) === 'w')) console.error(tag + 'no sunny piece');
      if (lv.kind === 'mate') {
        if (kingSq(pos.b, 'w') < 0 || kingSq(pos.b, 'b') < 0) console.error(tag + 'needs both kings');
        if (!legalMoves(pos).some((m) => gameStatus(makeMove(pos, m)) === 'mate')) console.error(tag + 'no mate in one');
      } else {
        if (!stars.length && !pos.b.some((p) => colorOf(p) === 'b')) console.error(tag + 'nothing to collect');
        if (lv.kind === 'stars' && !stars.length) console.error(tag + 'star level without stars');
        const sol = solvePuzzle(pos, stars, lv.kind !== 'stars', lv.kind === 'safe');
        if (!sol) console.error(tag + 'cannot be solved');
      }
    });
  });
}

/* ---------- save (per-player profiles) ---------- */
const SAVE_KEY = 'chessQuest.profiles.v1', DEFAULT_PLAYER = ArcadeProfile.name;
function blankProfile() { return { unlocked: 1, gems: {}, won: false }; }
let DB = { current: DEFAULT_PLAYER, music: true, profiles: {} };
try { const s = JSON.parse(ArcadeProfile.storage.getItem(SAVE_KEY) || 'null'); if (s && typeof s === 'object' && s.profiles) DB = Object.assign(DB, s); } catch (e) { /* fresh start */ }
if (!Object.keys(DB.profiles).length) DB.profiles[DEFAULT_PLAYER] = blankProfile();
if (!DB.profiles[DB.current]) DB.current = Object.keys(DB.profiles)[0];
let SAVE = DB.profiles[DB.current];
function saveGame() { DB.music = AU.musicOn; try { ArcadeProfile.storage.setItem(SAVE_KEY, JSON.stringify(DB)); } catch (e) { /* storage blocked */ } }
function playerName() { return DB.current; }
function setProfile(name) { if (!DB.profiles[name]) DB.profiles[name] = blankProfile(); DB.current = name; SAVE = DB.profiles[name]; saveGame(); }
function addProfile(name) { name = name.trim().toUpperCase().slice(0, 12); if (!name) return null; setProfile(name); return name; }
function deleteProfile(name) { if (Object.keys(DB.profiles).length <= 1) return; delete DB.profiles[name]; if (DB.current === name) DB.current = Object.keys(DB.profiles)[0]; SAVE = DB.profiles[DB.current]; saveGame(); }
function gemsTotal(p) { p = p || SAVE; let n = 0; for (const k in p.gems) n += p.gems[k].filter(Boolean).length; return n; }

/* ---------- sound: all synthesized ---------- */
const AU = { ctx: null, master: null, music: null, musicOn: DB.music !== false, step: 0, nextT: 0 };
function ensureAudio() {
  if (!AU.ctx) {
    try {
      AU.ctx = new (window.AudioContext || window.webkitAudioContext)();
      AU.master = AU.ctx.createGain(); AU.master.gain.value = 0.55; AU.master.connect(AU.ctx.destination);
      AU.music = AU.ctx.createGain(); AU.music.gain.value = 0.55; AU.music.connect(AU.master);
    } catch (e) { return; }
  }
  if (AU.ctx.state === 'suspended') AU.ctx.resume();
}
function tone(freq, dur, type, vol, delay, slideTo, dest) {
  const a = AU.ctx; if (!a || a.state !== 'running') return;
  const t0 = a.currentTime + (delay || 0), o = a.createOscillator(), g = a.createGain();
  o.type = type || 'square'; o.frequency.setValueAtTime(freq, t0);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vol || 0.1, t0 + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g); g.connect(dest || AU.master); o.start(t0); o.stop(t0 + dur + 0.02);
}
const sfx = {
  tick() { tone(880, 0.04, 'triangle', 0.05); },
  click() { tone(660, 0.06, 'square', 0.06); },
  select() { tone(523, 0.08, 'triangle', 0.16); tone(784, 0.1, 'triangle', 0.12, 0.06); },
  move() { tone(330, 0.08, 'triangle', 0.2); tone(196, 0.07, 'sine', 0.16, 0.05); },
  hop() { tone(400, 0.12, 'square', 0.07, 0, 800); },
  star() { [880, 1175, 1568].forEach((f, i) => tone(f, 0.12, 'square', 0.08, i * 0.06)); },
  gobble() { tone(520, 0.14, 'square', 0.1, 0, 160); tone(880, 0.1, 'triangle', 0.12, 0.1); tone(1320, 0.08, 'triangle', 0.08, 0.16); },
  wrong() { tone(240, 0.16, 'triangle', 0.14, 0, 170); tone(200, 0.16, 'triangle', 0.12, 0.12, 150); },
  oops() { tone(500, 0.12, 'sawtooth', 0.06, 0, 300); tone(300, 0.2, 'triangle', 0.12, 0.12, 180); },
  check() { tone(784, 0.1, 'square', 0.09); tone(1047, 0.18, 'square', 0.09, 0.1); },
  promote() { [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.1, 'square', 0.08, i * 0.06)); },
  drop() { tone(260 + Math.random() * 80, 0.05, 'sine', 0.12); },
  hint() { tone(1047, 0.1, 'sine', 0.12); tone(1319, 0.14, 'sine', 0.1, 0.08); },
  good() { [659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.14, 'triangle', 0.14, i * 0.08)); },
  fanfare() { [523, 523, 659, 784, 0, 659, 784, 1047].forEach((f, i) => f && tone(f, i === 7 ? 0.5 : 0.16, 'square', 0.09, i * 0.13)); [262, 330, 392, 523].forEach((f, i) => tone(f, 0.3, 'triangle', 0.12, i * 0.26)); },
  think() { tone(600 + Math.random() * 200, 0.05, 'sine', 0.04); }
};
// calm looping tunes, one note per step (0 = rest); semitones from C5
const TUNES = [
  { step: 0.2, wave: 'triangle', n: [0, 4, 7, 4, 9, 7, 4, 0, 2, 4, 2, -1, 0, 0, 7, 0, 5, 9, 12, 9, 7, 4, 7, 0, 2, 7, 4, 2, 0, 0, -1, 0] },
  { step: 0.18, wave: 'square', n: [12, 0, 9, 0, 7, 9, 12, 0, 14, 12, 9, 7, 9, 0, 0, 0, 7, 0, 4, 0, 2, 4, 7, 0, 9, 7, 4, 2, 0, 0, 0, 0] },
  { step: 0.22, wave: 'triangle', n: [7, 9, 7, 4, 2, 4, 0, 0, 2, 4, 7, 9, 7, 0, 0, 0, 4, 7, 12, 11, 9, 7, 4, 0, 5, 4, 2, 0, 2, 0, 0, 0] },
  { step: 0.24, wave: 'sine', n: [0, 7, 12, 7, 4, 7, 11, 7, 2, 9, 14, 9, 5, 9, 12, 9, 0, 7, 12, 7, 4, 7, 11, 7, 2, 7, 11, 14, 12, 0, 0, 0] },
  { step: 0.26, wave: 'triangle', n: [12, 0, 11, 9, 7, 0, 4, 0, 5, 7, 9, 0, 7, 0, 0, 0, 9, 0, 7, 5, 4, 0, 2, 0, 4, 5, 7, 0, 0, 0, 0, 0] }
];
function musicTick() {
  const a = AU.ctx; if (!a || a.state !== 'running' || !AU.musicOn) { if (a) AU.nextT = a.currentTime + 0.1; return; }
  const tune = TUNES[THEMES[G.theme].music];
  if (AU.nextT < a.currentTime) AU.nextT = a.currentTime + 0.05;
  while (AU.nextT < a.currentTime + 0.12) {
    const n = tune.n[AU.step % tune.n.length];
    if (n) tone(523.25 * Math.pow(2, n / 12), tune.step * 0.9, tune.wave, 0.05, AU.nextT - a.currentTime, null, AU.music);
    else if (AU.step % 4 === 0) tone(130.8, tune.step * 1.6, 'sine', 0.07, AU.nextT - a.currentTime, null, AU.music);
    AU.nextT += tune.step; AU.step++;
  }
}
function setMusic(on) { AU.musicOn = on; $('btnMusic').textContent = '🎵 Music: ' + (on ? 'On' : 'Off'); saveGame(); }

/* ---------- canvas & cached art ---------- */
const cv = $('cv'), ctx = cv.getContext('2d');
const fxc = $('fx'), fx = fxc.getContext('2d');
let RS = 1;
const cache = new Map();
function cached(key, w, h, fn, scale) {
  scale = scale || RS; const k = key + '@' + scale;
  let c = cache.get(k);
  if (!c) { c = document.createElement('canvas'); c.width = Math.ceil(w * scale); c.height = Math.ceil(h * scale); const g = c.getContext('2d'); g.scale(scale, scale); fn(g); cache.set(k, c); }
  return c;
}
function rr(g, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2); g.beginPath();
  g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
}
function shade(hex, p) {
  const n = parseInt(hex.slice(1), 16); let r = n >> 16, gg = (n >> 8) & 255, b = n & 255;
  const t = p < 0 ? 0 : 255, a = Math.abs(p);
  r = Math.round(r + (t - r) * a); gg = Math.round(gg + (t - gg) * a); b = Math.round(b + (t - b) * a);
  return 'rgb(' + r + ',' + gg + ',' + b + ')';
}
function ink(g, w) { g.lineWidth = w || 5; g.strokeStyle = OL; g.lineJoin = 'round'; g.lineCap = 'round'; g.stroke(); }
const TEAM = {
  w: { hi: '#fffdf0', mid: '#ffe17a', lo: '#e3a218', trim: '#ff6f61', mood: 'happy' },
  b: { hi: '#e6d2ff', mid: '#a06ff4', lo: '#5a34b0', trim: '#ff8ccf', mood: 'grumpy' }
};
function vgrad(g, y0, y1, T) { const gr = g.createLinearGradient(0, y0, 0, y1); gr.addColorStop(0, T.hi); gr.addColorStop(0.5, T.mid); gr.addColorStop(1, T.lo); return gr; }
function ball(g, x, y, r, T) {
  const gr = g.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r);
  gr.addColorStop(0, T.hi); gr.addColorStop(0.6, T.mid); gr.addColorStop(1, T.lo);
  g.beginPath(); g.arc(x, y, r, 0, TAU); g.fillStyle = gr; g.fill(); ink(g);
}
function shine(g, x, y, rx, ry) { g.beginPath(); g.ellipse(x, y, rx, ry, -0.5, 0, TAU); g.fillStyle = 'rgba(255,255,255,0.55)'; g.fill(); }
function face(g, x, y, s, mood) {
  // blush
  g.fillStyle = 'rgba(255,110,140,0.45)';
  g.beginPath(); g.ellipse(x - 11 * s, y + 5 * s, 4.2 * s, 2.8 * s, 0, 0, TAU); g.fill();
  g.beginPath(); g.ellipse(x + 11 * s, y + 5 * s, 4.2 * s, 2.8 * s, 0, 0, TAU); g.fill();
  g.fillStyle = '#1d2340'; g.strokeStyle = '#1d2340'; g.lineCap = 'round';
  if (mood === 'sleepy' || mood === 'happyclosed') {
    g.lineWidth = 2.6 * s;
    for (const sx of [-1, 1]) { g.beginPath(); if (mood === 'sleepy') { g.moveTo(x + sx * 7 * s - 4 * s, y); g.lineTo(x + sx * 7 * s + 4 * s, y); } else g.arc(x + sx * 7 * s, y + 1.5 * s, 4 * s, Math.PI * 1.15, Math.PI * 1.85); g.stroke(); }
  } else {
    for (const sx of [-1, 1]) {
      g.beginPath(); g.ellipse(x + sx * 7 * s, y, 3.4 * s, 4.4 * s, 0, 0, TAU); g.fill();
      g.fillStyle = '#fff'; g.beginPath(); g.arc(x + sx * 7 * s - 1.1 * s, y - 1.7 * s, 1.4 * s, 0, TAU); g.fill(); g.fillStyle = '#1d2340';
    }
  }
  g.lineWidth = 2.6 * s;
  if (mood === 'grumpy') {
    g.beginPath(); g.moveTo(x - 12 * s, y - 9 * s); g.lineTo(x - 3.5 * s, y - 6 * s); g.moveTo(x + 12 * s, y - 9 * s); g.lineTo(x + 3.5 * s, y - 6 * s); g.stroke();
    g.beginPath(); g.arc(x, y + 11.5 * s, 4.5 * s, Math.PI * 1.2, Math.PI * 1.8); g.stroke();
  } else if (mood === 'surprised') {
    g.beginPath(); g.ellipse(x, y + 8 * s, 2.6 * s, 3.4 * s, 0, 0, TAU); g.fill();
  } else if (mood === 'sleepy') {
    g.beginPath(); g.arc(x, y + 7 * s, 2.5 * s, 0, TAU); g.stroke();
  } else {
    g.beginPath(); g.arc(x, y + 3.5 * s, 5.5 * s, Math.PI * 0.18, Math.PI * 0.82); g.stroke();
  }
}
function pieceBase(g, T) {
  g.beginPath(); g.ellipse(0, 38, 34, 9, 0, 0, TAU); g.fillStyle = T.lo; g.fill(); ink(g);
  rr(g, -30, 23, 60, 15, 7.5); g.fillStyle = vgrad(g, 23, 38, T); g.fill(); ink(g);
  g.fillStyle = 'rgba(255,255,255,0.35)'; rr(g, -24, 25.5, 48, 4, 2); g.fill();
}
function flaredBody(g, T, top, wTop) {
  g.beginPath(); g.moveTo(-23, 25); g.quadraticCurveTo(-wTop - 3, 6, -wTop, top); g.lineTo(wTop, top); g.quadraticCurveTo(wTop + 3, 6, 23, 25); g.closePath();
  g.fillStyle = vgrad(g, top, 25, T); g.fill(); ink(g);
  rr(g, -wTop - 5, top - 5, wTop * 2 + 10, 9, 4.5); g.fillStyle = T.mid; g.fill(); ink(g, 4);
}
function goldCrown(g) { const gr = g.createLinearGradient(0, -70, 0, -32); gr.addColorStop(0, '#fff3a0'); gr.addColorStop(0.5, '#ffd23c'); gr.addColorStop(1, '#d99400'); return gr; }
// Draws a piece in a 100-unit space: base sits at y = 38, top reaches about y = -72.
function drawPieceUnits(g, t, c, mood) {
  const T = TEAM[c]; mood = mood || T.mood;
  pieceBase(g, T);
  if (t === 'P') {
    flaredBody(g, T, -4, 10);
    ball(g, 0, -24, 19, T); shine(g, -7, -33, 6, 3.5); face(g, 0, -23, 1, mood);
  } else if (t === 'R') {
    rr(g, -21, -24, 42, 50, 6); g.fillStyle = vgrad(g, -24, 26, T); g.fill(); ink(g);
    g.beginPath(); g.moveTo(-28, -20); g.lineTo(-28, -46); g.lineTo(-17, -46); g.lineTo(-17, -38); g.lineTo(-6, -38); g.lineTo(-6, -46); g.lineTo(6, -46); g.lineTo(6, -38);
    g.lineTo(17, -38); g.lineTo(17, -46); g.lineTo(28, -46); g.lineTo(28, -20); g.closePath(); g.fillStyle = vgrad(g, -46, -20, T); g.fill(); ink(g);
    g.fillStyle = 'rgba(255,255,255,0.45)'; rr(g, -24, -43, 6, 18, 3); g.fill();
    face(g, 0, 0, 1.05, mood);
  } else if (t === 'B') {
    flaredBody(g, T, -6, 9);
    g.beginPath(); g.moveTo(0, -64); g.bezierCurveTo(25, -48, 25, -16, 0, -11); g.bezierCurveTo(-25, -16, -25, -48, 0, -64); g.closePath();
    const gr = g.createRadialGradient(-6, -42, 3, 0, -34, 28); gr.addColorStop(0, T.hi); gr.addColorStop(0.6, T.mid); gr.addColorStop(1, T.lo); g.fillStyle = gr; g.fill(); ink(g);
    g.beginPath(); g.moveTo(5, -52); g.lineTo(14, -40); g.lineWidth = 4.5; g.strokeStyle = T.trim; g.lineCap = 'round'; g.stroke();
    ball(g, 0, -66, 6, { hi: '#fff', mid: T.trim, lo: shade(T.trim.length === 7 ? T.trim : '#ff6f61', -0.3) });
    shine(g, -9, -44, 4, 7); face(g, 0, -28, 0.95, mood);
  } else if (t === 'N') {
    g.beginPath();
    g.moveTo(-24, 25); g.lineTo(-22, 2); g.quadraticCurveTo(-27, -30, -7, -48); g.lineTo(-3, -62); g.lineTo(6, -48);
    g.quadraticCurveTo(26, -42, 33, -22); g.quadraticCurveTo(37, -10, 27, -7); g.quadraticCurveTo(17, -5, 8, -11); g.quadraticCurveTo(9, 6, 22, 25); g.closePath();
    g.fillStyle = vgrad(g, -62, 25, T); g.fill(); ink(g);
    g.fillStyle = T.trim; for (let i = 0; i < 5; i++) { const k = i / 4; g.beginPath(); g.arc(lerp(-24, -9, k) + Math.sin(k * 3) * 2, lerp(2, -44, k), 6.5, 0, TAU); g.fill(); ink(g, 3); }
    shine(g, 10, -38, 7, 3);
    g.fillStyle = '#fff'; g.beginPath(); g.arc(9, -30, 7.5, 0, TAU); g.fill(); ink(g, 3);
    g.fillStyle = '#1d2340'; g.beginPath(); g.arc(11, -29.5, 4.2, 0, TAU); g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.arc(9.6, -31.5, 1.6, 0, TAU); g.fill();
    g.fillStyle = '#1d2340'; g.beginPath(); g.arc(28, -16, 2, 0, TAU); g.fill();
    g.fillStyle = 'rgba(255,110,140,0.45)'; g.beginPath(); g.ellipse(16, -19, 4.5, 3, 0, 0, TAU); g.fill();
    g.strokeStyle = '#1d2340'; g.lineWidth = 2.6; g.beginPath();
    if (mood === 'grumpy') { g.moveTo(2, -41); g.lineTo(15, -37); g.stroke(); g.beginPath(); g.arc(21, -6, 4, Math.PI * 1.25, Math.PI * 1.75); }
    else g.arc(21, -14, 4.5, Math.PI * 0.2, Math.PI * 0.8);
    g.stroke();
  } else if (t === 'Q') {
    // queen: long hair and a spiky crown with a pearl on every point
    const hair = c === 'w' ? '#ff9f43' : '#ff8ccf';
    for (const sx of [-1, 1]) { g.beginPath(); g.ellipse(sx * 16, -12, 9, 21, sx * -0.15, 0, TAU); g.fillStyle = hair; g.fill(); ink(g, 4); }
    flaredBody(g, T, -6, 11);
    ball(g, 0, -23, 18, T); shine(g, -7, -31, 6, 3.5);
    g.beginPath(); g.moveTo(-19, -35); g.lineTo(-22, -57); g.lineTo(-14, -45); g.lineTo(-10, -63); g.lineTo(-4, -46); g.lineTo(0, -68);
    g.lineTo(4, -46); g.lineTo(10, -63); g.lineTo(14, -45); g.lineTo(22, -57); g.lineTo(19, -35); g.closePath();
    g.fillStyle = goldCrown(g); g.fill(); ink(g, 4);
    for (const [x, y] of [[-22, -57], [-10, -63], [0, -68], [10, -63], [22, -57]]) { g.beginPath(); g.arc(x, y, 4.2, 0, TAU); g.fillStyle = '#fff'; g.fill(); ink(g, 2.5); }
  } else if (t === 'K') {
    // king: the tallest piece, a round crown with a big cross on top
    flaredBody(g, T, -6, 14);
    ball(g, 0, -23, 19, T); shine(g, -7, -31, 6, 3.5);
    g.beginPath(); g.moveTo(-20, -36); g.lineTo(-20, -48); g.quadraticCurveTo(0, -72, 20, -48); g.lineTo(20, -36); g.closePath();
    g.fillStyle = goldCrown(g); g.fill(); ink(g, 4);
    rr(g, -21, -43, 42, 9, 4); g.fillStyle = '#e09a00'; g.fill(); ink(g, 3);
    g.beginPath(); g.arc(0, -39, 3.6, 0, TAU); g.fillStyle = T.trim; g.fill();
    rr(g, -5, -84, 10, 26, 3); g.fillStyle = goldCrown(g); g.fill(); ink(g, 4);
    rr(g, -13, -77, 26, 9, 3); g.fill(); ink(g, 4);
    g.fillStyle = '#ffd23c'; g.fillRect(-3, -82, 6, 22); g.fillRect(-11, -75, 22, 5);
    face(g, 0, -20, 0.95, mood);
  }
}
const PK = SQ / 134; // piece units -> logical px; a king (123 units tall) fits inside one square
function pieceSprite(t, c, mood) { return cached('pc' + t + c + (mood || ''), 120 * PK, 136 * PK, (g) => { g.scale(PK, PK); g.translate(60, 86); drawPieceUnits(g, t, c, mood); }); }
function drawPiece(t, c, x, y, opts) {
  // x, y = square centre; opts: lift, scale, rot, alpha, mood
  opts = opts || {};
  const s = opts.scale || 1, spr = pieceSprite(t, c, opts.mood), w = 120 * PK * s, h = 136 * PK * s, baseY = y + SQ * 0.5 - 3 - 47 * PK * s;
  ctx.save();
  ctx.globalAlpha = opts.alpha == null ? 1 : opts.alpha;
  ctx.translate(x, baseY - (opts.lift || 0));
  if (opts.rot) ctx.rotate(opts.rot);
  if (opts.sx) ctx.scale(opts.sx, 1 / opts.sx);
  ctx.drawImage(spr, -60 * PK * s, -86 * PK * s, w, h);
  ctx.restore();
}
function pieceImage(t, c, px, mood) {
  const cvs = document.createElement('canvas'), k = px / 138; cvs.width = cvs.height = px;
  const g = cvs.getContext('2d'); g.scale(k, k); g.translate(69, 88); drawPieceUnits(g, t, c, mood); return cvs.toDataURL();
}
function starUnits(g) {
  g.beginPath();
  for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 19 : 42; g.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
  g.closePath();
  const gr = g.createLinearGradient(0, -42, 0, 38); gr.addColorStop(0, '#fff6a8'); gr.addColorStop(0.5, '#ffd23c'); gr.addColorStop(1, '#f39a00');
  g.fillStyle = gr; g.fill(); g.lineJoin = 'round'; ink(g, 5);
  shine(g, -8, -16, 5, 3); face(g, 0, 2, 0.75, 'happy');
}
function starSprite() { const k = SQ * 0.86 / 100; return cached('star', 100 * k, 100 * k, (g) => { g.scale(k, k); g.translate(50, 52); starUnits(g); }); }
function blockSprite() {
  return cached('block', SQ, SQ, (g) => {
    const x = 5, y = 9, w = SQ - 10, h = SQ - 14;
    g.fillStyle = 'rgba(20,24,40,0.25)'; rr(g, x + 2, y + 4, w, h, 8); g.fill();
    const gr = g.createLinearGradient(0, y, 0, y + h); gr.addColorStop(0, '#ff8a7a'); gr.addColorStop(1, '#d93a3a');
    rr(g, x, y, w, h, 8); g.fillStyle = gr; g.fill();
    g.fillStyle = 'rgba(255,255,255,0.22)'; rr(g, x + 4, y + 3, w - 8, 7, 3.5); g.fill();
    rr(g, x, y, w, h, 8); g.lineWidth = 3; g.strokeStyle = OL; g.stroke();
    for (const sx of [x + w * 0.3, x + w * 0.7]) {
      const sg = g.createLinearGradient(0, y - 6, 0, y + 2); sg.addColorStop(0, '#ffb0a5'); sg.addColorStop(1, '#e05050');
      g.beginPath(); g.ellipse(sx, y - 1, 7.5, 4.5, 0, 0, TAU); g.fillStyle = sg; g.fill(); g.lineWidth = 2.5; g.stroke();
      g.fillStyle = '#fff'; g.beginPath(); g.arc(sx - 3, y - 2.5, 1.4, 0, TAU); g.fill();
    }
  });
}
function gemPath(g, x, y, s) { g.beginPath(); g.moveTo(x, y - s); g.lineTo(x + s * 0.85, y - s * 0.25); g.lineTo(x, y + s); g.lineTo(x - s * 0.85, y - s * 0.25); g.closePath(); }
function drawGem(x, y, s, on) {
  gemPath(ctx, x, y, s);
  if (on) { const gr = ctx.createLinearGradient(0, y - s, 0, y + s); gr.addColorStop(0, '#d8fbff'); gr.addColorStop(0.5, '#38d6ff'); gr.addColorStop(1, '#1477d6'); ctx.fillStyle = gr; }
  else ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = OL; ctx.stroke();
  if (on) { ctx.fillStyle = 'rgba(255,255,255,0.75)'; ctx.beginPath(); ctx.moveTo(x - s * 0.3, y - s * 0.5); ctx.lineTo(x, y - s * 0.75); ctx.lineTo(x + s * 0.1, y - s * 0.3); ctx.closePath(); ctx.fill(); }
}
function boardSprite() {
  const th = THEMES[G.theme], size = SQ * 8 + PAD * 2;
  return cached('board' + G.theme, size + 10, size + 14, (g) => {
    g.fillStyle = 'rgba(20,24,40,0.3)'; rr(g, 3, 9, size, size, 24); g.fill();
    const fr = g.createLinearGradient(0, 0, 0, size); fr.addColorStop(0, '#ffe98a'); fr.addColorStop(0.5, '#ffcf3a'); fr.addColorStop(1, '#d99712');
    rr(g, 0, 0, size, size, 22); g.fillStyle = fr; g.fill(); g.lineWidth = 3; g.strokeStyle = OL; g.stroke();
    g.fillStyle = 'rgba(255,255,255,0.32)'; rr(g, 10, 4, size - 20, 7, 3.5); g.fill();
    // studs around the frame, like a toy board
    for (let i = 0; i < 8; i++) for (const [sx, sy] of [[PAD + i * SQ + SQ / 2, PAD / 2], [PAD + i * SQ + SQ / 2, size - PAD / 2]]) {
      g.beginPath(); g.ellipse(sx, sy, 6, 3.6, 0, 0, TAU); g.fillStyle = 'rgba(255,255,255,0.35)'; g.fill(); g.lineWidth = 1.5; g.strokeStyle = 'rgba(20,24,40,0.25)'; g.stroke();
    }
    g.fillStyle = 'rgba(20,24,40,0.25)'; rr(g, PAD - 3, PAD - 3, SQ * 8 + 6, SQ * 8 + 6, 10); g.fill();
    for (let r = 0; r < 8; r++) for (let f = 0; f < 8; f++) {
      const x = PAD + f * SQ, y = PAD + r * SQ, base = (r + f) % 2 === 0 ? th.light : th.dark;
      const gr = g.createLinearGradient(0, y, 0, y + SQ); gr.addColorStop(0, shade(base, 0.22)); gr.addColorStop(1, shade(base, -0.12));
      rr(g, x + 1.5, y + 1.5, SQ - 3, SQ - 3, 7); g.fillStyle = gr; g.fill();
      g.fillStyle = 'rgba(255,255,255,0.22)'; rr(g, x + 6, y + 4.5, SQ - 12, 6, 3); g.fill();
      rr(g, x + 1.5, y + 1.5, SQ - 3, SQ - 3, 7); g.lineWidth = 1.5; g.strokeStyle = 'rgba(20,24,40,0.22)'; g.stroke();
    }
    g.font = '13px ' + FONT; g.fillStyle = 'rgba(90,58,0,0.85)'; g.textAlign = 'center'; g.textBaseline = 'middle';
    for (let i = 0; i < 8; i++) { g.fillText('abcdefgh'[i], PAD + i * SQ + SQ / 2, size - PAD / 2 + 1); g.fillText(String(8 - i), PAD / 2, PAD + i * SQ + SQ / 2); }
  });
}
function owlUnits(g, blink) {
  const brown = { hi: '#e7b27a', mid: '#c98a4b', lo: '#8a5527' };
  for (const sx of [-1, 1]) { g.beginPath(); g.moveTo(sx * 22, -44); g.lineTo(sx * 38, -66); g.lineTo(sx * 40, -36); g.closePath(); g.fillStyle = brown.mid; g.fill(); ink(g); }
  for (const sx of [-1, 1]) { g.beginPath(); g.ellipse(sx * 44, 10, 13, 30, sx * 0.25, 0, TAU); g.fillStyle = brown.lo; g.fill(); ink(g); }
  g.beginPath(); g.ellipse(0, 0, 46, 58, 0, 0, TAU); g.fillStyle = vgrad(g, -58, 58, brown); g.fill(); ink(g);
  g.beginPath(); g.ellipse(0, 18, 30, 34, 0, 0, TAU); g.fillStyle = '#fbe6c2'; g.fill();
  g.strokeStyle = 'rgba(138,85,39,0.5)'; g.lineWidth = 2.5;
  for (let i = 0; i < 3; i++) for (let j = -1; j <= 1; j++) { g.beginPath(); g.arc(j * 11 + (i % 2) * 5, 8 + i * 11, 4, 0.2, Math.PI - 0.2); g.stroke(); }
  for (const sx of [-1, 1]) {
    g.beginPath(); g.arc(sx * 17, -20, 16, 0, TAU); g.fillStyle = '#fff'; g.fill(); ink(g, 4);
    if (blink) { g.beginPath(); g.moveTo(sx * 17 - 9, -20); g.lineTo(sx * 17 + 9, -20); g.lineWidth = 3.5; g.strokeStyle = '#1d2340'; g.stroke(); }
    else { g.beginPath(); g.arc(sx * 17 + 2, -19, 8.5, 0, TAU); g.fillStyle = '#1d2340'; g.fill(); g.beginPath(); g.arc(sx * 17 - 1, -23, 3, 0, TAU); g.fillStyle = '#fff'; g.fill(); }
  }
  g.beginPath(); g.moveTo(-7, -6); g.lineTo(7, -6); g.lineTo(0, 6); g.closePath(); g.fillStyle = '#ffa63a'; g.fill(); ink(g, 3);
  g.fillStyle = 'rgba(255,110,140,0.45)'; g.beginPath(); g.ellipse(-30, -2, 6, 3.5, 0, 0, TAU); g.fill(); g.beginPath(); g.ellipse(30, -2, 6, 3.5, 0, 0, TAU); g.fill();
  for (const sx of [-1, 1]) { g.beginPath(); g.ellipse(sx * 15, 57, 10, 5, 0, 0, TAU); g.fillStyle = '#ffa63a'; g.fill(); ink(g, 3); }
  // teacher hat
  g.beginPath(); g.moveTo(-34, -56); g.lineTo(0, -70); g.lineTo(34, -56); g.lineTo(0, -42); g.closePath(); g.fillStyle = '#2f3f8f'; g.fill(); ink(g, 3.5);
  rr(g, -16, -54, 32, 12, 4); g.fillStyle = '#26337a'; g.fill(); ink(g, 3);
  g.beginPath(); g.moveTo(0, -56); g.lineTo(26, -50); g.lineTo(28, -36); g.lineWidth = 3; g.strokeStyle = '#ffd23c'; g.stroke();
  g.beginPath(); g.arc(28, -34, 4, 0, TAU); g.fillStyle = '#ffd23c'; g.fill();
}
function owlSprite(blink) { return cached('owl' + (blink ? 'b' : ''), 120, 150, (g) => { g.translate(60, 78); owlUnits(g, blink); }); }

/* ---------- game state ---------- */
const FAMILY = window.parent !== window && new URLSearchParams(location.search).has('family') ? window.parent.FamilyRoom : null;
let familyRemoteAction = false;
const G = {
  screen: 'title', paused: false, theme: 0, t: 0, speed: 1,
  mode: 'level', li: 0, pi: 0, kind: 'stars',
  pos: null, stars: [], sprites: [], cursor: 52, sel: -1, targets: [], autoSel: false,
  moves: 0, par: 0, tries: 0, gems: [false, false, false], hintM: null, hintT: 0,
  busy: 0, locked: false, thinking: false, timers: [], parts: [], texts: [], banner: null, shake: 0,
  owl: '', owlPop: 0, grumSay: '', grumMood: 'grumpy', grumPop: 0, hist: [], ply: 0, capQ: false, lastMove: null, idle: 0, curPulse: 0, puzzleStart: null, starsStart: []
};
let SID = 1;
function after(sec, fn) { G.timers.push({ t: sec / G.speed, fn }); }
function say(text) { if (G.owl !== text) G.owlPop = 1; G.owl = text; }
function grumble(text, mood) { G.grumSay = text; G.grumPop = 1; if (mood) G.grumMood = mood; }
function floatText(text, x, y, color, size) { G.texts.push({ text, x, y, t: 0, life: 1.3, color: color || '#fff', size: size || 30 }); }
function banner(text, color) { G.banner = { text, t: 0, color: color || '#ff3b30' }; }
function burst(x, y, n, colors, star) {
  for (let i = 0; i < n; i++) {
    if (G.parts.length > 300) G.parts.shift();
    const a = Math.random() * TAU, sp = 60 + Math.random() * 220;
    G.parts.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 120, t: 0, life: 0.6 + Math.random() * 0.5, c: colors[i % colors.length], s: 3 + Math.random() * 4, star: !!star && i % 3 === 0 });
  }
}
function makeSprite(ch, sq) { return { id: SID++, t: ch === '#' ? '#' : ch.toUpperCase(), c: colorOf(ch), sq, x: sqX(sq), y: sqY(sq), mv: null, dying: null, drop: null, shake: 0, tip: 0, pop: 0 }; }
function buildSprites(dropIn) {
  G.sprites = [];
  let i = 0;
  for (let sq = 0; sq < 64; sq++) {
    const ch = G.pos.b[sq]; if (ch === '.') continue;
    const s = makeSprite(ch, sq); if (dropIn) s.drop = -0.04 * i++ - 0.1; G.sprites.push(s);
  }
  if (dropIn) G.starDrop = -0.04 * i - 0.1; else G.starDrop = null;
}
function spriteAt(sq) { return G.sprites.find((s) => s.sq === sq && !s.dying); }
function animateMove(m, onLand) {
  const sp = spriteAt(m.from); if (!sp) { onLand && onLand(); return; }
  const mover = sp.c, capSq = m.ep ? m.to + (mover === 'w' ? 8 : -8) : m.to;
  const victim = m.cap ? G.sprites.find((s) => s.sq === capSq && s !== sp && !s.dying) : null;
  const dist = Math.hypot((m.to & 7) - (m.from & 7), (m.to >> 3) - (m.from >> 3));
  const knight = sp.t === 'N';
  G.busy++;
  if (knight) sfx.hop();
  sp.mv = { x0: sp.x, y0: sp.y, x1: sqX(m.to), y1: sqY(m.to), t: 0, dur: knight ? 0.42 : Math.min(0.5, 0.2 + dist * 0.05), arc: knight ? 38 : 8 + dist * 3,
    cb: () => {
      sp.sq = m.to; sp.pop = 1; G.busy--;
      sfx.move(); G.shake = Math.max(G.shake, victim ? 5 : 1.5);
      if (victim) {
        victim.dying = { t: 0, vx: (Math.random() < 0.5 ? -1 : 1) * (120 + Math.random() * 80), vy: -340, rot: 0 };
        burst(sqX(capSq), sqY(capSq), 22, victim.c === 'b' ? ['#c9a8ff', '#8f5cf0', '#ffffff', '#ff8ccf'] : ['#fff3c4', '#ffd23c', '#ffffff'], true);
        sfx.gobble(); floatText(victim.c === 'b' ? 'Gobble!' : 'Bonk!', sqX(capSq), sqY(capSq) - 30, victim.c === 'b' ? '#ffe14d' : '#ff8ccf', 30);
      }
      if (m.promo) { sp.t = 'Q'; sp.pop = 1.6; sfx.promote(); burst(sqX(m.to), sqY(m.to), 30, ['#ffd23c', '#fff', '#ff6f61', '#38d6ff'], true); floatText('QUEEN!', sqX(m.to), sqY(m.to) - 40, '#ffe14d', 38); }
      onLand && onLand();
    } };
  if (m.castle) {
    const home = mover === 'w' ? 60 : 4, rf = m.castle === 'K' ? home + 3 : home - 4, rt = m.castle === 'K' ? home + 1 : home - 1, rook = spriteAt(rf);
    if (rook) { rook.mv = { x0: rook.x, y0: rook.y, x1: sqX(rt), y1: sqY(rt), t: 0, dur: 0.4, arc: 26, cb: () => { rook.sq = rt; } }; floatText('Castle!', sqX(home), sqY(home) - 40, '#fff', 30); }
  }
}

/* ---------- levels & puzzles ---------- */
function setTheme(i) { G.theme = i; }
function isPuzzle() { return G.kind === 'stars' || G.kind === 'gobble' || G.kind === 'safe'; }
function startLevel(li) {
  const lv = LEVELS[li];
  G.mode = 'level'; G.li = li; G.kind = lv.kind; G.gems = [false, false, false]; setTheme(lv.theme);
  if (lv.kind === 'game') startGame(); else loadPuzzle(0);
  showHintCard('Level ' + (li + 1) + ': ' + lv.name, lv.tip, lv.icon);
}
function startFree(mode) {
  G.mode = mode; G.kind = 'game'; G.gems = [false, false, false];
  setTheme(mode === 'two' ? 3 : 9); startGame();
  if (mode === 'two') showHintCard('2 Players', 'Sunny team goes first. Take turns. Trap the other king to win!', ['N', 'w']);
  else showHintCard('Play Grumble', 'A real game with King Grumble. You are the sunny team. You go first!', ['K', 'b']);
}
function resetTurnState() { G.sel = -1; G.targets = []; G.hintM = null; G.locked = false; G.thinking = false; G.timers = []; G.busy = 0; G.lastMove = null; G.idle = 0; G.banner = null; }
function loadPuzzle(pi) {
  const lv = LEVELS[G.li]; G.pi = pi;
  const { pos, stars } = posFromRows(lv.puzzles[pi], 'w', '');
  resetTurnState();
  G.pos = pos; G.stars = stars; G.puzzleStart = pos; G.starsStart = stars.slice(); G.moves = 0; G.tries = 0;
  if (lv.kind !== 'mate') { const sol = solvePuzzle(pos, stars, lv.kind !== 'stars', lv.kind === 'safe'); G.par = sol ? sol.length : 99; }
  buildSprites(true);
  const whites = []; for (let sq = 0; sq < 64; sq++) if (colorOf(pos.b[sq]) === 'w') whites.push(sq);
  G.autoSel = whites.length === 1 && lv.kind !== 'mate';
  G.cursor = lv.kind === 'mate' ? whites.find((s) => pos.b[s] !== 'K') : whites[0];
  if (G.autoSel) after(0.6, () => { if (G.sel < 0) select(G.cursor, true); });
  say((lv.owl && lv.owl[pi]) || lv.tip);
}
function startGame() {
  resetTurnState();
  G.pos = startPosition(); G.stars = []; G.hist = []; G.ply = 0; G.allPlies = 0; G.capQ = false; G.autoSel = false; G.cursor = 52;
  buildSprites(true);
  G.grumMood = 'grumpy'; G.grumSay = G.mode === 'two' ? '' : 'Hmph! Let’s play!';
  say(G.mode === 'two' ? 'Sunny team, your turn!' : 'You are the sunny team. You go first! Try moving a pawn.');
}
function restartCurrent() {
  if (G.mode !== 'level') startFree(G.mode);
  else if (G.kind === 'game') startLevel(G.li);
  else { loadPuzzle(G.pi); }
}

/* ---------- player actions ---------- */
function myTurn() { if(FAMILY && G.mode==='two')return G.pos.turn===(familyRemoteAction?'b':'w'); return G.mode === 'two' || isPuzzle() || G.kind === 'mate' || G.pos.turn === 'w'; }
function canAct() { return G.screen === 'play' && !G.paused && !G.busy && !G.locked && !G.thinking && myTurn(); }
function sideToPlay() { return isPuzzle() ? 'w' : G.pos.turn; }
function movesFrom(sq) {
  if (isPuzzle()) {
    return genMoves({ b: G.pos.b, turn: 'w', castle: '', ep: -1 }, 'w').filter((m) => m.from === sq).map((m) => {
      if (G.kind === 'safe') m.danger = attacked(makeMove(G.pos, m, true).b, m.to, 'b'); return m;
    });
  }
  return legalMoves(G.pos).filter((m) => m.from === sq).map((m) => {
    if (G.mode !== 'two') m.danger = attacked(makeMove(G.pos, m).b, m.to, 'b'); return m;
  });
}
function select(sq, quiet) {
  G.sel = sq; G.targets = movesFrom(sq);
  const sp = spriteAt(sq); if (sp) sp.pop = 1;
  if (!quiet) sfx.select();
  const t = G.pos.b[sq].toUpperCase();
  if (!G.targets.length) say(inCheck(G.pos, sideToPlay()) ? 'Check! This piece cannot help. Save your king!' : 'This ' + NAME[t] + ' is stuck. Pick another piece!');
  else if (!G.hintM && (G.kind === 'game' || G.kind === 'mate' || !G.autoSel || !G.owl)) say(PIECE_TIP[t]);
}
function deselect() { G.sel = -1; G.targets = []; }
function moveCursor(dx, dy) {
  if(FAMILY && G.screen==='play' && !myTurn())return;
  if (G.screen !== 'play' || G.paused) return;
  const r = clamp((G.cursor >> 3) + dy, 0, 7), f = clamp((G.cursor & 7) + dx, 0, 7), n = r * 8 + f;
  if (n !== G.cursor) { G.cursor = n; G.curPulse = 1; G.idle = 0; sfx.tick(); }
}
function activate() {
  G.idle = 0;
  if (!canAct()) { if (G.thinking) say('Wait! Grumble is thinking...'); return; }
  const sq = G.cursor, p = G.pos.b[sq], me = sideToPlay();
  if (G.sel >= 0) {
    const m = G.targets.find((mm) => mm.to === sq);
    if (m) { playerMove(m); return; }
    if (sq === G.sel) { if (!G.autoSel) { deselect(); sfx.tick(); } return; }
  }
  if (colorOf(p) === me) { select(sq); return; }
  sfx.wrong();
  if (G.sel >= 0) {
    const sp = spriteAt(G.sel); if (sp) sp.shake = 0.35;
    const t = G.pos.b[G.sel].toUpperCase();
    const pseudo = !isPuzzle() && genMoves(G.pos).some((mm) => mm.from === G.sel && mm.to === sq);
    if (pseudo) say(inCheck(G.pos, me) ? 'Check! You must save your king first!' : 'No! Your king would be in danger there.');
    else if (p === '#') say('Toy blocks are in the way!');
    else say('Oops! ' + PIECE_TIP[t]);
  } else say(p === '.' ? 'Pick one of your pieces first!' : (G.mode === 'two' ? 'It is the other team’s turn!' : 'That is a grumpy piece. Pick one of YOUR pieces!'));
}
function playerMove(m) {
  G.hintM = null; G.idle = 0;
  if (isPuzzle()) {
    const np = makeMove(G.pos, m, true);
    if (G.kind === 'safe' && attacked(np.b, m.to, 'b')) {
      G.locked = true; deselect();
      animateMove(m, () => {
        const bumpers = [];
        for (let s = 0; s < 64; s++) if (colorOf(np.b[s]) === 'b' && genMoves({ b: np.b, turn: 'b', castle: '', ep: -1 }, 'b').some((mm) => mm.from === s && mm.to === m.to)) bumpers.push(s);
        G.bump = { from: bumpers[0], to: m.to, t: 0 };
        sfx.oops(); G.shake = 6; floatText('Oops!', sqX(m.to), sqY(m.to) - 36, '#ff8a3d', 36);
        const bt = bumpers.length ? NAME[np.b[bumpers[0]].toUpperCase()] : 'piece';
        say('Oops! The grumpy ' + bt + ' can bump you there. Try a safe square!');
        after(1.8, () => { G.bump = null; buildSprites(false); G.locked = false; if (G.autoSel) select(G.cursor = firstWhite(), true); });
      });
      return;
    }
    G.pos = np; G.moves++; deselect(); G.lastMove = m;
    animateMove(m, () => {
      const si = G.stars.indexOf(m.to);
      if (si >= 0) { G.stars.splice(si, 1); burst(sqX(m.to), sqY(m.to), 24, ['#ffd23c', '#fff6a8', '#ffffff', '#ff9f1a'], true); sfx.star(); floatText('+1 ★', sqX(m.to), sqY(m.to) - 34, '#ffe14d', 32); }
      if (puzzleDone()) { puzzleSolved(); return; }
      if (G.autoSel) { G.cursor = m.to; select(m.to, true); }
    });
    return;
  }
  if (G.kind === 'mate') {
    const np = makeMove(G.pos, m); G.pos = np; deselect(); G.lastMove = m; G.locked = true;
    animateMove(m, () => {
      const st = gameStatus(np);
      if (st === 'mate') { banner('CHECKMATE!'); sfx.check(); puzzleSolved(); return; }
      G.tries++; sfx.wrong();
      if (st === 'check') { banner('CHECK!', '#ff8a3d'); say('Check! But the king can still get away. Try again!'); }
      else say('Not a trap yet. Try again!');
      after(1.8, () => { G.pos = G.puzzleStart; G.lastMove = null; buildSprites(false); G.locked = false; if (G.tries >= 2) showHint(); });
    });
    return;
  }
  // real game
  G.hist.push(G.pos); G.pos = makeMove(G.pos, m); G.ply++; G.allPlies++; deselect(); G.lastMove = m; G.locked = true;
  if (G.mode !== 'two' && m.cap === 'q') G.capQ = true;
  animateMove(m, () => { G.locked = false; afterGameMove(m); });
}
function firstWhite() { for (let sq = 0; sq < 64; sq++) if (colorOf(G.pos.b[sq]) === 'w') return sq; return 0; }
function puzzleDone() { return G.stars.length === 0 && (G.kind === 'stars' || !G.pos.b.some((p) => colorOf(p) === 'b')); }
function puzzleSolved() {
  G.locked = true; deselect();
  const gem = G.kind === 'mate' ? G.tries === 0 : G.moves <= G.par;
  if (gem) G.gems[G.pi] = true;
  if (G.kind !== 'mate') banner(gem ? 'SUPER!' : 'GREAT!', gem ? '#ff3b30' : '#2f9a44');
  sfx.good(); confetti(70);
  say(gem ? 'Wow! The best way! You found a gem!' : 'You did it! Great job!');
  burst(W / 2, BY + SQ * 4, 40, ['#ffd23c', '#38d6ff', '#ff6f61', '#3ddc63', '#ffffff'], true);
  after(2.0, () => { const lv = LEVELS[G.li]; if (G.pi + 1 < lv.puzzles.length) loadPuzzle(G.pi + 1); else levelClear(); });
}
function afterGameMove(m) {
  const st = gameStatus(G.pos), mover = other(G.pos.turn);
  const capName = m.cap ? NAME[m.cap.toUpperCase()] : '';
  if (st === 'mate') {
    banner('CHECKMATE!'); sfx.check();
    if (G.mode === 'two') { G.locked = true; after(1.6, () => gameOverCard(mover === 'w' ? 'Sunny team wins!' : 'Purple team wins!', 'What a great game!')); }
    else if (mover === 'w') grumbleGivesUp('mate');
    else playerTrapped();
    return;
  }
  if (st === 'stalemate') {
    if (G.mode !== 'two' && mover === 'w') {
      G.locked = true; banner('UH-OH!', '#ff8a3d'); sfx.wrong();
      say('His king cannot move, but he is not in check. That is a tie! Try another move.');
      after(2.8, () => { G.pos = G.hist.pop(); G.ply--; G.lastMove = null; buildSprites(false); G.locked = false; });
      return;
    }
    G.locked = true; after(1.2, () => endTie()); return;
  }
  if (st === 'bare') { G.locked = true; after(1.2, () => endTie()); return; }
  if (st === 'check') { banner('CHECK!', '#ff8a3d'); sfx.check(); }
  if (G.mode === 'two') {
    say((G.pos.turn === 'w' ? 'Sunny' : 'Purple') + ' team, your turn!' + (st === 'check' ? ' Save your king!' : ''));
    G.cursor = kingSq(G.pos.b, G.pos.turn) >= 0 && st === 'check' ? kingSq(G.pos.b, G.pos.turn) : G.cursor;
    return;
  }
  if (G.pos.turn === 'b') {
    if (capName) grumble(['Hmph! My ' + capName + '!', 'Oh no, not my ' + capName + '!', 'Grr! Good one!'][G.ply % 3], 'surprised');
    else if (st === 'check') grumble('Eek! My king!', 'surprised');
    const lead = material(G.pos.b, 'w') - material(G.pos.b, 'b');
    if (lead >= 600) { grumbleGivesUp('giveup'); return; }
    if (G.allPlies >= 100) { grumbleGivesUp('sleepy'); return; }
    G.thinking = true;
    say(capName ? 'You got his ' + capName + '! Super!' : 'Good move! Now Grumble is thinking...');
    after(0.9, grumbleTurn);
  } else {
    G.thinking = false;
    if (st === 'check') say('Check! Your king is in danger. Move him or block!');
    else if (capName) say('Grumble took your ' + capName + '. Can you get one back?');
    else say('Your turn! Pick a piece.');
  }
}
function grumbleTurn() {
  if (G.screen !== 'play') return;
  const lead = material(G.pos.b, 'b') - material(G.pos.b, 'w');
  const noise = 170 + Math.max(0, lead) * 0.5;
  const m = bestMove(G.pos, 2, noise);
  if (!m) { G.thinking = false; return; }
  G.hist.push(G.pos); G.pos = makeMove(G.pos, m); G.ply++; G.allPlies++; G.lastMove = m;
  if (!m.cap) grumble(['Hmph.', 'Take that!', 'My turn!', 'Hmm...', 'Ha!'][Math.floor(Math.random() * 5)], 'grumpy');
  else grumble('Yoink! I got your ' + NAME[m.cap.toUpperCase()] + '!', 'grumpy');
  animateMove(m, () => { G.thinking = false; afterGameMove(m); });
}
function playerTrapped() {
  G.locked = true; sfx.oops();
  grumble('Ha! Got your king!', 'grumpy');
  say('Oops! Grumble trapped your king. Let’s go back a little and try again!');
  after(3, () => {
    const back = Math.min(4, G.hist.length);
    G.pos = G.hist[G.hist.length - back]; G.hist.length -= back; G.ply -= back;
    G.lastMove = null; buildSprites(false); G.locked = false; G.thinking = false; G.banner = null;
    say('Look out for Grumble’s tricks. Orange dots are not safe!');
  });
}
function grumbleGivesUp(how) {
  G.locked = true; G.thinking = false;
  const k = G.sprites.find((s) => s.t === 'K' && s.c === 'b' && !s.dying); if (k) k.tipping = true;
  grumble(how === 'mate' ? 'You trapped me! Good game. Friends?' : how === 'sleepy' ? 'Yaaawn... I am too sleepy. You win!' : 'I give up! You are too good! Friends?', how === 'sleepy' ? 'sleepy' : 'happy');
  if (how === 'giveup') banner('HE GIVES UP!', '#ff3b30');
  say('You beat King Grumble!');
  sfx.fanfare(); confetti(120);
  if (G.mode === 'level') G.gems = [true, G.capQ, how === 'mate'];
  after(2.6, () => { if (G.mode === 'level') levelClear(); else gameOverCard('You beat Grumble!', 'He wants to play again!'); });
}
function endTie() {
  grumble('A tie! Good game!', 'happy'); say('It is a tie! Good game!');
  sfx.good(); confetti(60);
  if (G.mode === 'level') { G.gems = [true, G.capQ, false]; after(1.6, levelClear); }
  else after(1.6, () => gameOverCard('A tie!', 'Good game, everyone!'));
}
function showHint() {
  if (G.screen !== 'play' || G.paused || G.busy || G.locked || G.thinking || !myTurn()) return;
  let m = null;
  if (isPuzzle()) { const sol = solvePuzzle(G.pos, G.stars, G.kind !== 'stars', G.kind === 'safe'); m = sol && sol[0]; }
  else if (G.kind === 'mate') { m = legalMoves(G.pos).find((mm) => gameStatus(makeMove(G.pos, mm)) === 'mate'); G.tries = Math.max(G.tries, 1); }
  else m = bestMove(G.pos, 2, 0);
  if (!m) return;
  sfx.hint();
  G.cursor = m.from; select(m.from, true);
  G.hintM = m; G.hintT = 0; G.idle = 0;
  say('Try this! Follow the green arrow, then press A.');
}

/* ---------- celebration & menus ---------- */
function levelClear() {
  const li = G.li, lv = LEVELS[li];
  if (G.mode === 'level') {
    const prev = SAVE.gems[li] || [false, false, false];
    SAVE.gems[li] = prev.map((v, k) => v || G.gems[k]);
    SAVE.unlocked = Math.max(SAVE.unlocked, Math.min(LEVELS.length, li + 2));
    if (li === LEVELS.length - 1) SAVE.won = true;
    saveGame();
  }
  sfx.fanfare(); confetti(160);
  const last = li === LEVELS.length - 1;
  $('clearImg').src = pieceImage(lv.icon[0], lv.icon[1], 150, lv.icon[1] === 'b' ? 'happy' : null);
  $('clearTitle').textContent = (last ? 'Hooray, ' : 'Super, ') + playerName() + '!';
  $('clearText').textContent = last ? 'You beat King Grumble! Now he is your friend.' : 'You finished ' + lv.name + '!';
  $('clearGems').innerHTML = G.gems.map((g) => '<span class="' + (g ? '' : 'off') + '">💎</span>').join('');
  $('btnNext').textContent = last ? 'Yay! ▶' : 'Next ▶';
  G.clearNext = last ? 'map' : 'next';
  $('btnClearMap').classList.toggle('hidden', last);
  showScreen('clear');
}
function gameOverCard(title, text) {
  sfx.fanfare(); confetti(140);
  $('clearImg').src = pieceImage('K', G.mode === 'two' && title.startsWith('Purple') ? 'b' : 'w', 150, 'happy');
  $('clearTitle').textContent = title; $('clearText').textContent = text; $('clearGems').innerHTML = '';
  $('btnNext').textContent = 'Play again ▶'; $('btnClearMap').classList.remove('hidden');
  G.clearNext = 'again';
  showScreen('clear');
}
const SCREENS = ['title', 'players', 'map', 'hint', 'pause', 'clear'];
let hintTimer = 0;
function showScreen(id) {
  SCREENS.forEach((s) => $(s).classList.toggle('hidden', s !== id));
  G.screen = id || 'play';
  G.paused = id === 'pause';
  $('playBtns').classList.toggle('hidden', !!id);
  if (id) setTimeout(focusDefault, 20);
  else if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
}
function focusDefault() {
  const id = G.screen; if (!SCREENS.includes(id)) return;
  let el = { title: $('btnPlay'), hint: $('btnGo'), pause: $('btnResume'), clear: $('btnNext') }[id];
  if (id === 'map') el = $('mapArea').querySelector('.node.next') || [...$('mapArea').querySelectorAll('.node:not(.locked)')].pop();
  if (id === 'players') el = $('plist').querySelector('.pcard.current') || $('plist').querySelector('.pcard');
  if (!el || el.offsetParent === null) el = focusables()[0];
  focusEl(el);
}
function focusEl(el) { document.querySelectorAll('.kf').forEach((x) => x.classList.remove('kf')); if (!el) return; el.focus({ preventScroll: true }); el.classList.add('kf'); }
document.addEventListener('focusin', (e) => { if (e.target && e.target.classList && !e.target.classList.contains('kf')) focusEl(e.target); });
function focusables() {
  const s = $(G.screen); if (!s) return [];
  return [...s.querySelectorAll('button, input')].filter((el) => !el.disabled && !el.classList.contains('del') && el.offsetParent !== null);
}
function navMove(dx, dy) {
  const list = focusables(); if (!list.length) return;
  const cur = document.activeElement;
  if (!list.includes(cur)) { focusDefault(); return; }
  if (cur.tagName === 'INPUT') return;
  const cr = cur.getBoundingClientRect(), cx = cr.left + cr.width / 2, cy = cr.top + cr.height / 2;
  let best = null, bd = 1e9;
  for (const el of list) {
    if (el === cur) continue;
    const r = el.getBoundingClientRect(), x = r.left + r.width / 2 - cx, y = r.top + r.height / 2 - cy;
    const along = dx ? x * dx : y * dy, across = dx ? Math.abs(y) : Math.abs(x);
    if (along <= 10) continue;
    if (dx && across > Math.max(r.height, cr.height) / 2) continue; // left/right stays on the same row
    const d = along + across * 2.5;
    if (d < bd) { bd = d; best = el; }
  }
  if (!best) { const i = list.indexOf(cur); best = list[(i + (dx > 0 || dy > 0 ? 1 : -1) + list.length) % list.length]; }
  focusEl(best); sfx.tick();
}
function showHintCard(title, text, icon) {
  $('hintTitle').textContent = title; $('hintText').textContent = text;
  $('hintImg').src = pieceImage(icon[0], icon[1], 140);
  showScreen('hint');
  clearTimeout(hintTimer); hintTimer = setTimeout(() => { if (G.screen === 'hint') goPlay(); }, 4000);
}
function goPlay() { clearTimeout(hintTimer); showScreen(null); sfx.click(); }
function goTitle() {
  $('whoName').textContent = playerName();
  if (G.screen === 'play' || G.screen === 'pause' || !G.pos) { setTheme(0); G.mode = 'menu'; G.kind = 'game'; resetTurnState(); G.pos = startPosition(); G.stars = []; buildSprites(true); }
  showScreen('title');
}
function goMap() {
  if (G.screen === 'pause' || G.screen === 'clear') { G.mode = 'menu'; resetTurnState(); }
  buildMap(); showScreen('map');
}
function buildMap() {
  $('mapPlayer').textContent = playerName(); $('mapGems').textContent = gemsTotal();
  const area = $('mapArea'); area.innerHTML = '';
  const pts = LEVELS.map((_, i) => (i < 5 ? [10 + i * 20, 24] : [90 - (i - 5) * 20, 72]));
  const svg = '<svg viewBox="0 0 100 100" preserveAspectRatio="none"><polyline points="' + pts.map((p) => p.join(',')).join(' ') +
    '" fill="none" stroke="#c99a2e" stroke-width="14" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"/><polyline points="' + pts.map((p) => p.join(',')).join(' ') +
    '" fill="none" stroke="#ffe98a" stroke-width="6" stroke-dasharray="2 14" stroke-linecap="round" vector-effect="non-scaling-stroke"/></svg>';
  area.insertAdjacentHTML('beforeend', svg);
  LEVELS.forEach((lv, i) => {
    const b = document.createElement('button'); b.className = 'node'; b.type = 'button';
    const unlocked = i < SAVE.unlocked, got = SAVE.gems[i] || [false, false, false];
    if (!unlocked) b.classList.add('locked');
    else if (i === SAVE.unlocked - 1 && !(i === LEVELS.length - 1 && SAVE.won)) b.classList.add('next');
    else b.classList.add('done');
    b.style.left = pts[i][0] + '%'; b.style.top = pts[i][1] + '%';
    b.innerHTML = '<img alt="" src="' + iconCache(lv.icon) + '"><span class="num">' + (unlocked ? i + 1 : '🔒') + '</span><span class="gems">' +
      got.map((g) => (g ? '💎' : '<span style="opacity:.3">💎</span>')).join('') + '</span><span class="lbl">' + lv.name + '</span>';
    b.addEventListener('click', () => {
      ensureAudio();
      if (!unlocked) { sfx.wrong(); b.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(-8px)' }, { transform: 'translateX(8px)' }, { transform: 'translateX(0)' }], 260); return; }
      sfx.click(); startLevel(i);
    });
    area.appendChild(b);
  });
}
const iconImgs = {};
function iconCache(icon) { const k = icon.join(''); return iconImgs[k] || (iconImgs[k] = pieceImage(icon[0], icon[1], 100)); }
function buildPlayers() {
  const list = $('plist'); list.innerHTML = '';
  Object.keys(DB.profiles).forEach((name) => {
    const pr = DB.profiles[name], wrap = document.createElement('div'); wrap.className = 'pwrap';
    const b = document.createElement('button'); b.type = 'button'; b.className = 'pcard' + (name === DB.current ? ' current' : '');
    b.innerHTML = name + '<small>Level ' + Math.min(pr.unlocked, LEVELS.length) + ' · 💎 ' + gemsTotal(pr) + '</small>';
    b.addEventListener('click', () => { sfx.click(); setProfile(name); goTitle(); });
    wrap.appendChild(b);
    if (Object.keys(DB.profiles).length > 1) {
      const d = document.createElement('button'); d.type = 'button'; d.className = 'del'; d.textContent = '✕'; d.tabIndex = -1;
      d.addEventListener('click', (e) => { e.stopPropagation(); if (confirm('Remove player ' + name + '?')) { deleteProfile(name); buildPlayers(); focusDefault(); } });
      wrap.appendChild(d);
    }
    list.appendChild(wrap);
  });
  $('newRow').classList.add('hidden'); $('btnNew').classList.remove('hidden');
}
function pauseGame() { if (G.screen !== 'play') return; sfx.click(); showScreen('pause'); }
function resumeGame() { if (G.screen !== 'pause') return; sfx.click(); showScreen(null); }

/* ---------- confetti on the overlay canvas ---------- */
const CONF = [];
function confetti(n) {
  const w = window.innerWidth;
  for (let i = 0; i < n; i++) {
    if (CONF.length > 300) CONF.shift();
    CONF.push({ x: Math.random() * w, y: -20 - Math.random() * 200, vx: (Math.random() - 0.5) * 160, vy: 80 + Math.random() * 200, r: Math.random() * TAU, vr: (Math.random() - 0.5) * 10,
      c: ['#ff4d4d', '#ffd23c', '#3ddc63', '#29a3ff', '#ff8ccf', '#a06ff4'][i % 6], s: 7 + Math.random() * 7, t: 0 });
  }
}
let fxDirty = false;
function drawConfetti(dt) {
  if (!CONF.length) { if (fxDirty) { fx.setTransform(1, 0, 0, 1, 0, 0); fx.clearRect(0, 0, fxc.width, fxc.height); fxDirty = false; } return; }
  fxDirty = true;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  fx.setTransform(1, 0, 0, 1, 0, 0); fx.clearRect(0, 0, fxc.width, fxc.height); fx.setTransform(dpr, 0, 0, dpr, 0, 0);
  for (let i = CONF.length - 1; i >= 0; i--) {
    const p = CONF[i]; p.t += dt; p.vy += 260 * dt; p.vx *= 0.99; p.x += p.vx * dt + Math.sin(p.t * 4 + i) * 0.8; p.y += p.vy * dt * 0.6; p.r += p.vr * dt;
    if (p.y > window.innerHeight + 30 || p.t > 6) { CONF.splice(i, 1); continue; }
    fx.save(); fx.translate(p.x, p.y); fx.rotate(p.r); fx.fillStyle = p.c; fx.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2); fx.restore();
  }
}

/* ---------- calm, static backdrop ---------- */
function drawBackground() {
  ctx.fillStyle = '#dce9f2';
  ctx.fillRect(0, 0, W, H);
}

/* ---------- drawing the play field ---------- */
function text(str, x, y, size, color, align, font) {
  ctx.font = size + 'px ' + (font || FONT); ctx.textAlign = align || 'center'; ctx.textBaseline = 'middle';
  ctx.lineWidth = Math.max(3, size / 6); ctx.strokeStyle = 'rgba(20,24,40,0.75)'; ctx.lineJoin = 'round'; ctx.strokeText(str, x, y);
  ctx.fillStyle = color; ctx.fillText(str, x, y);
}
function wrapLines(str, maxW, font) {
  ctx.font = font; const words = str.split(' '), lines = []; let line = '';
  for (const w of words) { const t = line ? line + ' ' + w : w; if (ctx.measureText(t).width > maxW && line) { lines.push(line); line = w; } else line = t; }
  if (line) lines.push(line); return lines;
}
function bubble(x, y, w, str, tailX, tailY, pop, color) {
  const font = '900 20px ' + BODY, lines = wrapLines(str, w - 28, font), h = lines.length * 25 + 24, s = 1 + pop * 0.08;
  ctx.save(); ctx.translate(x + w / 2, y + h / 2); ctx.scale(s, s); ctx.translate(-(x + w / 2), -(y + h / 2));
  ctx.fillStyle = 'rgba(20,24,40,0.2)'; rr(ctx, x + 2, y + 5, w, h, 18); ctx.fill();
  ctx.beginPath(); ctx.moveTo(tailX - 12, y + h - 2); ctx.lineTo(tailX, tailY); ctx.lineTo(tailX + 14, y + h - 2); ctx.closePath(); ctx.fillStyle = color || '#fff'; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = OL; ctx.stroke();
  rr(ctx, x, y, w, h, 18); ctx.fillStyle = color || '#fff'; ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(tailX - 10, y + h - 2); ctx.lineTo(tailX + 12, y + h - 2); ctx.lineWidth = 5; ctx.strokeStyle = color || '#fff'; ctx.stroke();
  ctx.font = font; ctx.fillStyle = '#1d2a4a'; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  lines.forEach((l, i) => ctx.fillText(l, x + 14, y + 13 + i * 25));
  ctx.restore();
  return h;
}
function panel(x, y, w, h) {
  ctx.fillStyle = 'rgba(20,24,40,0.22)'; rr(ctx, x + 3, y + 6, w, h, 20); ctx.fill();
  const gr = ctx.createLinearGradient(0, y, 0, y + h); gr.addColorStop(0, 'rgba(255,255,255,0.95)'); gr.addColorStop(1, 'rgba(225,240,255,0.95)');
  rr(ctx, x, y, w, h, 20); ctx.fillStyle = gr; ctx.fill(); ctx.lineWidth = 4; ctx.strokeStyle = '#ffd23c'; ctx.stroke();
  rr(ctx, x - 3, y - 3, w + 6, h + 6, 22); ctx.lineWidth = 2.5; ctx.strokeStyle = OL; ctx.stroke();
}
function drawArrow(x0, y0, x1, y1, color, a) {
  const ang = Math.atan2(y1 - y0, x1 - x0), len = Math.hypot(x1 - x0, y1 - y0) - 16;
  ctx.save(); ctx.globalAlpha = a; ctx.translate(x0, y0); ctx.rotate(ang);
  ctx.beginPath(); ctx.moveTo(0, -7); ctx.lineTo(len - 20, -7); ctx.lineTo(len - 20, -17); ctx.lineTo(len + 4, 0); ctx.lineTo(len - 20, 17); ctx.lineTo(len - 20, 7); ctx.lineTo(0, 7); ctx.closePath();
  ctx.fillStyle = color; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = OL; ctx.stroke();
  ctx.restore();
}
function drawField() {
  const t = G.t, b = G.pos.b;
  const bs = boardSprite();
  ctx.drawImage(bs, BX - PAD, BY - PAD, bs.width / RS, bs.height / RS);
  // last move and selection
  if (G.lastMove) for (const sq of [G.lastMove.from, G.lastMove.to]) { ctx.fillStyle = 'rgba(255,236,90,0.45)'; rr(ctx, BX + (sq & 7) * SQ + 3, BY + (sq >> 3) * SQ + 3, SQ - 6, SQ - 6, 7); ctx.fill(); }
  if (G.sel >= 0) { ctx.fillStyle = 'rgba(80,220,255,0.5)'; rr(ctx, BX + (G.sel & 7) * SQ + 3, BY + (G.sel >> 3) * SQ + 3, SQ - 6, SQ - 6, 7); ctx.fill(); }
  if (G.kind === 'game' || G.kind === 'mate') {
    for (const c of ['w', 'b']) if (inCheck(G.pos, c)) {
      const k = kingSq(b, c); ctx.globalAlpha = 0.7;
      ctx.fillStyle = '#ff4d4d'; rr(ctx, BX + (k & 7) * SQ + 3, BY + (k >> 3) * SQ + 3, SQ - 6, SQ - 6, 9); ctx.fill(); ctx.globalAlpha = 1;
    }
  }
  // stars
  const ss = starSprite(), sw = ss.width / RS;
  for (const sq of G.stars) {
    let dy = 0;
    if (G.starDrop != null) { const k = clamp((G.starDrop - 0) / 0.5, 0, 1); if (G.starDrop < 0) continue; dy = -(1 - bounceOut(k)) * 300; }
    ctx.save(); ctx.translate(sqX(sq), sqY(sq) + dy);
    ctx.drawImage(ss, -sw / 2, -sw / 2, sw, sw); ctx.restore();
  }
  // target markers
  for (const m of G.targets) {
    const x = sqX(m.to), y = sqY(m.to), pul = 1, col = m.danger ? '#ff8a3d' : '#3ddc63';
    if (G.stars.includes(m.to)) { ctx.beginPath(); ctx.arc(x, y, SQ * 0.45 * pul, 0, TAU); ctx.lineWidth = 5; ctx.strokeStyle = col; ctx.stroke(); continue; }
    if (m.cap) { ctx.beginPath(); ctx.arc(x, y, SQ * 0.44, 0, TAU); ctx.lineWidth = 6; ctx.strokeStyle = m.danger ? '#ff8a3d' : '#ff4d6d'; ctx.stroke(); }
    else {
      ctx.beginPath(); ctx.arc(x, y, 10 * pul, 0, TAU); ctx.fillStyle = col; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = '#fff'; ctx.stroke();
      if (m.danger) { ctx.fillStyle = '#fff'; ctx.font = '15px ' + FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('!', x, y + 1); }
    }
  }
  // pieces, back rows first
  const list = G.sprites.slice().sort((a, b2) => a.y - b2.y);
  for (const s of list) {
    let x = s.x, y = s.y, lift = 0, sx = 1, alpha = 1, rot = 0;
    if (s.drop != null) { if (s.drop < 0) continue; y -= (1 - bounceOut(clamp(s.drop / 0.5, 0, 1))) * 320; }
    if (s.mv) { lift = Math.sin(Math.PI * s.mv.t) * s.mv.arc; }
    if (s.dying) { const d = s.dying; x += d.vx * d.t; y += d.vy * d.t + 600 * d.t * d.t; rot = d.t * 8 * Math.sign(d.vx); alpha = clamp(1 - d.t / 0.8, 0, 1); }
    if (s.shake > 0) x += Math.sin(s.shake * 70) * 5;
    if (s.sq === G.sel && !s.mv) lift = 7;
    if (s.pop > 0) sx = 1 + s.pop * 0.12;
    if (s.tipping) rot = -Math.min(1, s.tipT || 0) * 1.35;
    if (s.t === '#') { const bk = blockSprite(); ctx.drawImage(bk, x - SQ / 2, y - SQ / 2, SQ, SQ); continue; }
    // shadow
    if (!s.dying) { ctx.fillStyle = 'rgba(20,24,40,' + (0.18 - lift * 0.005) + ')'; ctx.beginPath(); ctx.ellipse(x, y + SQ * 0.5 - 7, 17 - lift * 0.3, 4.5, 0, 0, TAU); ctx.fill(); }
    drawPiece(s.t, s.c, x, y, { lift, sx, rot, alpha, mood: s.tipping ? 'happy' : null });
  }
  // cursor
  const cx = BX + (G.cursor & 7) * SQ, cy = BY + (G.cursor >> 3) * SQ, cp = 1;
  ctx.save(); ctx.translate(cx + SQ / 2, cy + SQ / 2); ctx.scale(cp, cp);
  rr(ctx, -SQ / 2 - 1, -SQ / 2 - 1, SQ + 2, SQ + 2, 10); ctx.lineWidth = 11; ctx.strokeStyle = 'rgba(20,24,40,0.6)'; ctx.stroke();
  ctx.lineWidth = 6; ctx.strokeStyle = (G.thinking || !myTurn()) ? '#c9b8ff' : '#ffe14d'; ctx.stroke();
  ctx.restore();
  // name tag for the piece under the cursor
  const under = spriteAt(G.cursor);
  if (under && under.t !== '#' && !under.mv) {
    const label = NAME[under.t].toUpperCase(); ctx.font = '17px ' + FONT;
    const lw = ctx.measureText(label).width + 20, ly = (G.cursor >> 3) === 7 ? cy - 14 : cy + SQ + 14, lx = clamp(cx + SQ / 2, BX + lw / 2 - 10, BX + SQ * 8 - lw / 2 + 10);
    rr(ctx, lx - lw / 2, ly - 12, lw, 24, 12); ctx.fillStyle = under.c === 'w' ? '#fff3b0' : '#e6d2ff'; ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = OL; ctx.stroke();
    ctx.fillStyle = under.c === 'w' ? '#7a4a00' : '#4a2a90'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(label, lx, ly + 1);
  }
  // hint arrow
  if (G.hintM) drawArrow(sqX(G.hintM.from), sqY(G.hintM.from), sqX(G.hintM.to), sqY(G.hintM.to), '#3ddc63', 0.9);
  if (G.bump && G.bump.from != null) drawArrow(sqX(G.bump.from), sqY(G.bump.from), sqX(G.bump.to), sqY(G.bump.to), '#ff5a4d', 0.9);
  // particles
  for (const p of G.parts) {
    const a = clamp(1 - p.t / p.life, 0, 1); ctx.globalAlpha = a; ctx.fillStyle = p.c;
    if (p.star) { ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.t * 6); ctx.beginPath(); for (let i = 0; i < 10; i++) { const an = i * Math.PI / 5, r = i % 2 ? p.s * 0.5 : p.s * 1.4; ctx.lineTo(Math.cos(an) * r, Math.sin(an) * r); } ctx.closePath(); ctx.fill(); ctx.restore(); }
    else { ctx.beginPath(); ctx.arc(p.x, p.y, p.s, 0, TAU); ctx.fill(); }
  }
  ctx.globalAlpha = 1;
  for (const f of G.texts) { const k = f.t / f.life; ctx.globalAlpha = clamp(1.6 - k * 1.6, 0, 1); text(f.text, f.x, f.y - k * 40, f.size * (1 + Math.max(0, 0.3 - f.t) ), f.color); }
  ctx.globalAlpha = 1;
}
function drawHud() {
  const lv = LEVELS[G.li];
  const title = G.mode === 'level' ? (G.li + 1) + '. ' + lv.name : G.mode === 'two' ? '2 Players' : 'Play Grumble';
  const w = 470, x = W / 2 - w / 2, y = 12, h = 52;
  ctx.fillStyle = 'rgba(20,24,40,0.25)'; rr(ctx, x + 2, y + 5, w, h, 26); ctx.fill();
  const gr = ctx.createLinearGradient(0, y, 0, y + h); gr.addColorStop(0, '#fff09a'); gr.addColorStop(0.5, '#ffd23c'); gr.addColorStop(1, '#e8a512');
  rr(ctx, x, y, w, h, 26); ctx.fillStyle = gr; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = OL; ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.35)'; rr(ctx, x + 18, y + 5, w - 36, 8, 4); ctx.fill();
  text(title, x + 26, y + h / 2 + 2, 27, '#fff', 'left');
  if (G.mode === 'level' && lv.puzzles) {
    for (let i = 0; i < 3; i++) {
      const px = x + w - 112 + i * 34, py = y + h / 2, done = i < G.pi || (i === G.pi && G.locked && puzzleDoneVisual());
      ctx.beginPath(); ctx.arc(px, py, 12, 0, TAU);
      ctx.fillStyle = done ? '#3ddc63' : i === G.pi ? '#fff' : 'rgba(255,255,255,0.45)'; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = OL; ctx.stroke();
      if (G.gems[i]) drawGem(px, py, 8, true);
    }
  } else if (G.mode === 'level') for (let i = 0; i < 3; i++) drawGem(x + w - 100 + i * 30, y + h / 2, 11, G.gems[i]);
}
function puzzleDoneVisual() { return G.kind === 'mate' ? G.pos && gameStatus(G.pos) === 'mate' : puzzleDone(); }
function drawSide() {
  // left: Professor Hoot the owl
  const owlY = 470;
  if (G.owl) { const lines = wrapLines(G.owl, 222 - 28, '900 20px ' + BODY).length, bh = lines * 25 + 24; bubble(14, Math.max(84, 372 - bh), 222, G.owl, 128, 398, G.owlPop); }
  const os = owlSprite(false);
  ctx.drawImage(os, 130 - 60, owlY - 78, 120, 150);
  // right
  const x = 762, w = 222;
  if (G.kind === 'game') {
    if (G.mode === 'two') {
      panel(x, 120, w, 250);
      text('Whose turn?', x + w / 2, 150, 26, '#ffd23c');
      drawPiece('K', G.pos.turn, x + w / 2, 230, { scale: 2.1, lift: 0 });
      text(G.pos.turn === 'w' ? 'Sunny team' : 'Purple team', x + w / 2, 325, 28, G.pos.turn === 'w' ? '#ffd23c' : '#c9a8ff');
      return;
    }
    // King Grumble
    const gy = 300;
    ctx.fillStyle = 'rgba(20,24,40,0.25)'; ctx.beginPath(); ctx.ellipse(x + w / 2, gy + 42, 46, 10, 0, 0, TAU); ctx.fill();
    drawPiece('K', 'b', x + w / 2, gy + 20, { scale: 2.6, mood: G.grumMood });
    if (G.grumSay) bubble(x + 6, 96, w - 12, G.grumSay, x + w / 2, 196, G.grumPop, '#f3ebff');
    const ty = 385, turnTxt = G.thinking ? 'Grumble is thinking…' : (G.locked ? '' : 'Your turn!');
    if (turnTxt) {
      rr(ctx, x + 10, ty, w - 20, 44, 22); ctx.fillStyle = G.thinking ? '#a06ff4' : '#3ddc63'; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = OL; ctx.stroke();
      text(turnTxt, x + w / 2, ty + 23, G.thinking ? 20 : 26, '#fff');
    }
    // pieces the player has won
    const start = { p: 8, n: 2, b: 2, r: 2, q: 1 }, got = [];
    for (const k in start) { const have = G.pos.b.filter((p) => p === k).length; for (let i = have; i < start[k]; i++) got.push(k.toUpperCase()); }
    if (got.length) {
      text('You got:', x + 14, 452, 20, '#fff', 'left');
      got.forEach((t, i) => drawPiece(t, 'b', x + 24 + (i % 8) * 25, 470 + Math.floor(i / 8) * 34, { scale: 0.58 }));
    }
    return;
  }
  if (G.kind === 'mate') {
    panel(x, 120, w, 230);
    text('Trap the king!', x + w / 2, 150, 26, '#ffd23c');
    drawPiece('K', 'b', x + w / 2, 230, { scale: 1.9, mood: puzzleDoneVisual() ? 'surprised' : 'grumpy' });
    text('One move!', x + w / 2, 320, 24, '#fff');
    return;
  }
  panel(x, 120, w, 270);
  const targets = G.kind === 'stars' ? G.starsStart.length : null;
  text(G.kind === 'stars' ? 'Get the stars!' : 'Gobble them!', x + w / 2, 150, 26, '#ffd23c');
  const icons = [];
  if (G.kind === 'stars') { for (let i = 0; i < targets; i++) icons.push({ star: true, on: i < G.stars.length }); }
  else {
    const left = []; for (let sq = 0; sq < 64; sq++) if (colorOf(G.pos.b[sq]) === 'b') left.push(G.pos.b[sq].toUpperCase());
    const startB = G.puzzleStart.b.filter((p) => colorOf(p) === 'b').map((p) => p.toUpperCase());
    startB.forEach((t, i) => icons.push({ t, on: i < left.length }));
  }
  const ss = starSprite();
  icons.forEach((ic, i) => {
    const ix = x + 40 + (i % 4) * 47, iy = 205 + Math.floor(i / 4) * 54;
    if (ic.star) { ctx.globalAlpha = ic.on ? 1 : 0.25; ctx.drawImage(ss, ix - 20, iy - 20, 40, 40); ctx.globalAlpha = 1; }
    else drawPiece(ic.t, 'b', ix, iy - 12, { scale: 0.9, alpha: ic.on ? 1 : 0.25 });
    if (!ic.on) text('✓', ix, iy, 28, '#3ddc63');
  });
  text('Moves: ' + G.moves, x + w / 2, 312, 28, '#fff');
  drawGem(x + 40, 356, 11, G.moves <= G.par);
  ctx.font = '900 17px ' + BODY; ctx.fillStyle = '#24334d'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.fillText('in ' + G.par + (G.par === 1 ? ' move' : ' moves'), x + 58, 357);
}
function drawBanner() {
  const bn = G.banner; if (!bn) return;
  const k = bn.t, s = k < 0.25 ? easeOut(k / 0.25) * 1.15 : 1 + Math.sin(k * 6) * 0.03, a = clamp((1.8 - k) / 0.3, 0, 1);
  ctx.save(); ctx.globalAlpha = a; ctx.translate(W / 2, BY + SQ * 4); ctx.scale(s, s); ctx.rotate(-0.04);
  text(bn.text, 0, 0, 64, '#ffe14d'); ctx.lineWidth = 3; ctx.restore();
}
function render() {
  ctx.setTransform(RS, 0, 0, RS, 0, 0);
  drawBackground();
  if (!G.pos) return;
  ctx.save();
  if (G.shake > 0.2) ctx.translate((Math.random() - 0.5) * G.shake, (Math.random() - 0.5) * G.shake);
  drawField();
  ctx.restore();
  if (G.screen !== 'title' && G.screen !== 'players' && G.screen !== 'map' && G.mode !== 'menu') { drawSide(); drawHud(); }
  drawBanner();
}

/* ---------- update ---------- */
function update(dt) {
  G.t += dt;
  if (G.paused) return;
  const sp = dt * G.speed;
  for (let i = 0; i < G.timers.length; i++) { const tm = G.timers[i]; tm.t -= dt; if (tm.t <= 0) { G.timers.splice(i--, 1); tm.fn(); } }
  let dropped = false;
  for (const s of G.sprites) {
    if (s.drop != null) { const was = s.drop; s.drop += sp; if (was < 0 && s.drop >= 0.3 && !dropped) { /* landing tick */ } if (s.drop >= 0.5) { s.drop = null; if (!dropped) { sfx.drop(); dropped = true; } } }
    if (s.mv) {
      const m = s.mv; m.t += sp / m.dur;
      if (m.t >= 1) { s.x = m.x1; s.y = m.y1; s.mv = null; m.cb && m.cb(); }
      else { const e = easeInOut(m.t); s.x = lerp(m.x0, m.x1, e); s.y = lerp(m.y0, m.y1, e); }
    }
    if (s.dying) s.dying.t += sp;
    if (s.shake > 0) s.shake -= dt;
    if (s.pop > 0) s.pop = Math.max(0, s.pop - dt * 5);
    if (s.tipping) s.tipT = (s.tipT || 0) + dt * 1.5;
  }
  G.sprites = G.sprites.filter((s) => !(s.dying && s.dying.t > 0.8));
  if (G.starDrop != null) { G.starDrop += sp; if (G.starDrop > 0.6) G.starDrop = null; }
  for (const p of G.parts) { p.t += dt; p.vy += 520 * dt; p.x += p.vx * dt; p.y += p.vy * dt; }
  G.parts = G.parts.filter((p) => p.t < p.life);
  for (const f of G.texts) f.t += dt;
  G.texts = G.texts.filter((f) => f.t < f.life);
  if (G.banner) { G.banner.t += dt; if (G.banner.t > 1.8) G.banner = null; }
  G.shake = Math.max(0, G.shake - dt * 30);
  G.curPulse = Math.max(0, G.curPulse - dt * 6);
  G.owlPop = Math.max(0, G.owlPop - dt * 4); G.grumPop = Math.max(0, G.grumPop - dt * 4);
  if (G.screen === 'play' && canAct()) {
    G.idle += dt;
    if (G.idle > 25 && !G.hintM) { G.idle = -1000; say('Need help? Press X for a hint!'); }
  }
}

/* ---------- input: keyboard, controller, mouse/touch ---------- */
function pressA() {
  ensureAudio();
  if (G.screen === 'play') { activate(); return; }
  const el = document.activeElement;
  if (el && el.tagName === 'BUTTON' && el.offsetParent !== null && $(G.screen).contains(el)) { el.click(); return; }
  if (el && el.tagName === 'INPUT') { submitNewPlayer(); return; }
  focusDefault();
}
function pressB() {
  ensureAudio();
  if(FAMILY && G.screen==='play' && !myTurn()){pauseGame();return;}
  switch (G.screen) {
    case 'play': if (G.sel >= 0 && !G.autoSel && !G.busy) { deselect(); G.hintM = null; sfx.tick(); } else pauseGame(); break;
    case 'pause': resumeGame(); break;
    case 'players': case 'map': sfx.click(); goTitle(); break;
    default: break;
  }
}
function pressStart() {
  ensureAudio();
  if (G.screen === 'play') pauseGame();
  else if (G.screen === 'pause') resumeGame();
  else if (G.screen === 'hint') goPlay();
  else if (G.screen === 'title') pressA();
}
function pressX() { ensureAudio(); if (G.screen === 'play') showHint(); }
function dirInput(dx, dy) { if (G.screen === 'play') moveCursor(dx, dy); else navMove(dx, dy); }
window.addEventListener('keydown', (e) => {
  const tgt = e.target;
  if (tgt && tgt.tagName === 'INPUT') {
    if (e.code === 'Enter' || e.code === 'NumpadEnter') { e.preventDefault(); submitNewPlayer(); return; }
    if (e.code === 'Escape') { e.preventDefault(); tgt.blur(); $('newRow').classList.add('hidden'); $('btnNew').classList.remove('hidden'); focusDefault(); }
    return;
  }
  switch (e.code) {
    case 'ArrowLeft': case 'KeyA': dirInput(-1, 0); break;
    case 'ArrowRight': case 'KeyD': dirInput(1, 0); break;
    case 'ArrowUp': case 'KeyW': dirInput(0, -1); break;
    case 'ArrowDown': case 'KeyS': dirInput(0, 1); break;
    case 'Space': case 'Enter': case 'NumpadEnter': if (!e.repeat) pressA(); break;
    case 'Escape': case 'Backspace': pressB(); break;
    case 'KeyP': pressStart(); break;
    case 'KeyX': case 'KeyH': case 'ShiftLeft': case 'ShiftRight': pressX(); break;
    case 'Tab': navMove(e.shiftKey ? -1 : 1, 0); break;
    default: return;
  }
  e.preventDefault();
});
function pollPads() {
  if(FAMILY && (FAMILY.role==='guest'||!FAMILY.ready))return;
  for (const p of GamepadStd.read('game')) {
    if (p.any) ensureAudio();
    const nav = GamepadStd.navRepeat(p, 'game');
    if (nav.left) dirInput(-1, 0); if (nav.right) dirInput(1, 0); if (nav.up) dirInput(0, -1); if (nav.down) dirInput(0, 1);
    if (p.just.A) pressA();
    if (p.just.B) pressB();
    if (p.just.start) pressStart();
    if (p.just.X || p.just.Y) pressX();
  }
}
cv.addEventListener('pointerdown', (e) => {
  ensureAudio();
  if (G.screen !== 'play' || (FAMILY && !myTurn())) return;
  const r = cv.getBoundingClientRect(), bw = 6;
  const x = (e.clientX - r.left - bw) / (r.width - bw * 2) * W, y = (e.clientY - r.top - bw) / (r.height - bw * 2) * H;
  const f = Math.floor((x - BX) / SQ), rw = Math.floor((y - BY) / SQ);
  if (f < 0 || f > 7 || rw < 0 || rw > 7) return;
  G.cursor = rw * 8 + f; activate();
});
$('btnPlay').addEventListener('click', () => { ensureAudio(); sfx.click(); goMap(); });
$('btnHome').addEventListener('click', () => { ensureAudio(); sfx.click(); goTitle(); });
$('btnWho').addEventListener('click', () => { sfx.click(); ArcadeProfile.switchPlayer(); });
$('btnNew').addEventListener('click', () => { sfx.click(); $('newRow').classList.remove('hidden'); $('btnNew').classList.add('hidden'); $('newName').value = ''; $('newName').focus(); });
function submitNewPlayer() { const n = addProfile($('newName').value); if (n) { sfx.good(); goTitle(); } }
$('newRow').addEventListener('submit', (e) => { e.preventDefault(); submitNewPlayer(); });
$('btnFree').addEventListener('click', () => { ensureAudio(); sfx.click(); startFree('free'); });
$('btnTwo').addEventListener('click', () => { ensureAudio(); sfx.click(); startFree('two'); });
$('btnGo').addEventListener('click', goPlay);
$('btnResume').addEventListener('click', resumeGame);
$('btnRestart').addEventListener('click', () => { sfx.click(); showScreen(null); restartCurrent(); });
$('btnMap').addEventListener('click', () => { sfx.click(); goTitle(); });
$('btnMusic').addEventListener('click', () => { ensureAudio(); setMusic(!AU.musicOn); sfx.click(); });
$('btnPlayers').addEventListener('click', () => { sfx.click(); G.mode = 'menu'; resetTurnState(); ArcadeProfile.switchPlayer(); });
$('btnNext').addEventListener('click', () => {
  sfx.click();
  if (G.clearNext === 'next') startLevel(Math.min(LEVELS.length - 1, G.li + 1));
  else if (G.clearNext === 'again') startFree(G.mode);
  else goMap();
});
$('btnClearMap').addEventListener('click', () => { sfx.click(); goTitle(); });
$('btnHint').addEventListener('click', () => { ensureAudio(); showHint(); });
$('btnPause').addEventListener('click', () => { ensureAudio(); pauseGame(); });
document.addEventListener('visibilitychange', () => { if (document.hidden && G.screen === 'play') pauseGame(); });

/* ---------- resize & main loop ---------- */
function resize() {
  const r = cv.getBoundingClientRect(), dpr = Math.min(2, window.devicePixelRatio || 1);
  const ns = clamp((r.width - 12) * dpr / W, 1, 2);
  if (Math.abs(ns - RS) > 0.01 || cv.width !== Math.round(W * ns)) { RS = ns; cv.width = Math.round(W * RS); cv.height = Math.round(H * RS); cache.clear(); }
  fxc.width = Math.round(window.innerWidth * dpr); fxc.height = Math.round(window.innerHeight * dpr); fxDirty = true;
}
window.addEventListener('resize', resize);
let last = performance.now(), acc = 0, perfLog = 0;
const STEP = 1 / 120;
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  pollPads();
  acc += dt; let n = 0;
  while (acc >= STEP && n < 8) { if(!FAMILY || (FAMILY.role==='host'&&FAMILY.ready)) update(STEP); acc -= STEP; n++; }
  if (n >= 8) acc = 0;
  const t0 = performance.now();
  render();
  drawConfetti(dt);
  musicTick();
  if (window.CQ_PERF) { perfLog += dt; if (perfLog > 2) { perfLog = 0; console.log('render ms', (performance.now() - t0).toFixed(2)); } }
}
validateLevels();
$('heroL').src = pieceImage('N', 'w', 120); $('heroM').src = pieceImage('K', 'w', 170); $('heroR').src = pieceImage('K', 'b', 120);
resize();
setMusic(AU.musicOn);
goTitle();
requestAnimationFrame(frame);
// debug hooks for the test harness
window.CQ = { G, LEVELS, startLevel, startFree, loadPuzzle, solvePuzzle, legalMoves, makeMove, gameStatus, bestMove, posFromRows, showHint, goMap, goTitle, SAVE: () => SAVE, DB: () => DB };


if(FAMILY) {
  const familySounds=[];
  if(FAMILY.role==='host')for(const name of Object.keys(sfx)){const original=sfx[name];if(typeof original==='function')sfx[name]=(...args)=>{if(familySounds.length<16)familySounds.push(name);return original(...args);};}
  for(const id of ['btnMap','btnPlayers','btnClearMap'])$(id).style.display='none';
  const fields=['screen','paused','theme','t','mode','li','pi','kind','pos','stars','sprites','cursor','sel','targets','autoSel','moves','par','tries','gems','hintM','hintT','busy','locked','thinking','parts','texts','banner','shake','owl','owlPop','grumSay','grumMood','grumPop','ply','lastMove','curPulse','clearNext'];
  const textIds=['hintTitle','hintText','clearTitle','clearText','btnNext'];
  FAMILY.register({
    start(){startFree('two');clearTimeout(hintTimer);},
    connection(){}, unlock:ensureAudio, input(){},
    action(a){
      familyRemoteAction=true;
      try {
        if(a==='pause')pauseGame();
        else if(a==='A')pressA();else if(a==='B')pressB();else if(a==='start')pressStart();else if(a==='X')pressX();
        else if(a==='left')dirInput(-1,0);else if(a==='right')dirInput(1,0);else if(a==='up')dirInput(0,-1);else if(a==='down')dirInput(0,1);
      } finally {familyRemoteAction=false;}
    },
    snapshot(){const state={};for(const k of fields)state[k]=G[k];const texts={};for(const id of textIds)if($(id))texts[id]=$(id).textContent;return {state,sounds:familySounds.splice(0),texts,focus:document.activeElement?.id};},
    apply(v){
      if(!v?.state)return;
      for(const sound of v.sounds||[])if(Object.hasOwn(sfx,sound)&&typeof sfx[sound]==='function')sfx[sound]();
      const screen=G.screen;
      if(G.theme!==v.state.theme)setTheme(v.state.theme);
      for(const k of fields)if(k in v.state)G[k]=v.state[k];
      if(screen!==G.screen){showScreen(G.screen==='play'?null:G.screen);if(G.screen==='clear'){confetti(140);$('clearImg').src=pieceImage('K',v.texts?.clearTitle?.startsWith('Purple')?'b':'w',150,'happy');}}
      for(const [id,text] of Object.entries(v.texts||{}))if(textIds.includes(id)&&$(id))$(id).textContent=text;
      if(v.focus && $(v.focus) && document.activeElement?.id!==v.focus)$(v.focus).focus();
    }
  });
}
