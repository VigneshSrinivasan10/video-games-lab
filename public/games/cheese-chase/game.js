/* ---------- gamepad-std.js (pasted verbatim, AGENTS.md §9) ---------- */

(() => {
'use strict';

// Family rooms: only the host simulates; the guest receives the shared world.
const FAMILY = window.parent !== window && new URLSearchParams(location.search).has('family') ? window.parent.FamilyRoom : null;
const familyActions = new Set();
let familyAccumulator = 0, familyTargets = [];
function familyRemote() { return FAMILY && FAMILY.remoteFresh ? FAMILY.remote : {}; }
function familyConnection(ready) {
  for (const key in keys) keys[key] = false;
  pressed.clear(); familyActions.clear(); familyAccumulator = 0;
  if (!ready) FAMILY.remote = {};
}
function familyAction(action) {
  if (action === 'pause') { if (S.mode === 'playing') S.mode = 'paused'; return; }
  if (FAMILY.ready && ['A','B','start','X','left','right','up','down'].includes(action)) familyActions.add(action);
}
function familyTick(dt) {
  if (!FAMILY) { update(dt, readInputs()); return; }
  if (FAMILY.role === 'guest') {
    const f = 1 - Math.exp(-24 * dt);
    for (const [actor, x, y] of familyTargets) { actor.x += (x - actor.x) * f; if (y != null) actor.y += (y - actor.y) * f; }
    return;
  }
  if (!FAMILY.ready) return;
  familyAccumulator = Math.min(familyAccumulator + dt, 0.05);
  let n = 0;
  while (familyAccumulator >= 1 / 120 && n++ < 6) {
    update(1 / 120, readInputs());
    familyAccumulator -= 1 / 120;
  }
  if (S.parts.length > 300) S.parts.splice(0, S.parts.length - 300);
}
function familyBlend(previous, actors, maxDistance) {
  familyTargets = [];
  actors.forEach((actor, i) => {
    const old = previous[i]; if (!actor || !old) return;
    if (Math.hypot(actor.x-old.x, (actor.y||0)-(old.y||0)) > maxDistance) return;
    familyTargets.push([actor, actor.x, actor.y]); actor.x = old.x; if (actor.y != null) actor.y = old.y;
  });
}

const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d');
const VW = 1280, VH = 720, HUD_H = 64, TAU = Math.PI * 2;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rand = (a, b) => a + Math.random() * (b - a);
const ri = n => Math.floor(Math.random() * n);
const pick = arr => arr[ri(arr.length)];
const easeOutBack = t => { const c = 1.70158; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };
const DIRS = [[1, 0], [0, 1], [-1, 0], [0, -1]];
const TURN_TOL = 0.42;
const FONT = '"Fredoka","Nunito","Segoe UI",system-ui,sans-serif';

// ---------- levels ----------
// # wall  . cheese  G golden cheese  (space) empty floor  1/2 mouse starts  E mouse hole
// C patrol cat  H chaser cat  B boss cat  K key  D locked gate  M milk  ~ honey  = tunnel (edge)
const CAT_INFO = {
  C: { name: 'Tabby', blurb: 'walks and walks' },
  H: { name: 'Ginger', blurb: 'chases, then naps' },
  B: { name: 'Duke', blurb: 'fast castle cat' },
};
const LEVELS = [
  { name: 'The Pantry',
    news: 'Eat every cheese to open the mouse hole, then run inside.',
    tip: 'Two mice share the cheese. Split up and it goes twice as fast!',
    pal: { bg: '#3C2A1C', floorA: '#F8E8CB', floorB: '#F2DDB9', wall: '#D4A368', wallDark: '#A87845', wallLight: '#EAC58F', hud: '#5B3B1E' },
    cat: 0, chaser: 0, boss: 0, chaseOn: 5, chaseOff: 4, smart: 0.6, dark: false,
    map: [
      '###############',
      '#1....#.......#',
      '#.###.#.#####.#',
      '#.#.....#...#.#',
      '#.#.###.#.#.#.#',
      '#...#.....#...#',
      '#.###.###.###.#',
      '#2...........E#',
      '###############',
    ] },
  { name: 'Kitchen Floor',
    news: 'Tabby the cat is on patrol. If she bumps you, you go back to the start.',
    tip: 'Tabby walks straight until she hits a wall. Wait for her to pass.',
    pal: { bg: '#1F3A4A', floorA: '#EDF3F5', floorB: '#DCE7EC', wall: '#5F93A8', wallDark: '#3E6C7F', wallLight: '#8FBCCB', hud: '#24485A' },
    cat: 1.7, chaser: 0, boss: 0, chaseOn: 5, chaseOff: 4, smart: 0.6, dark: false,
    map: [
      '###################',
      '#1.......#.......2#',
      '#.###.#.###.#.###.#',
      '#.#...#.....#...#.#',
      '#.#.#######.###.#.#',
      '#...#...C.......#.#',
      '#.#.#.#####.###.#.#',
      '#.#...#.....#...#.#',
      '#.###.#.###.#.###.#',
      '#........E........#',
      '###################',
    ] },
  { name: 'The Cellar',
    news: 'The mouse hole is behind a locked gate. Find the golden key!',
    tip: 'Two cats now. Listen for the meow when they wake up.',
    pal: { bg: '#2A2622', floorA: '#B8AE9F', floorB: '#ABA193', wall: '#7D6A5A', wallDark: '#54453A', wallLight: '#9C8775', hud: '#3A302A' },
    cat: 1.9, chaser: 0, boss: 0, chaseOn: 5, chaseOff: 4, smart: 0.6, dark: false,
    map: [
      '###################',
      '#1.....#.K.#.....2#',
      '#.###.##.#.##.###.#',
      '#.#......C......#.#',
      '#.#.###.###.###.#.#',
      '#...#.........#...#',
      '#.#.#.###.###.#.#.#',
      '#.#...#..C..#...#.#',
      '#.##.##.###.##.##.#',
      '#....#...D...#....#',
      '#....#..#E#..#....#',
      '###################',
    ] },
  { name: 'Dining Room',
    news: 'Ginger chases you! Drink milk and she gets scared. Then bonk her!',
    tip: 'Ginger gets tired after a while and wanders off. That is your moment.',
    pal: { bg: '#3A1A1E', floorA: '#DDB58E', floorB: '#D2A980', wall: '#A33F45', wallDark: '#6E262B', wallLight: '#C9636A', hud: '#4E1F24' },
    cat: 0, chaser: 2.0, boss: 0, chaseOn: 5, chaseOff: 4, smart: 0.65, dark: false,
    map: [
      '#####################',
      '#1.......#.#.......2#',
      '#.###.##.#.#.##.###.#',
      '#.#M#.#.......#.#M#.#',
      '#.#.#.#.#####.#.#.#.#',
      '#.......# H #.......#',
      '#.###.#.##.##.#.###.#',
      '#.#...#.......#...#.#',
      '#.#.#.###.#.###.#.#.#',
      '#.........E.........#',
      '#####################',
    ] },
  { name: 'The Garden',
    news: 'Hedge tunnels on the left and right lead through to the other side.',
    tip: 'Dash into a tunnel to escape a cat. Cats can follow, but slowly.',
    pal: { bg: '#1F3A22', floorA: '#A6D37F', floorB: '#99C972', wall: '#4E8A3B', wallDark: '#2F5E24', wallLight: '#75AD5E', hud: '#2A4D22' },
    cat: 2.1, chaser: 2.2, boss: 0, chaseOn: 6, chaseOff: 4, smart: 0.7, dark: false,
    map: [
      '#######################',
      '#1.........#.........2#',
      '#.####.###.#.###.####.#',
      '#.#M.#.#.......#.#.M#.#',
      '#.#..#.#.#####.#.#..#.#',
      '#......#C......#......#',
      '=.####.#.## ##.#.####.=',
      '#......#.# H #.#......#',
      '#.####.#.#####.#.####.#',
      '#.#..#.#......C#.#..#.#',
      '#.#..#.###.#.###.#..#.#',
      '#..........E..........#',
      '#######################',
    ] },
  { name: 'The Attic',
    news: 'It is dark up here. Your lantern lights the way. Watch for glowing eyes!',
    tip: 'The key glows in the dark. So does the mouse hole.',
    pal: { bg: '#120F1C', floorA: '#7C6A5A', floorB: '#6F5E4F', wall: '#4B3B31', wallDark: '#2E231C', wallLight: '#6A5648', hud: '#1E1724' },
    cat: 2.2, chaser: 2.3, boss: 0, chaseOn: 6, chaseOff: 3.5, smart: 0.75, dark: true,
    map: [
      '#####################',
      '#1.................2#',
      '#.#.#.#.#####.#.#.#.#',
      '#.#...#...C...#...#.#',
      '#.###.###.#.###.###.#',
      '#.......#...#.......#',
      '#.#####.#.#.#.#####.#',
      '#K#.....# H #.....#.#',
      '#.#.###.#####.###.#.#',
      '#.....#...D...#.....#',
      '#.###.#..#E#..#.###.#',
      '#####################',
    ] },
  { name: 'The Bakery',
    news: 'Sticky honey slows everyone down. Golden cheese counts as five!',
    tip: 'Lure a cat into the honey, then run the other way.',
    pal: { bg: '#4A2838', floorA: '#FBE0E8', floorB: '#F6D2DE', wall: '#D97BA0', wallDark: '#A9557A', wallLight: '#F0A6C1', hud: '#5E2C45' },
    cat: 0, chaser: 2.5, boss: 0, chaseOn: 6.5, chaseOff: 3.5, smart: 0.8, dark: false,
    map: [
      '#########################',
      '#1.........#.#.........2#',
      '#.###.####.#.#.####.###.#',
      '#.#G#.#..#.....#..#.#G#.#',
      '#.#.#.#..###.###..#.#.#.#',
      '#.....#.....~.....#.....#',
      '#.###.#.#### ####.#.###.#',
      '#.#M..#.## H H ##.#..M#.#',
      '#.#.###.#########.###.#.#',
      '#.....~...#...#...~.....#',
      '#.###.###.#.#.#.###.###.#',
      '#...........E...........#',
      '#########################',
    ] },
  { name: 'Cat Castle',
    news: 'Duke the castle cat is fast. Find both keys to open the royal mouse hole!',
    tip: 'Everything you learned: tunnels, milk, honey and keys. You can do it!',
    pal: { bg: '#161B2E', floorA: '#A6ADBC', floorB: '#9AA2B2', wall: '#55607A', wallDark: '#363E52', wallLight: '#7A869F', hud: '#232A42' },
    cat: 2.4, chaser: 2.7, boss: 3.1, chaseOn: 7, chaseOff: 3, smart: 0.85, dark: false,
    map: [
      '#########################',
      '#1....#.....G.....#....2#',
      '#.##.##.###.#.###.##.##.#',
      '#.#K..#.#.......#.#..K#.#',
      '#.#####.#.## ##.#.#####.#',
      '=.......#G#   #G#.......=',
      '#.#####.#.# B #.#.#####.#',
      '#.#...#.#.# H #.#.#...#.#',
      '#.#M#.#...#####...#.#M#.#',
      '#...#.###...C...###.#...#',
      '#.#.#...#.#####.#...#.#.#',
      '#.#.###.#.#####.#.###.#.#',
      '#...~....D..E..D....~...#',
      '#########################',
    ] },
];

// ---------- state ----------
const S = {
  mode: 'title', level: 0, sel: 0, t: 0, modeT: 0, muted: false, toast: null,
  players: [true, false], mice: [null, null], cats: [], cheese: new Map(), items: new Map(), doors: [], exit: null,
  starts: [null, null], tunnelRows: {}, honey: new Set(), beds: [], grid: null, rows: 0, cols: 0, tile: 48, ox: 0, oy: 0,
  cheeseLeft: 0, cheeseTotal: 0, keys: 0, keysTotal: 0, exitOpen: false,
  parts: [], floats: [], confetti: [], shake: 0, bonks: 0, catsBonked: 0, time: 0, scaredT: 0, stars: 0, starsShown: 0,
  streak: 0, streakT: 0, goT: 0,
};
const SAVE_KEY = 'cheese-chase-v1';
const save = { unlocked: 0, stars: LEVELS.map(() => 0), eaten: 0 };
try {
  const d = JSON.parse(ArcadeProfile.storage.getItem(SAVE_KEY) || 'null');
  if (d) {
    save.unlocked = clamp(d.unlocked | 0, 0, LEVELS.length - 1);
    if (Array.isArray(d.stars)) d.stars.forEach((v, i) => { if (i < save.stars.length) save.stars[i] = clamp(v | 0, 0, 3); });
    save.eaten = Math.max(0, d.eaten | 0);
  }
} catch (e) {}
function persist() { try { ArcadeProfile.storage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) {} }

// ---------- audio ----------
let AC = null, master = null;
function initAudio() {
  if (AC) { if (AC.state === 'suspended') AC.resume().catch(() => {}); return; }
  try {
    const Ctor = window.AudioContext || window.webkitAudioContext;
    AC = new Ctor(); master = AC.createGain(); master.gain.value = 0.55; master.connect(AC.destination);
  } catch (e) { AC = null; }
}
function tone(freq, dur, type, vol, delay, slide) {
  if (!AC || S.muted) return;
  try {
    const t0 = AC.currentTime + (delay || 0);
    const o = AC.createOscillator(), g = AC.createGain();
    o.type = type || 'square'; o.frequency.setValueAtTime(freq, t0);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol || 0.2, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(master); o.start(t0); o.stop(t0 + dur + 0.03);
  } catch (e) {}
}
const SFX = {
  nibble(n) { tone(480 + n * 36, 0.07, 'square', 0.07); },
  gold() { [880, 1109, 1319, 1760].forEach((f, i) => tone(f, 0.25, 'triangle', 0.18, i * 0.06)); },
  key() { [784, 988, 1175].forEach((f, i) => tone(f, 0.2, 'triangle', 0.2, i * 0.1)); },
  door() { tone(110, 0.55, 'sawtooth', 0.12, 0, -50); tone(220, 0.25, 'square', 0.06, 0.35, 120); },
  milk() { [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.16, 'triangle', 0.18, i * 0.05)); },
  caught() { tone(400, 0.35, 'sawtooth', 0.16, 0, -240); tone(170, 0.4, 'square', 0.1, 0.15, -70); },
  bonkCat() { tone(300, 0.12, 'square', 0.16, 0, 260); tone(620, 0.22, 'triangle', 0.16, 0.1, 420); },
  start() { tone(523, 0.12, 'triangle', 0.2); tone(784, 0.22, 'triangle', 0.2, 0.12); },
  clear() { [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => tone(f, i === 6 ? 0.7 : 0.16, 'triangle', 0.22, i * 0.11)); },
  star(i) { tone(1047 + i * 262, 0.3, 'triangle', 0.22); },
  ui() { tone(660, 0.06, 'square', 0.07); },
  meow() { tone(720, 0.32, 'sawtooth', 0.06, 0, -320); },
  exitOpen() { [392, 523, 659, 784, 1047].forEach((f, i) => tone(f, 0.2, 'triangle', 0.18, i * 0.08)); },
  wrap() { tone(300, 0.15, 'sine', 0.14, 0, 320); },
  join() { tone(660, 0.1, 'triangle', 0.2); tone(880, 0.1, 'triangle', 0.2, 0.1); tone(1320, 0.2, 'triangle', 0.2, 0.2); },
};
const midiHz = n => 440 * Math.pow(2, (n - 69) / 12);
const MEL = [72, 76, 79, 76, 72, 76, 79, 81, 79, 76, 74, 72, 74, 76, 74, 0, 77, 81, 84, 81, 77, 81, 79, 76, 74, 77, 76, 74, 72, 0, 0, 0];
const BASS = [48, 55, 48, 55, 43, 50, 43, 50, 41, 48, 41, 48, 43, 50, 48, 48];
const MUS = { next: 0, step: 0 };
function musicTick() {
  if (!AC) return;
  const play = !S.muted && (S.mode === 'title' || S.mode === 'intro' || S.mode === 'playing');
  if (!play) { MUS.next = AC.currentTime + 0.1; return; }
  if (MUS.next < AC.currentTime) MUS.next = AC.currentTime + 0.05;
  const stepDur = S.mode === 'playing' && S.scaredT > 0 ? 0.19 : 0.26;
  while (MUS.next < AC.currentTime + 0.3) {
    const i = MUS.step % MEL.length;
    const m = MEL[i];
    const d = MUS.next - AC.currentTime;
    if (m) tone(midiHz(m), stepDur * 0.85, 'triangle', 0.045, d);
    if (i % 2 === 0) tone(midiHz(BASS[(i / 2) % BASS.length]), stepDur * 1.7, 'sine', 0.06, d);
    MUS.next += stepDur; MUS.step++;
  }
}

// ---------- input ----------
const keys = {}; const pressed = new Set(); const gpPrev = {};
let pointerAction = false;
window.addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT') return;
  if (e.repeat) return;
  keys[e.code] = true; pressed.add(e.code);
  if (e.code === 'KeyF') toggleFs();
  if (e.code === 'KeyM') { S.muted = !S.muted; S.toast = { text: S.muted ? 'Sound off' : 'Sound on', life: 1.5 }; }
  if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space'].includes(e.code)) e.preventDefault();
  initAudio();
});
window.addEventListener('keyup', e => { keys[e.code] = false; });
window.addEventListener('blur', () => { for (const k in keys) keys[k] = false; if (!FAMILY && S.mode === 'playing') S.mode = 'paused'; });
canvas.addEventListener('pointerdown', () => { initAudio(); if (S.mode !== 'playing') pointerAction = true; });
window.addEventListener('gamepadconnected', e => { S.toast = { text: `Controller ${e.gamepad.index + 1} connected`, life: 2.5 }; });
window.addEventListener('gamepaddisconnected', e => { S.toast = { text: `Controller ${e.gamepad.index + 1} disconnected`, life: 2.5 }; });

function readInputs() {
  const inp = [0, 1].map(() => ({ dx: 0, dy: 0, action: false, back: false, pause: false, any: false, left: false, right: false }));
  if (keys.ArrowLeft) inp[0].dx = -1; else if (keys.ArrowRight) inp[0].dx = 1;
  if (keys.ArrowUp) inp[0].dy = -1; else if (keys.ArrowDown) inp[0].dy = 1;
  if (keys.KeyA) inp[1].dx = -1; else if (keys.KeyD) inp[1].dx = 1;
  if (keys.KeyW) inp[1].dy = -1; else if (keys.KeyS) inp[1].dy = 1;
  if (pressed.has('Enter') || pressed.has('Space') || pointerAction) inp[0].action = true;
  if (pressed.has('KeyP') || (pressed.has('Escape') && ['playing','paused'].includes(S.mode))) inp[0].pause = true;
  if (pressed.has('Escape') && !['playing','paused'].includes(S.mode)) inp[0].back = true;
  if (pressed.has('Backspace') || pressed.has('KeyQ')) inp[0].back = true;
  if (pressed.has('ArrowLeft')) inp[0].left = true;
  if (pressed.has('ArrowRight')) inp[0].right = true;
  if (pressed.has('KeyA')) inp[1].left = true;
  if (pressed.has('KeyD')) inp[1].right = true;
  if (['KeyW', 'KeyA', 'KeyS', 'KeyD'].some(k => pressed.has(k))) inp[1].any = true;
  pointerAction = false;
  // Controllers — AGENTS.md §9 standard, read ONLY through GamepadStd. Pad in slot 0 = Mouse 1, slot 1 = Mouse 2.
  //   d-pad / stick = move (dominant axis wins) · A = go / confirm · B = pause toggle in play, back in menus · Start = pause toggle
  const pads = window.GamepadStd ? GamepadStd.read('game') : [];
  for (let slot = 0; slot < 2 && slot < pads.length; slot++) {
    const gp = pads[slot], p = inp[slot];
    let ax = gp.ax, ay = gp.ay;
    if (Math.abs(ax) < 0.4) ax = 0; if (Math.abs(ay) < 0.4) ay = 0;
    if (gp.left) ax = -1; if (gp.right) ax = 1; if (gp.up) ay = -1; if (gp.down) ay = 1;
    if (ax || ay) {
      if (Math.abs(ax) >= Math.abs(ay)) { p.dx = Math.sign(ax); p.dy = 0; } else { p.dy = Math.sign(ay); p.dx = 0; }
      p.any = true;
    }
    if (GamepadStd.NAMES.some(n => gp.just[n])) initAudio();
    if (gp.just.A) { p.action = true; p.any = true; }
    if (gp.just.start) { p.pause = true; p.any = true; }
    if (gp.just.B) { if (S.mode === 'playing' || S.mode === 'paused') p.pause = true; else p.back = true; }
    const prev = gpPrev[slot] || {}, sx = Math.sign(ax);
    if (sx === -1 && prev.ax !== -1) p.left = true;
    if (sx === 1 && prev.ax !== 1) p.right = true;
    gpPrev[slot] = { ax: sx };
  }
  if (FAMILY) {
    const p=familyRemote();
    inp[1]={dx:Number(!!p.right)-Number(!!p.left),dy:Number(!!p.down)-Number(!!p.up),action:familyActions.has('A'),pause:familyActions.has('start')||(familyActions.has('B')&&['playing','paused'].includes(S.mode)),back:familyActions.has('B')&&!['playing','paused'].includes(S.mode),left:familyActions.has('left'),right:familyActions.has('right'),any:false};
    familyActions.clear();
  }
  pressed.clear();
  return inp;
}

function toggleFs() {
  try {
    if (!document.fullscreenElement) { const p = document.documentElement.requestFullscreen(); if (p && p.catch) p.catch(() => {}); }
    else { const p = document.exitFullscreen(); if (p && p.catch) p.catch(() => {}); }
  } catch (e) {}
}
const fsBtn = document.getElementById('fs');
if(FAMILY)fsBtn.style.display='none';
fsBtn.addEventListener('click', () => { initAudio(); toggleFs(); });
document.addEventListener('fullscreenchange', () => { fsBtn.hidden = !!document.fullscreenElement; });

// ---------- level setup ----------
let bgDirty = true;
function startLevel(i) {
  const L = LEVELS[i]; S.level = i;
  const g = L.map;
  S.rows = g.length; S.cols = g[0].length;
  S.tile = Math.floor(Math.min(VW / S.cols, (VH - HUD_H - 10) / S.rows));
  S.ox = Math.floor((VW - S.tile * S.cols) / 2);
  S.oy = HUD_H + Math.floor((VH - HUD_H - S.tile * S.rows) / 2);
  S.grid = []; S.cheese = new Map(); S.items = new Map(); S.cats = []; S.doors = []; S.tunnelRows = {};
  S.honey = new Set(); S.starts = [null, null]; S.exit = null; S.beds = [];
  for (let r = 0; r < S.rows; r++) {
    const row = [];
    for (let c = 0; c < S.cols; c++) {
      const ch = g[r][c]; const key = r * S.cols + c;
      row.push(ch === '#' ? 1 : ch === 'D' ? 2 : 0);
      if (ch === '.' || ch === 'G') S.cheese.set(key, { c, r, gold: ch === 'G', phase: Math.random() * TAU });
      else if (ch === 'K') S.items.set(key, { c, r, type: 'key', phase: Math.random() * TAU });
      else if (ch === 'M') S.items.set(key, { c, r, type: 'milk', phase: Math.random() * TAU });
      else if (ch === 'D') S.doors.push({ c, r, open: false, anim: 0 });
      else if (ch === 'E') S.exit = { c, r };
      else if (ch === '1') S.starts[0] = { c, r };
      else if (ch === '2') S.starts[1] = { c, r };
      else if (ch === 'C' || ch === 'H' || ch === 'B') { S.cats.push(makeCat(ch, c, r, L)); S.beds.push({ c, r }); }
      else if (ch === '~') S.honey.add(key);
      else if (ch === '=') S.tunnelRows[r] = true;
    }
    S.grid.push(row);
  }
  if (!S.starts[1]) S.starts[1] = S.starts[0];
  S.cheeseTotal = S.cheeseLeft = S.cheese.size;
  S.keysTotal = [...S.items.values()].filter(it => it.type === 'key').length; S.keys = 0;
  S.exitOpen = false; S.bonks = 0; S.catsBonked = 0; S.time = 0; S.scaredT = 0;
  S.parts = []; S.floats = []; S.confetti = []; S.shake = 0; S.streak = 0; S.streakT = 0; S.goT = 0; S.toast = null;
  S.mice = [null, null];
  for (let p = 0; p < 2; p++) if (S.players[p]) S.mice[p] = makeMouse(p);
  S.mode = 'intro'; S.modeT = 0; bgDirty = true;
}
function makeCat(type, c, r, L) {
  const speed = type === 'C' ? L.cat : type === 'H' ? L.chaser : L.boss;
  return { type, x: c + 0.5, y: r + 0.5, home: { c, r }, dir: [0, 0], face: 1, speed: speed || 1.8, state: 'sleep',
    sleep: 2.5, pause: 0, scared: 0, anim: 0, chasing: true, cycle: L.chaseOn, homeDist: null };
}
function makeMouse(p) {
  const st = S.starts[p];
  return { x: st.c + 0.5, y: st.r + 0.5, dir: [0, 0], want: [0, 0], want2: null, wantT: 0, face: p === 0 ? 1 : -1,
    speed: 4.4, inv: 0, dizzy: 0, milk: 0, anim: 0, bonks: 0, tag: 3 };
}

// ---------- grid helpers ----------
function openFor(c, r) {
  if (r < 0 || r >= S.rows) return false;
  if (c < 0 || c >= S.cols) return !!S.tunnelRows[r];
  return S.grid[r][c] === 0;
}
function honeyAt(x, y) { return S.honey.has(Math.floor(y) * S.cols + Math.floor(x)); }
function bfsDist(from) {
  const d = new Int16Array(S.rows * S.cols).fill(-1);
  const q = [[from.c, from.r]]; d[from.r * S.cols + from.c] = 0;
  let qi = 0;
  while (qi < q.length) {
    const [c, r] = q[qi++]; const base = d[r * S.cols + c];
    for (const [dx, dy] of DIRS) {
      let nc = c + dx; const nr = r + dy;
      if (nr < 0 || nr >= S.rows) continue;
      if (nc < 0 || nc >= S.cols) { if (!S.tunnelRows[nr]) continue; nc = (nc + S.cols) % S.cols; }
      if (S.grid[nr][nc] !== 0) continue;
      const k = nr * S.cols + nc;
      if (d[k] >= 0) continue;
      d[k] = base + 1; q.push([nc, nr]);
    }
  }
  return d;
}
function nearestMouse(x, y) {
  let best = null, bd = 1e9;
  for (const m of S.mice) {
    if (!m || m.dizzy > 0) continue;
    const d = Math.hypot(m.x - x, m.y - y);
    if (d < bd) { bd = d; best = m; }
  }
  return best;
}

// ---------- movement ----------
function stepMover(m, dt, isCat, speed) {
  let rem = speed * dt * (honeyAt(m.x, m.y) ? 0.5 : 1);
  let guard = 0;
  while (rem > 1e-6 && guard++ < 12) {
    const cx = Math.floor(m.x), cy = Math.floor(m.y), ccx = cx + 0.5, ccy = cy + 0.5;
    const offC = Math.abs(m.x - ccx) + Math.abs(m.y - ccy);
    if (!isCat) {
      const tryWant = w => {
        if (!w || (!w[0] && !w[1])) return false;
        const moving = m.dir[0] || m.dir[1];
        if (moving && w[0] === -m.dir[0] && w[1] === -m.dir[1]) { m.dir = [w[0], w[1]]; return true; }
        if (w[0] === m.dir[0] && w[1] === m.dir[1]) return true;
        if (offC < TURN_TOL && openFor(cx + w[0], cy + w[1])) { m.x = ccx; m.y = ccy; m.dir = [w[0], w[1]]; return true; }
        return false;
      };
      if (!tryWant(m.want)) tryWant(m.want2);
    }
    if (!m.dir[0] && !m.dir[1]) break;
    const dx = m.dir[0], dy = m.dir[1];
    const ahead = dx ? (m.x - ccx) * dx : (m.y - ccy) * dy;
    if (ahead < -1e-6) { const st = Math.min(rem, -ahead); m.x += dx * st; m.y += dy * st; rem -= st; continue; }
    const nx = cx + dx, ny = cy + dy;
    if (!openFor(nx, ny)) {
      m.x = ccx; m.y = ccy;
      if (isCat) { catDecide(m); if (!m.dir[0] && !m.dir[1]) break; continue; }
      m.dir = [0, 0]; break;
    }
    const toNext = 1 - ahead;
    const st = Math.min(rem, toNext);
    m.x += dx * st; m.y += dy * st; rem -= st;
    if (st >= toNext - 1e-6) {
      m.x = nx + 0.5; m.y = ny + 0.5;
      if (m.x < 0) { m.x += S.cols; if (!isCat) SFX.wrap(); }
      else if (m.x >= S.cols) { m.x -= S.cols; if (!isCat) SFX.wrap(); }
      if (isCat) catDecide(m);
    }
  }
  // Small fixed steps can cross the tunnel edge between tile centres.
  // Normalize before collection/pathfinding so neither mouse leaves the grid.
  if (S.tunnelRows[Math.floor(m.y)]) m.x = ((m.x % S.cols) + S.cols) % S.cols;
}
function setWant(m, dx, dy) {
  if (dx && dy) {
    const cands = m.dir[0] ? [[0, dy], [dx, 0]] : [[dx, 0], [0, dy]];
    m.want = cands[0]; m.want2 = cands[1];
  } else { m.want = [dx, dy]; m.want2 = null; }
}

// ---------- cats ----------
function catDecide(cat) {
  const cx = Math.floor(cat.x), cy = Math.floor(cat.y);
  if (cat.state === 'home' && cx === cat.home.c && cy === cat.home.r) {
    cat.state = 'sleep'; cat.sleep = 3; cat.dir = [0, 0]; cat.x = cx + 0.5; cat.y = cy + 0.5; return;
  }
  const L = LEVELS[S.level];
  let opts = DIRS.filter(d => openFor(cx + d[0], cy + d[1]));
  const noRev = opts.filter(d => !(d[0] === -cat.dir[0] && d[1] === -cat.dir[1]));
  if (noRev.length) opts = noRev;
  if (!opts.length) { cat.dir = [0, 0]; return; }
  const nb = d => { let nc = cx + d[0]; if (nc < 0) nc += S.cols; else if (nc >= S.cols) nc -= S.cols; return [nc + 0.5, cy + d[1] + 0.5]; };
  let choice = null;
  if (cat.state === 'home') {
    if (!cat.homeDist) cat.homeDist = bfsDist(cat.home);
    let best = 1e9;
    for (const d of opts) { const [nx, ny] = nb(d); const v = cat.homeDist[Math.floor(ny) * S.cols + Math.floor(nx)]; if (v >= 0 && v < best) { best = v; choice = d; } }
    if (!choice) choice = pick(opts);
  } else {
    const tgt = nearestMouse(cat.x, cat.y);
    if (cat.state === 'scared' && tgt && Math.random() < 0.75) {
      let best = -1;
      for (const d of opts) { const [nx, ny] = nb(d); const v = Math.hypot(nx - tgt.x, ny - tgt.y); if (v > best) { best = v; choice = d; } }
    } else if (cat.type !== 'C' && cat.state !== 'scared' && cat.chasing && tgt && Math.random() < L.smart) {
      let best = 1e9;
      for (const d of opts) { const [nx, ny] = nb(d); const v = Math.hypot(nx - tgt.x, ny - tgt.y); if (v < best) { best = v; choice = d; } }
    } else {
      const straight = opts.find(d => d[0] === cat.dir[0] && d[1] === cat.dir[1]);
      choice = (straight && Math.random() < 0.65) ? straight : pick(opts);
    }
  }
  cat.dir = choice;
}
function updateCat(cat, dt, L) {
  if (cat.sleep > 0) {
    cat.sleep -= dt;
    if (cat.sleep <= 0) {
      cat.sleep = 0; cat.state = 'roam'; cat.chasing = true; cat.cycle = L.chaseOn; cat.homeDist = null;
      cat.x = cat.home.c + 0.5; cat.y = cat.home.r + 0.5; cat.dir = [0, 0];
      catDecide(cat); if (Math.random() < 0.6) SFX.meow();
    }
    return;
  }
  if (cat.pause > 0) { cat.pause -= dt; return; }
  cat.anim += dt;
  if (cat.state === 'scared') { cat.scared -= dt; if (cat.scared <= 0) { cat.scared = 0; cat.state = 'roam'; } }
  if (cat.type !== 'C' && cat.state === 'roam') {
    cat.cycle -= dt;
    if (cat.cycle <= 0) { cat.chasing = !cat.chasing; cat.cycle = cat.chasing ? L.chaseOn : L.chaseOff; }
  }
  let sp = cat.speed;
  if (cat.state === 'scared') sp *= 0.6;
  else if (cat.state === 'home') sp *= 2.5;
  else if (cat.type !== 'C' && !cat.chasing) sp *= 0.8;
  if (!cat.dir[0] && !cat.dir[1]) catDecide(cat);
  stepMover(cat, dt, true, sp);
  if (cat.dir[0]) cat.face = cat.dir[0];
}
function scareCats(secs) {
  for (const cat of S.cats) {
    if (cat.sleep > 0 || cat.state === 'home') continue;
    cat.state = 'scared'; cat.scared = secs;
    if (cat.dir[0] || cat.dir[1]) cat.dir = [-cat.dir[0], -cat.dir[1]];
  }
}

// ---------- mice ----------
function tileCenterPx(x, y) { return [S.ox + x * S.tile, S.oy + y * S.tile]; }
function updateMouse(m, p, inp, dt) {
  if (m.dizzy > 0) {
    m.dizzy -= dt;
    if (m.dizzy <= 0) {
      m.dizzy = 0;
      const [px, py] = tileCenterPx(m.x, m.y); puff(px, py);
      const st = S.starts[p]; m.x = st.c + 0.5; m.y = st.r + 0.5; m.dir = [0, 0]; m.want = [0, 0]; m.want2 = null; m.inv = 2.2;
      const [qx, qy] = tileCenterPx(m.x, m.y); puff(qx, qy);
    }
    return;
  }
  m.inv = Math.max(0, m.inv - dt); m.milk = Math.max(0, m.milk - dt); m.tag = Math.max(0, m.tag - dt);
  if (inp.dx || inp.dy) { setWant(m, inp.dx, inp.dy); m.wantT = 0.6; }
  else { m.wantT -= dt; if (m.wantT <= 0) { m.want = [0, 0]; m.want2 = null; } }
  const bx = m.x, by = m.y;
  stepMover(m, dt, false, m.speed);
  if (m.dir[0]) m.face = m.dir[0];
  if (m.x !== bx || m.y !== by) m.anim += dt;
  collectAt(m, p);
}
function collectAt(m, p) {
  const cx = Math.floor(m.x), cy = Math.floor(m.y);
  if (Math.abs(m.x - cx - 0.5) > 0.45 || Math.abs(m.y - cy - 0.5) > 0.45) return;
  const key = cy * S.cols + cx;
  const [px, py] = tileCenterPx(cx + 0.5, cy + 0.5);
  const ch = S.cheese.get(key);
  if (ch) {
    S.cheese.delete(key); S.cheeseLeft--;
    S.streak = S.streakT > 0 ? S.streak + 1 : 0; S.streakT = 0.7;
    crumbs(px, py, ch.gold ? '#FFB400' : '#FFD54A', ch.gold ? 14 : 6);
    if (ch.gold) { save.eaten += 5; SFX.gold(); floatText('+5!', px, py - 10, '#FFB400'); sparkles(px, py, '#FFF4C2', 10); }
    else { save.eaten += 1; SFX.nibble(Math.min(S.streak, 14)); if (S.streak > 0 && S.streak % 10 === 0) floatText('Yum yum!', px, py - 10, '#FFF6E5'); }
    if (S.cheeseLeft <= 0) openExit();
  }
  const it = S.items.get(key);
  if (it) {
    S.items.delete(key);
    if (it.type === 'key') {
      S.keys++; SFX.key(); floatText('Key!', px, py - 10, '#FFD23F'); sparkles(px, py, '#FFE08A', 10);
      if (S.keys >= S.keysTotal) openDoors();
    } else {
      m.milk = 7; S.scaredT = 7; scareCats(7); SFX.milk(); floatText('Milk power!', px, py - 10, '#FFFFFF'); sparkles(px, py, '#FFFFFF', 12);
    }
  }
  if (S.exitOpen && S.exit && cx === S.exit.c && cy === S.exit.r && Math.abs(m.x - cx - 0.5) < 0.3 && Math.abs(m.y - cy - 0.5) < 0.3) clearLevel();
}
function openExit() {
  S.exitOpen = true; SFX.exitOpen();
  const [px, py] = tileCenterPx(S.exit.c + 0.5, S.exit.r + 0.5);
  sparkles(px, py, '#FFE08A', 18);
  S.toast = { text: 'The mouse hole is open! Run home!', life: 3 };
}
function openDoors() {
  for (const d of S.doors) { d.open = true; d.anim = 0; S.grid[d.r][d.c] = 0; const [px, py] = tileCenterPx(d.c + 0.5, d.r + 0.5); sparkles(px, py, '#FFE08A', 8); }
  for (const cat of S.cats) cat.homeDist = null;
  SFX.door(); S.toast = { text: 'The gate is open!', life: 2.5 };
}
function mouseCaught(m, cat) {
  m.dizzy = 1.2; m.dir = [0, 0]; m.want = [0, 0]; m.want2 = null; m.bonks++; S.bonks++;
  S.shake = 1; cat.pause = 1.0; SFX.caught();
  const [px, py] = tileCenterPx(m.x, m.y); floatText('Ouch!', px, py - 20, '#FF8C8C');
}
function catBonked(cat) {
  cat.state = 'home'; cat.scared = 0; cat.homeDist = bfsDist(cat.home); S.catsBonked++;
  if (cat.dir[0] || cat.dir[1]) cat.dir = [-cat.dir[0], -cat.dir[1]];
  SFX.bonkCat(); const [px, py] = tileCenterPx(cat.x, cat.y); floatText('Bonk!', px, py - 20, '#B9E86B'); sparkles(px, py, '#FFFFFF', 8);
}

// ---------- game flow ----------
function beginPlay() {
  S.mode = 'playing'; S.goT = 1.4; SFX.start();
  if (AC) MUS.next = AC.currentTime + 0.1;
}
function clearLevel() {
  S.mode = 'cleared'; S.modeT = 0; S.starsShown = 0;
  S.stars = S.bonks === 0 ? 3 : S.bonks <= 3 ? 2 : 1;
  save.stars[S.level] = Math.max(save.stars[S.level], S.stars);
  save.unlocked = Math.max(save.unlocked, Math.min(LEVELS.length - 1, S.level + 1));
  persist(); SFX.clear(); burstConfetti(140);
}
function nextLevel() {
  if (S.level >= LEVELS.length - 1) { S.mode = 'ending'; S.modeT = 0; S.confetti = []; burstConfetti(120); }
  else startLevel(S.level + 1);
}
function goTitle() { S.mode = 'title'; S.modeT = 0; S.sel = clamp(S.level, 0, save.unlocked); S.confetti = []; persist(); }
function joinP2() {
  S.players[1] = true; SFX.join();
  if (S.mode !== 'title') { S.mice[1] = makeMouse(1); S.mice[1].inv = 2.2; S.toast = { text: 'Mouse 2 joined!', life: 2.5 }; }
}
function updateStars() {
  const times = [0.6, 0.95, 1.3];
  while (S.starsShown < S.stars && S.modeT >= times[S.starsShown]) { SFX.star(S.starsShown); S.starsShown++; }
}
function update(dt, inp) {
  S.t += dt;
  if (S.toast) { S.toast.life -= dt; if (S.toast.life <= 0) S.toast = null; }
  S.shake = Math.max(0, S.shake - dt * 2.5);
  updateFx(dt);
  const anyAction = inp[0].action || inp[1].action;
  const anyBack = inp[0].back || inp[1].back;
  const anyPause = inp[0].pause || inp[1].pause;
  if (!S.players[1] && inp[1].any && (S.mode === 'title' || S.mode === 'playing' || S.mode === 'intro')) joinP2();
  switch (S.mode) {
    case 'title': {
      S.modeT += dt;
      const L = inp[0].left || inp[1].left, R = inp[0].right || inp[1].right;
      if (L && S.sel > 0) { S.sel--; SFX.ui(); }
      if (R && S.sel < save.unlocked) { S.sel++; SFX.ui(); }
      if (anyAction) { SFX.ui(); startLevel(S.sel); }
      break;
    }
    case 'intro': S.modeT += dt; if (anyAction && S.modeT > 0.3) beginPlay(); break;
    case 'playing': if (anyPause) { S.mode = 'paused'; break; } updatePlay(dt, inp); break;
    case 'paused': if (anyAction || anyPause) S.mode = 'playing'; else if (anyBack) goTitle(); break;
    case 'cleared': S.modeT += dt; updateStars(); if (anyAction && S.modeT > 1.2) nextLevel(); else if (anyBack) goTitle(); break;
    case 'ending': S.modeT += dt; if (Math.random() < 0.4) burstConfetti(1); if (anyAction && S.modeT > 1) goTitle(); break;
  }
  musicTick();
}
function updatePlay(dt, inp) {
  const L = LEVELS[S.level];
  S.time += dt; S.goT = Math.max(0, S.goT - dt); S.streakT = Math.max(0, S.streakT - dt); S.scaredT = Math.max(0, S.scaredT - dt);
  for (let p = 0; p < 2; p++) {
    const m = S.mice[p]; if (!m) continue;
    updateMouse(m, p, inp[p], dt);
    if (S.mode !== 'playing') return;
  }
  for (const cat of S.cats) updateCat(cat, dt, L);
  for (const cat of S.cats) {
    if (cat.sleep > 0 || cat.state === 'home') continue;
    for (let p = 0; p < 2; p++) {
      const m = S.mice[p]; if (!m || m.dizzy > 0) continue;
      if (Math.hypot(cat.x - m.x, cat.y - m.y) < 0.62) {
        if (cat.state === 'scared') catBonked(cat);
        else if (m.inv <= 0 && cat.pause <= 0) mouseCaught(m, cat);
      }
    }
  }
  for (const d of S.doors) if (d.open) d.anim += dt;
}

// ---------- effects ----------
const CONF = ['#FFD23F', '#FF6B6B', '#4ECDC4', '#9B5DE5', '#F9A8D4', '#7CD992', '#FFFFFF'];
function crumbs(x, y, col, n) { for (let i = 0; i < n; i++) S.parts.push({ x, y, vx: rand(-110, 110), vy: rand(-190, -40), g: 460, life: rand(0.35, 0.65), col, size: rand(3, 6), kind: 'sq' }); }
function puff(x, y) { for (let i = 0; i < 8; i++) { const a = rand(0, TAU); S.parts.push({ x, y, vx: Math.cos(a) * rand(30, 80), vy: Math.sin(a) * rand(30, 80), g: 0, life: 0.5, col: 'rgba(255,255,255,0.85)', size: rand(6, 12), kind: 'circ' }); } }
function sparkles(x, y, col, n) { for (let i = 0; i < n; i++) { const a = rand(0, TAU); const v = rand(40, 140); S.parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, g: 60, life: rand(0.5, 0.9), col, size: rand(5, 10), kind: 'star' }); } }
function floatText(text, x, y, col) { S.floats.push({ text, x, y, life: 1.2, col }); }
function burstConfetti(n) { for (let i = 0; i < n; i++) S.confetti.push({ x: rand(0, VW), y: rand(-240, -10), vy: rand(120, 260), vr: rand(-6, 6), rot: rand(0, TAU), col: pick(CONF), w: rand(6, 12), h: rand(8, 16), ph: rand(0, TAU), life: 7 }); }
function updateFx(dt) {
  for (const p of S.parts) { p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += p.g * dt; }
  S.parts = S.parts.filter(p => p.life > 0);
  for (const f of S.floats) { f.life -= dt; f.y -= 42 * dt; }
  S.floats = S.floats.filter(f => f.life > 0);
  for (const c of S.confetti) { c.life -= dt; c.y += c.vy * dt; c.x += Math.sin(S.t * 3 + c.ph) * 34 * dt; c.rot += c.vr * dt; }
  S.confetti = S.confetti.filter(c => c.life > 0 && c.y < VH + 30);
}

// ---------- drawing helpers ----------
function rr(c, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  c.beginPath(); c.moveTo(x + r, y); c.lineTo(x + w - r, y); c.quadraticCurveTo(x + w, y, x + w, y + r);
  c.lineTo(x + w, y + h - r); c.quadraticCurveTo(x + w, y + h, x + w - r, y + h); c.lineTo(x + r, y + h);
  c.quadraticCurveTo(x, y + h, x, y + h - r); c.lineTo(x, y + r); c.quadraticCurveTo(x, y, x + r, y); c.closePath();
}
function circ(c, x, y, r) { c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill(); }
function ell(c, x, y, rx, ry) { c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, TAU); c.fill(); }
function tri(c, x1, y1, x2, y2, x3, y3) { c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.lineTo(x3, y3); c.closePath(); c.fill(); }
function star(c, x, y, r, col, rot, n, inner) {
  n = n || 5; inner = inner || 0.48; rot = rot || 0;
  c.fillStyle = col; c.beginPath();
  for (let i = 0; i < n * 2; i++) {
    const a = rot - Math.PI / 2 + i * Math.PI / n; const rad = i % 2 ? r * inner : r;
    const px = x + Math.cos(a) * rad, py = y + Math.sin(a) * rad;
    if (i) c.lineTo(px, py); else c.moveTo(px, py);
  }
  c.closePath(); c.fill();
}
function txt(c, s, x, y, size, col, align, weight, stroke, sw) {
  c.font = `${weight || 700} ${size}px ${FONT}`; c.textAlign = align || 'center'; c.textBaseline = 'middle';
  if (stroke) { c.lineJoin = 'round'; c.strokeStyle = stroke; c.lineWidth = sw || size * 0.18; c.strokeText(s, x, y); }
  c.fillStyle = col; c.fillText(s, x, y);
}
function wrapText(str, maxW, size) {
  ctx.font = `500 ${size}px ${FONT}`;
  const words = str.split(' '); const lines = []; let line = '';
  for (const w of words) {
    const test = line ? line + ' ' + w : w;
    if (ctx.measureText(test).width > maxW && line) { lines.push(line); line = w; } else line = test;
  }
  if (line) lines.push(line);
  return lines;
}
function fullRect(c) { c.fillRect(-offX / scale - 2, -offY / scale - 2, canvas.width / scale + 4, canvas.height / scale + 4); }
function crown(c, x, y, s) {
  c.fillStyle = '#FFD23F'; c.beginPath();
  c.moveTo(x - s, y + s * 0.5); c.lineTo(x - s, y - s * 0.5); c.lineTo(x - s * 0.5, y); c.lineTo(x, y - s * 0.9);
  c.lineTo(x + s * 0.5, y); c.lineTo(x + s, y - s * 0.5); c.lineTo(x + s, y + s * 0.5); c.closePath(); c.fill();
  c.fillStyle = '#FF6B6B'; circ(c, x, y + s * 0.15, s * 0.18);
}
function drawLock(c, x, y, s) {
  c.strokeStyle = '#D9D2E0'; c.lineWidth = s * 0.16; c.lineCap = 'round';
  c.beginPath(); c.arc(x, y - s * 0.2, s * 0.32, Math.PI, 0); c.stroke();
  c.fillStyle = '#D9D2E0'; rr(c, x - s * 0.45, y - s * 0.2, s * 0.9, s * 0.72, s * 0.14); c.fill();
  c.fillStyle = '#4B4356'; circ(c, x, y + s * 0.12, s * 0.1);
}

// ---------- sprites ----------
function drawCheese(c, x, y, s, gold, t, phase) {
  const w = s * 0.36; const bob = t ? Math.sin(t * 3 + phase) * s * 0.025 : 0;
  c.save(); c.translate(x, y + bob);
  c.lineJoin = 'round'; c.lineWidth = s * 0.07;
  c.fillStyle = gold ? '#FFB400' : '#FFD54A'; c.strokeStyle = gold ? '#C77800' : '#D9A21B';
  c.beginPath(); c.moveTo(-w, w * 0.62); c.lineTo(w, w * 0.62); c.lineTo(w * 0.2, -w * 0.7); c.closePath(); c.fill(); c.stroke();
  c.fillStyle = gold ? '#E09200' : '#F0B22E';
  c.beginPath(); c.moveTo(-w * 0.95, w * 0.6); c.lineTo(w * 0.95, w * 0.6); c.lineTo(w * 0.78, w * 0.38); c.lineTo(-w * 0.78, w * 0.38); c.closePath(); c.fill();
  c.fillStyle = gold ? '#D98A00' : '#E8B126';
  circ(c, -w * 0.25, w * 0.08, w * 0.15); circ(c, w * 0.32, -w * 0.02, w * 0.11); circ(c, w * 0.08, -w * 0.3, w * 0.09);
  if (gold && t) { const a = t * 2 + phase; star(c, w * 0.75, -w * 0.55, w * 0.22 + Math.sin(t * 6 + phase) * w * 0.06, '#FFF4C2', a, 4, 0.4); }
  c.restore();
}
function drawKey(c, x, y, s, t, phase) {
  const bob = t ? Math.sin(t * 3 + phase) * s * 0.03 : 0;
  c.save(); c.translate(x, y + bob); c.rotate(-0.55);
  c.strokeStyle = '#E6A42A'; c.lineWidth = s * 0.12; c.lineCap = 'round';
  c.beginPath(); c.arc(-s * 0.18, 0, s * 0.15, 0, TAU); c.stroke();
  c.beginPath(); c.moveTo(-s * 0.03, 0); c.lineTo(s * 0.32, 0); c.stroke();
  c.beginPath(); c.moveTo(s * 0.32, 0); c.lineTo(s * 0.32, s * 0.15); c.moveTo(s * 0.2, 0); c.lineTo(s * 0.2, s * 0.11); c.stroke();
  c.strokeStyle = '#FFE08A'; c.lineWidth = s * 0.045;
  c.beginPath(); c.arc(-s * 0.18, 0, s * 0.15, Math.PI * 1.05, Math.PI * 1.6); c.stroke();
  c.restore();
  if (t) star(c, x + s * 0.3, y - s * 0.3 + bob, s * 0.08 + Math.sin(t * 7 + phase) * s * 0.03, '#FFF4C2', t, 4, 0.4);
}
function drawMilk(c, x, y, s, t, phase) {
  const bob = t ? Math.sin(t * 3 + phase) * s * 0.03 : 0;
  c.save(); c.translate(x, y + bob);
  c.fillStyle = '#FFFFFF'; c.strokeStyle = '#B9C8D8'; c.lineWidth = s * 0.04;
  rr(c, -s * 0.17, -s * 0.16, s * 0.34, s * 0.48, s * 0.07); c.fill(); c.stroke();
  rr(c, -s * 0.09, -s * 0.32, s * 0.18, s * 0.18, s * 0.04); c.fill(); c.stroke();
  c.fillStyle = '#4C8DD6'; rr(c, -s * 0.12, -s * 0.37, s * 0.24, s * 0.09, s * 0.03); c.fill();
  rr(c, -s * 0.17, s * 0.02, s * 0.34, s * 0.15, s * 0.03); c.fill();
  c.fillStyle = '#FFFFFF'; c.beginPath();
  c.moveTo(-s * 0.12, s * 0.1); c.quadraticCurveTo(-s * 0.06, s * 0.04, 0, s * 0.1); c.quadraticCurveTo(s * 0.06, s * 0.16, s * 0.12, s * 0.1); c.lineTo(s * 0.12, s * 0.17); c.lineTo(-s * 0.12, s * 0.17); c.closePath(); c.fill();
  c.restore();
}
function drawExit() {
  const s = S.tile, e = S.exit; if (!e) return;
  const x = S.ox + e.c * s + s / 2, y = S.oy + e.r * s + s / 2, t = S.t;
  if (S.exitOpen) {
    const g = ctx.createRadialGradient(x, y, s * 0.1, x, y, s * 1.1 + Math.sin(t * 5) * s * 0.1);
    g.addColorStop(0, 'rgba(255,224,138,0.75)'); g.addColorStop(1, 'rgba(255,224,138,0)');
    ctx.fillStyle = g; circ(ctx, x, y, s * 1.3);
  }
  ctx.fillStyle = '#8A6A4A';
  ctx.beginPath(); ctx.moveTo(x - s * 0.42, y + s * 0.4); ctx.lineTo(x - s * 0.42, y - s * 0.02); ctx.arc(x, y - s * 0.02, s * 0.42, Math.PI, 0); ctx.lineTo(x + s * 0.42, y + s * 0.4); ctx.closePath(); ctx.fill();
  ctx.fillStyle = S.exitOpen ? '#FFE08A' : '#2B1D14';
  ctx.beginPath(); ctx.moveTo(x - s * 0.33, y + s * 0.4); ctx.lineTo(x - s * 0.33, y); ctx.arc(x, y, s * 0.33, Math.PI, 0); ctx.lineTo(x + s * 0.33, y + s * 0.4); ctx.closePath(); ctx.fill();
  if (S.exitOpen) {
    ctx.fillStyle = '#5B3B1E';
    ctx.beginPath(); ctx.moveTo(x - s * 0.2, y + s * 0.4); ctx.lineTo(x - s * 0.2, y + s * 0.08); ctx.arc(x, y + s * 0.08, s * 0.2, Math.PI, 0); ctx.lineTo(x + s * 0.2, y + s * 0.4); ctx.closePath(); ctx.fill();
    const ay = y - s * 0.75 - Math.abs(Math.sin(t * 4)) * s * 0.15;
    ctx.fillStyle = '#FFD23F'; tri(ctx, x - s * 0.22, ay - s * 0.22, x + s * 0.22, ay - s * 0.22, x, ay + s * 0.05);
    ctx.fillRect(x - s * 0.09, ay - s * 0.42, s * 0.18, s * 0.22);
  } else {
    ctx.strokeStyle = '#B08A5A'; ctx.lineWidth = s * 0.1; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x - s * 0.3, y - s * 0.12); ctx.lineTo(x + s * 0.3, y + s * 0.28); ctx.moveTo(x + s * 0.3, y - s * 0.12); ctx.lineTo(x - s * 0.3, y + s * 0.28); ctx.stroke();
  }
}
function drawDoors() {
  const s = S.tile;
  for (const d of S.doors) {
    const prog = d.open ? Math.min(1, d.anim / 0.5) : 0;
    if (prog >= 1) continue;
    const x = S.ox + d.c * s, y = S.oy + d.r * s;
    ctx.save(); ctx.translate(x + s * 0.06, y); ctx.scale(1 - prog, 1);
    ctx.fillStyle = '#8B5A2B'; rr(ctx, 0, s * 0.06, s * 0.88, s * 0.88, s * 0.1); ctx.fill();
    ctx.strokeStyle = '#6A4220'; ctx.lineWidth = s * 0.04;
    for (let i = 1; i < 3; i++) { ctx.beginPath(); ctx.moveTo(s * 0.29 * i, s * 0.08); ctx.lineTo(s * 0.29 * i, s * 0.92); ctx.stroke(); }
    ctx.fillStyle = '#4A4A58'; ctx.fillRect(0, s * 0.22, s * 0.88, s * 0.1); ctx.fillRect(0, s * 0.68, s * 0.88, s * 0.1);
    ctx.fillStyle = '#FFD23F'; circ(ctx, s * 0.44, s * 0.48, s * 0.1); ctx.fillStyle = '#2B1D14'; circ(ctx, s * 0.44, s * 0.48, s * 0.045);
    ctx.restore();
  }
}
function drawMouseBody(c, x, y, r, pi, o) {
  const col = pi === 0 ? '#C8956A' : '#A9B1C2', acc = pi === 0 ? '#E85D4A' : '#3F8FD9';
  const t = o.t || 0, anim = o.anim || 0;
  c.save(); c.translate(x, y);
  if (o.alpha != null) c.globalAlpha = o.alpha;
  c.scale(o.face || 1, 1);
  c.strokeStyle = '#E3A1A7'; c.lineWidth = r * 0.18; c.lineCap = 'round';
  const wag = Math.sin(t * 7 + pi) * r * 0.3;
  c.beginPath(); c.moveTo(-r * 0.85, r * 0.35); c.quadraticCurveTo(-r * 1.7, r * 0.5 + wag, -r * 2.0, -r * 0.3 + wag * 0.6); c.stroke();
  const step = o.moving ? Math.sin(anim * 18) * r * 0.22 : 0;
  c.fillStyle = '#E3A1A7'; ell(c, -r * 0.35 + step, r * 0.95, r * 0.26, r * 0.14); ell(c, r * 0.4 - step, r * 0.95, r * 0.26, r * 0.14);
  c.fillStyle = col; ell(c, 0, r * 0.3, r * 1.0, r * 0.72);
  c.fillStyle = '#F4E6D6'; ell(c, r * 0.15, r * 0.48, r * 0.5, r * 0.36);
  const hx = r * 0.55, hy = -r * 0.3;
  c.fillStyle = col; circ(c, hx - r * 0.45, hy - r * 0.55, r * 0.4); circ(c, hx + r * 0.25, hy - r * 0.62, r * 0.4);
  c.fillStyle = '#F3B8C6'; circ(c, hx - r * 0.45, hy - r * 0.55, r * 0.24); circ(c, hx + r * 0.25, hy - r * 0.62, r * 0.24);
  c.fillStyle = col; ell(c, hx, hy, r * 0.78, r * 0.66);
  if (pi === 0) {
    c.strokeStyle = acc; c.lineWidth = r * 0.2;
    c.beginPath(); c.moveTo(hx - r * 0.72, hy + r * 0.5); c.quadraticCurveTo(hx, hy + r * 0.82, hx + r * 0.55, hy + r * 0.5); c.stroke();
    c.beginPath(); c.moveTo(hx - r * 0.6, hy + r * 0.6); c.lineTo(hx - r * 0.95, hy + r * 1.05); c.stroke();
  } else {
    c.fillStyle = acc;
    tri(c, hx + r * 0.25, hy - r * 0.95, hx - r * 0.08, hy - r * 1.22, hx - r * 0.08, hy - r * 0.68);
    tri(c, hx + r * 0.25, hy - r * 0.95, hx + r * 0.58, hy - r * 1.22, hx + r * 0.58, hy - r * 0.68);
    circ(c, hx + r * 0.25, hy - r * 0.95, r * 0.11);
  }
  const ex = hx + r * 0.3, ey = hy - r * 0.12;
  if (o.dizzy) {
    c.strokeStyle = '#2A2733'; c.lineWidth = r * 0.1; c.lineCap = 'round';
    c.beginPath(); c.moveTo(ex - r * 0.14, ey - r * 0.14); c.lineTo(ex + r * 0.14, ey + r * 0.14); c.moveTo(ex + r * 0.14, ey - r * 0.14); c.lineTo(ex - r * 0.14, ey + r * 0.14); c.stroke();
  } else if (Math.sin(t * 1.3 + pi * 2) > 0.985) {
    c.strokeStyle = '#2A2733'; c.lineWidth = r * 0.08; c.beginPath(); c.moveTo(ex - r * 0.18, ey); c.lineTo(ex + r * 0.18, ey); c.stroke();
  } else {
    c.fillStyle = '#FFFFFF'; ell(c, ex, ey, r * 0.2, r * 0.22);
    c.fillStyle = '#2A2733'; circ(c, ex + r * 0.05, ey + r * 0.02, r * 0.12);
    c.fillStyle = '#FFFFFF'; circ(c, ex + r * 0.1, ey - r * 0.05, r * 0.045);
  }
  c.fillStyle = '#E87A8F'; circ(c, hx + r * 0.82, hy + r * 0.02, r * 0.14);
  c.strokeStyle = 'rgba(60,40,30,0.5)'; c.lineWidth = r * 0.05; c.beginPath();
  c.moveTo(hx + r * 0.62, hy + r * 0.05); c.lineTo(hx + r * 1.28, hy - r * 0.12);
  c.moveTo(hx + r * 0.62, hy + r * 0.2); c.lineTo(hx + r * 1.28, hy + r * 0.32); c.stroke();
  if (o.milk) { c.fillStyle = '#FFFFFF'; ell(c, hx + r * 0.62, hy + r * 0.24, r * 0.3, r * 0.1); }
  if (o.crown) crown(c, hx - r * 0.1, hy - r * 1.05, r * 0.42);
  c.restore();
  if (o.dizzy) for (let i = 0; i < 3; i++) { const a = t * 6 + i * TAU / 3; star(c, x + Math.cos(a) * r * 0.95, y - r * 1.05 + Math.sin(a) * r * 0.25, r * 0.17, '#FFD23F', a); }
}
function drawCatBody(c, x, y, r, type, o) {
  const t = o.t || 0, anim = o.anim || 0;
  let body, stripe;
  if (type === 'C') { body = '#9A9AA6'; stripe = '#73737F'; } else if (type === 'H') { body = '#EC9A42'; stripe = '#C87424'; } else { body = '#454058'; stripe = '#2F2B3D'; }
  if (o.scared) { body = '#BFDCF5'; stripe = '#93B8DA'; }
  const trem = o.scared ? Math.sin(t * 40) * r * 0.05 : 0;
  const bob = o.moving && !o.asleep ? Math.abs(Math.sin(anim * 14)) * r * 0.1 : 0;
  c.save(); c.translate(x + trem, y - bob);
  if (o.alpha != null) c.globalAlpha = o.alpha;
  c.scale(o.face || 1, 1);
  c.strokeStyle = body; c.lineWidth = r * 0.28; c.lineCap = 'round';
  const wag = o.asleep ? 0 : Math.sin(t * 5 + x * 0.01) * 0.4;
  c.beginPath(); c.moveTo(-r * 0.9, r * 0.15); c.quadraticCurveTo(-r * 1.6, r * 0.25 + wag * r, -r * 1.75, -r * 0.7 + wag * r * 0.5); c.stroke();
  const step = o.moving && !o.asleep ? Math.sin(anim * 14) * r * 0.2 : 0;
  c.fillStyle = body; ell(c, -r * 0.5 + step, r * 0.95, r * 0.3, r * 0.16); ell(c, r * 0.5 - step, r * 0.95, r * 0.3, r * 0.16);
  ell(c, 0, r * 0.25, r * 1.15, r * 0.78);
  c.save(); c.beginPath(); c.ellipse(0, r * 0.25, r * 1.15, r * 0.78, 0, 0, TAU); c.clip();
  c.strokeStyle = stripe; c.lineWidth = r * 0.16;
  for (let i = -1; i <= 1; i++) { c.beginPath(); c.moveTo(i * r * 0.45 - r * 0.12, -r * 0.6); c.lineTo(i * r * 0.45 + r * 0.12, r * 0.3); c.stroke(); }
  c.restore();
  c.fillStyle = '#F4E6D6'; ell(c, r * 0.1, r * 0.55, r * 0.55, r * 0.3);
  const hx = r * 0.6, hy = -r * 0.35;
  c.fillStyle = body;
  tri(c, hx - r * 0.58, hy - r * 0.3, hx - r * 0.42, hy - r * 1.08, hx - r * 0.05, hy - r * 0.55);
  tri(c, hx + r * 0.08, hy - r * 0.55, hx + r * 0.42, hy - r * 1.08, hx + r * 0.6, hy - r * 0.3);
  c.fillStyle = o.scared ? '#E8B7C8' : '#F2B5C4';
  tri(c, hx - r * 0.48, hy - r * 0.42, hx - r * 0.4, hy - r * 0.9, hx - r * 0.18, hy - r * 0.55);
  tri(c, hx + r * 0.2, hy - r * 0.55, hx + r * 0.42, hy - r * 0.9, hx + r * 0.52, hy - r * 0.42);
  c.fillStyle = body; circ(c, hx, hy, r * 0.64);
  c.strokeStyle = stripe; c.lineWidth = r * 0.1; c.lineCap = 'round';
  c.beginPath(); c.moveTo(hx - r * 0.12, hy - r * 0.62); c.lineTo(hx - r * 0.08, hy - r * 0.36); c.moveTo(hx + r * 0.12, hy - r * 0.62); c.lineTo(hx + r * 0.08, hy - r * 0.36); c.stroke();
  const ex = hx + r * 0.22, ey = hy - r * 0.06;
  if (o.asleep) {
    c.strokeStyle = '#2A2733'; c.lineWidth = r * 0.07;
    c.beginPath(); c.arc(ex - r * 0.28, ey, r * 0.14, 0.15, Math.PI - 0.15); c.stroke();
    c.beginPath(); c.arc(ex + r * 0.14, ey, r * 0.14, 0.15, Math.PI - 0.15); c.stroke();
  } else if (o.scared) {
    c.fillStyle = '#FFFFFF'; circ(c, ex - r * 0.28, ey, r * 0.2); circ(c, ex + r * 0.14, ey, r * 0.2);
    c.fillStyle = '#2A2733'; circ(c, ex - r * 0.28, ey + r * 0.03, r * 0.07); circ(c, ex + r * 0.14, ey + r * 0.03, r * 0.07);
    c.strokeStyle = '#2A2733'; c.lineWidth = r * 0.07; c.beginPath(); c.arc(hx + r * 0.3, hy + r * 0.38, r * 0.12, Math.PI, 0); c.stroke();
  } else {
    c.fillStyle = type === 'B' ? '#FFD23F' : '#B9E86B';
    ell(c, ex - r * 0.28, ey, r * 0.17, r * 0.2); ell(c, ex + r * 0.14, ey, r * 0.17, r * 0.2);
    c.fillStyle = '#1B1A22'; ell(c, ex - r * 0.28, ey, r * 0.06, r * 0.17); ell(c, ex + r * 0.14, ey, r * 0.06, r * 0.17);
    c.strokeStyle = '#2A2733'; c.lineWidth = r * 0.06;
    c.beginPath(); c.arc(hx + r * 0.2, hy + r * 0.3, r * 0.1, 0.2, Math.PI - 0.2); c.arc(hx + r * 0.4, hy + r * 0.3, r * 0.1, 0.2, Math.PI - 0.2); c.stroke();
  }
  c.fillStyle = '#E98AA0'; tri(c, hx + r * 0.22, hy + r * 0.14, hx + r * 0.38, hy + r * 0.14, hx + r * 0.3, hy + r * 0.26);
  c.strokeStyle = 'rgba(40,30,40,0.5)'; c.lineWidth = r * 0.05; c.beginPath();
  c.moveTo(hx + r * 0.45, hy + r * 0.12); c.lineTo(hx + r * 1.0, hy - r * 0.02);
  c.moveTo(hx + r * 0.45, hy + r * 0.24); c.lineTo(hx + r * 1.0, hy + r * 0.32); c.stroke();
  if (type === 'B') crown(c, hx, hy - r * 1.05, r * 0.4);
  c.restore();
  if (o.asleep) { const ph = (t * 0.7) % 1; c.globalAlpha = 1 - ph; txt(c, 'z', x + r * 0.9 + ph * r * 0.4, y - r * 1.2 - ph * r * 0.9, r * 0.7, '#FFFFFF', 'center', 700, 'rgba(0,0,0,0.3)', r * 0.1); c.globalAlpha = 1; }
}

// ---------- background cache ----------
let scale = 1, offX = 0, offY = 0;
const bgCanvas = document.createElement('canvas'); const bgCtx = bgCanvas.getContext('2d');
const darkCanvas = document.createElement('canvas'); const darkCtx = darkCanvas.getContext('2d');
function resize() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.max(1, Math.round(window.innerWidth * dpr)); canvas.height = Math.max(1, Math.round(window.innerHeight * dpr));
  bgCanvas.width = darkCanvas.width = canvas.width; bgCanvas.height = darkCanvas.height = canvas.height;
  scale = Math.min(canvas.width / VW, canvas.height / VH);
  offX = (canvas.width - VW * scale) / 2; offY = (canvas.height - VH * scale) / 2;
  bgDirty = true;
}
function buildBg() {
  bgDirty = false;
  const p = LEVELS[S.level].pal; const c = bgCtx; const s = S.tile;
  c.setTransform(1, 0, 0, 1, 0, 0); c.fillStyle = p.bg; c.fillRect(0, 0, bgCanvas.width, bgCanvas.height);
  c.setTransform(scale, 0, 0, scale, offX, offY);
  rr(c, S.ox - 6, S.oy - 6, S.cols * s + 12, S.rows * s + 12, 14); c.fillStyle = p.wallDark; c.fill();
  for (let r = 0; r < S.rows; r++) for (let col = 0; col < S.cols; col++) {
    const x = S.ox + col * s, y = S.oy + r * s;
    if (S.grid[r][col] === 1) {
      c.fillStyle = p.wallDark; c.fillRect(x, y, s, s);
      c.fillStyle = p.wall; rr(c, x + 2, y + 2, s - 4, s - 4, s * 0.22); c.fill();
      c.fillStyle = p.wallLight; c.globalAlpha = 0.55; rr(c, x + 5, y + 4, s - 10, s * 0.3, s * 0.16); c.fill(); c.globalAlpha = 1;
    } else {
      c.fillStyle = (r + col) % 2 ? p.floorB : p.floorA; c.fillRect(x, y, s + 0.5, s + 0.5);
    }
  }
  for (const key of S.honey) {
    const r = Math.floor(key / S.cols), col = key % S.cols; const x = S.ox + col * s + s / 2, y = S.oy + r * s + s / 2;
    c.fillStyle = '#F2B33D'; ell(c, x, y, s * 0.42, s * 0.34); c.fillStyle = '#F7C95A'; ell(c, x + s * 0.1, y - s * 0.08, s * 0.22, s * 0.12);
    c.fillStyle = '#F2B33D'; circ(c, x - s * 0.36, y + s * 0.2, s * 0.09); circ(c, x + s * 0.4, y - s * 0.25, s * 0.07);
  }
  for (const b of S.beds) {
    const x = S.ox + b.c * s + s / 2, y = S.oy + b.r * s + s / 2;
    c.fillStyle = '#9C4A52'; ell(c, x, y + s * 0.08, s * 0.44, s * 0.3); c.fillStyle = '#C46A72'; ell(c, x, y + s * 0.06, s * 0.32, s * 0.18);
  }
  for (const r in S.tunnelRows) {
    const y = S.oy + r * s + s / 2;
    c.fillStyle = 'rgba(0,0,0,0.35)';
    ell(c, S.ox + s * 0.1, y, s * 0.22, s * 0.36); ell(c, S.ox + S.cols * s - s * 0.1, y, s * 0.22, s * 0.36);
  }
}

// ---------- render ----------
function render() {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  if (S.mode === 'title' || S.mode === 'ending') {
    drawTitleBg();
    ctx.setTransform(scale, 0, 0, scale, offX, offY);
    if (S.mode === 'title') drawTitle(); else drawEnding();
    return;
  }
  if (bgDirty) buildBg();
  ctx.drawImage(bgCanvas, 0, 0);
  ctx.setTransform(scale, 0, 0, scale, offX, offY);
  const L = LEVELS[S.level]; const s = S.tile; const t = S.t;
  const sx = S.shake > 0 ? rand(-1, 1) * S.shake * 9 : 0, sy = S.shake > 0 ? rand(-1, 1) * S.shake * 9 : 0;
  ctx.save(); ctx.translate(sx, sy);
  drawExit(); drawDoors();
  for (const ch of S.cheese.values()) drawCheese(ctx, S.ox + ch.c * s + s / 2, S.oy + ch.r * s + s / 2, s * (ch.gold ? 1.2 : 0.95), ch.gold, t, ch.phase);
  for (const it of S.items.values()) {
    const x = S.ox + it.c * s + s / 2, y = S.oy + it.r * s + s / 2;
    if (it.type === 'key') drawKey(ctx, x, y, s * 1.1, t, it.phase); else drawMilk(ctx, x, y, s * 1.25, t, it.phase);
  }
  for (let p = 0; p < 2; p++) {
    const m = S.mice[p]; if (!m) continue;
    const [x, y] = tileCenterPx(m.x, m.y);
    const jump = S.mode === 'cleared' ? Math.abs(Math.sin(S.modeT * 6)) * s * 0.35 : 0;
    const alpha = m.inv > 0 && Math.floor(m.inv * 10) % 2 === 0 ? 0.45 : 1;
    drawMouseBody(ctx, x, y - jump, s * 0.3, p, { face: m.face, moving: m.dir[0] || m.dir[1], anim: m.anim, t, milk: m.milk > 0, dizzy: m.dizzy > 0, alpha, crown: S.mode === 'cleared' && S.level === LEVELS.length - 1 });
    if (m.tag > 0) {
      ctx.globalAlpha = Math.min(1, m.tag);
      ctx.fillStyle = p === 0 ? '#E85D4A' : '#3F8FD9'; circ(ctx, x, y - s * 0.95, s * 0.2);
      txt(ctx, String(p + 1), x, y - s * 0.94, s * 0.26, '#FFFFFF');
      ctx.globalAlpha = 1;
    }
  }
  for (const cat of S.cats) {
    const [x, y] = tileCenterPx(cat.x, cat.y);
    drawCatBody(ctx, x, y, s * (cat.type === 'B' ? 0.42 : 0.35), cat.type, { face: cat.face, moving: (cat.dir[0] || cat.dir[1]) && cat.pause <= 0, anim: cat.anim, t, scared: cat.state === 'scared', asleep: cat.sleep > 0, alpha: cat.state === 'home' ? 0.5 : 1 });
  }
  for (const p of S.parts) {
    ctx.globalAlpha = Math.min(1, p.life * 2); ctx.fillStyle = p.col;
    if (p.kind === 'sq') ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    else if (p.kind === 'circ') circ(ctx, p.x, p.y, p.size * (1 + (0.5 - p.life)));
    else star(ctx, p.x, p.y, p.size * p.life, p.col, p.life * 4, 4, 0.4);
  }
  ctx.globalAlpha = 1;
  ctx.restore();
  if (L.dark) drawDarkness();
  for (const f of S.floats) { ctx.globalAlpha = Math.min(1, f.life); txt(ctx, f.text, f.x, f.y, 26, f.col, 'center', 700, 'rgba(0,0,0,0.45)', 5); }
  ctx.globalAlpha = 1;
  drawConfetti();
  drawHud();
  if (S.goT > 0 && S.mode === 'playing') {
    const k = S.goT / 1.4; ctx.globalAlpha = Math.min(1, k * 2);
    ctx.save(); ctx.translate(640, 380); const sc = 1 + (1 - k) * 0.6; ctx.scale(sc, sc);
    txt(ctx, 'Go!', 0, 0, 90, '#FFD23F', 'center', 700, '#3A1F2B', 16); ctx.restore(); ctx.globalAlpha = 1;
  }
  if (S.toast) drawToast();
  if (S.mode === 'intro') drawIntro();
  else if (S.mode === 'paused') drawPaused();
  else if (S.mode === 'cleared') drawCleared();
}
function drawDarkness() {
  const c = darkCtx; const s = S.tile; const t = S.t;
  c.setTransform(1, 0, 0, 1, 0, 0); c.globalCompositeOperation = 'source-over';
  c.fillStyle = 'rgba(8,6,18,0.94)'; c.fillRect(0, 0, darkCanvas.width, darkCanvas.height);
  c.setTransform(scale, 0, 0, scale, offX, offY);
  c.globalCompositeOperation = 'destination-out';
  const hole = (x, y, r, a) => {
    const g = c.createRadialGradient(x, y, r * 0.12, x, y, r);
    g.addColorStop(0, `rgba(0,0,0,${a})`); g.addColorStop(0.55, `rgba(0,0,0,${a * 0.75})`); g.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill();
  };
  for (const m of S.mice) { if (!m) continue; const [x, y] = tileCenterPx(m.x, m.y); hole(x, y, s * 4.1 + Math.sin(t * 9) * s * 0.1, 1); }
  for (const it of S.items.values()) hole(S.ox + it.c * s + s / 2, S.oy + it.r * s + s / 2, s * 1.2, 0.9);
  if (S.exit) hole(S.ox + S.exit.c * s + s / 2, S.oy + S.exit.r * s + s / 2, S.exitOpen ? s * 2.2 : s * 0.9, S.exitOpen ? 1 : 0.6);
  c.globalCompositeOperation = 'source-over';
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(darkCanvas, 0, 0); ctx.setTransform(scale, 0, 0, scale, offX, offY);
  for (const cat of S.cats) {
    if (cat.sleep > 0 || cat.state === 'home') continue;
    const [x, y] = tileCenterPx(cat.x, cat.y); const r = s * 0.35; const f = cat.face || 1;
    const ex = x + f * r * 0.82, ey = y - r * 0.41;
    ctx.fillStyle = cat.state === 'scared' ? '#FFFFFF' : cat.type === 'B' ? '#FFD23F' : '#B9E86B';
    ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = 12;
    ell(ctx, ex - f * r * 0.21, ey, r * 0.17, r * 0.21); ell(ctx, ex + f * r * 0.21, ey, r * 0.17, r * 0.21);
    ctx.shadowBlur = 0; ctx.shadowColor = 'transparent';
  }
}
function drawConfetti() {
  for (const cf of S.confetti) {
    ctx.save(); ctx.translate(cf.x, cf.y); ctx.rotate(cf.rot); ctx.fillStyle = cf.col; ctx.globalAlpha = Math.min(1, cf.life);
    ctx.fillRect(-cf.w / 2, -cf.h / 2, cf.w, cf.h); ctx.restore();
  }
  ctx.globalAlpha = 1;
}
function drawHud() {
  const L = LEVELS[S.level], p = L.pal;
  ctx.fillStyle = p.hud; ctx.fillRect(-offX / scale - 2, -offY / scale - 2, canvas.width / scale + 4, HUD_H + offY / scale + 2);
  ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.fillRect(-offX / scale - 2, HUD_H - 4, canvas.width / scale + 4, 4);
  ctx.fillStyle = p.wallLight; rr(ctx, 16, 14, 104, 36, 18); ctx.fill();
  txt(ctx, `Level ${S.level + 1}`, 68, 33, 20, p.hud, 'center', 700);
  txt(ctx, L.name, 134, 32, 26, '#FFF6E5', 'left', 700);
  drawCheese(ctx, 470, 32, 42, false, 0, 0);
  txt(ctx, `${S.cheeseTotal - S.cheeseLeft} / ${S.cheeseTotal}`, 500, 32, 26, '#FFF6E5', 'left', 700);
  const bw = 200, bx = 640, by = 24;
  ctx.fillStyle = 'rgba(0,0,0,0.3)'; rr(ctx, bx, by, bw, 16, 8); ctx.fill();
  const fr = S.cheeseTotal ? (S.cheeseTotal - S.cheeseLeft) / S.cheeseTotal : 0;
  if (fr > 0) { ctx.fillStyle = '#FFD23F'; rr(ctx, bx, by, Math.max(16, bw * fr), 16, 8); ctx.fill(); }
  if (S.exitOpen) txt(ctx, 'Run home!', bx + bw / 2, by + 8, 14, p.hud, 'center', 700);
  let rx = 880;
  for (let k = 0; k < S.keysTotal; k++) { ctx.globalAlpha = k < S.keys ? 1 : 0.28; drawKey(ctx, rx + k * 44, 32, 42, 0, 0); }
  ctx.globalAlpha = 1;
  if (!S.players[1]) txt(ctx, 'Mouse 2: W A S D or controller 2', VW - 20, 32, 16, 'rgba(255,246,229,0.65)', 'right', 500);
  else {
    for (let i = 0; i < 2; i++) { const x = VW - 70 + i * 40; ctx.fillStyle = i === 0 ? '#E85D4A' : '#3F8FD9'; circ(ctx, x, 32, 14); txt(ctx, String(i + 1), x, 33, 18, '#FFFFFF'); }
  }
}
function drawToast() {
  const a = Math.min(1, S.toast.life * 2);
  ctx.globalAlpha = a; ctx.font = `700 24px ${FONT}`; const w = ctx.measureText(S.toast.text).width + 48;
  ctx.fillStyle = 'rgba(20,12,24,0.75)'; rr(ctx, 640 - w / 2, HUD_H + 16, w, 46, 23); ctx.fill();
  txt(ctx, S.toast.text, 640, HUD_H + 39, 24, '#FFF6E5'); ctx.globalAlpha = 1;
}
function card(w, h, headColor) {
  rr(ctx, -w / 2, -h / 2, w, h, 30); ctx.fillStyle = '#FFF6E5';
  ctx.shadowColor = 'rgba(0,0,0,0.45)'; ctx.shadowBlur = 30; ctx.shadowOffsetY = 12; ctx.fill();
  ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
  if (headColor) { ctx.save(); rr(ctx, -w / 2, -h / 2, w, h, 30); ctx.clip(); ctx.fillStyle = headColor; ctx.fillRect(-w / 2, -h / 2, w, 92); ctx.restore(); }
}
function drawIntro() {
  const L = LEVELS[S.level]; const e = easeOutBack(Math.min(1, S.modeT / 0.45));
  ctx.fillStyle = 'rgba(20,12,24,0.5)'; fullRect(ctx);
  ctx.save(); ctx.translate(640, 392); ctx.scale(e, e);
  const w = 780, h = 380; card(w, h, L.pal.wall);
  txt(ctx, `Level ${S.level + 1} of ${LEVELS.length}`, -w / 2 + 38, -h / 2 + 32, 20, 'rgba(255,255,255,0.85)', 'left', 500);
  txt(ctx, L.name, -w / 2 + 38, -h / 2 + 64, 40, '#FFFFFF', 'left', 700);
  let y = -h / 2 + 132;
  for (const line of wrapText(L.news, w - 80, 27)) { txt(ctx, line, -w / 2 + 40, y, 27, '#3A2A2E', 'left', 500); y += 35; }
  y += 8;
  for (const line of wrapText('Tip: ' + L.tip, w - 80, 20)) { txt(ctx, line, -w / 2 + 40, y, 20, '#8A6F75', 'left', 500); y += 26; }
  const types = [...new Set(S.cats.map(c => c.type))];
  let cx = -w / 2 + 76; const cy = h / 2 - 86;
  if (types.length) for (const ty of types) {
    drawCatBody(ctx, cx, cy - 4, 22, ty, { face: 1, t: S.t, anim: S.t, moving: true });
    txt(ctx, CAT_INFO[ty].name, cx + 44, cy - 12, 18, '#3A2A2E', 'left', 700);
    txt(ctx, CAT_INFO[ty].blurb, cx + 44, cy + 10, 15, '#8A6F75', 'left', 500);
    cx += 200;
  } else {
    drawMouseBody(ctx, cx, cy - 4, 22, 0, { face: 1, t: S.t, moving: true, anim: S.t });
    drawMouseBody(ctx, cx + 70, cy - 4, 22, 1, { face: -1, t: S.t, moving: true, anim: S.t + 0.4 });
    txt(ctx, 'No cats here yet. Enjoy the snacks!', cx + 118, cy, 17, '#8A6F75', 'left', 500);
  }
  ctx.globalAlpha = 0.7 + 0.3 * Math.sin(S.t * 4);
  txt(ctx, 'Press Enter or A to start', w / 2 - 38, h / 2 - 32, 24, L.pal.wallDark, 'right', 700);
  ctx.globalAlpha = 1; ctx.restore();
}
function drawPaused() {
  ctx.fillStyle = 'rgba(20,12,24,0.55)'; fullRect(ctx);
  ctx.save(); ctx.translate(640, 380); card(560, 240, null);
  txt(ctx, 'Paused', 0, -60, 48, '#3A2A2E');
  txt(ctx, 'A, B or Enter: keep playing', 0, 10, 24, '#5A4A4E', 'center', 500);
  txt(ctx, 'Backspace: back to the menu  ·  hold B: arcade', 0, 48, 20, '#8A6F75', 'center', 500);
  ctx.restore();
}
function drawCleared() {
  const t = S.modeT; const e = easeOutBack(Math.min(1, t / 0.5));
  ctx.fillStyle = 'rgba(20,12,24,0.45)'; fullRect(ctx);
  ctx.save(); ctx.translate(640, 370); ctx.scale(e, e);
  const w = 700, h = 390; card(w, h, null);
  txt(ctx, 'Level cleared!', 0, -h / 2 + 62, 54, '#FFD23F', 'center', 700, '#3A1F2B', 12);
  for (let k = 0; k < 3; k++) {
    const x = (k - 1) * 100, y = -30;
    if (k < S.starsShown) {
      const pt = Math.min(1, (t - [0.6, 0.95, 1.3][k]) / 0.35); const sc = easeOutBack(pt);
      ctx.save(); ctx.translate(x, y); ctx.scale(sc, sc); star(ctx, 0, 0, 44, '#FFD23F'); star(ctx, 0, -4, 30, '#FFE58A'); ctx.restore();
    } else { star(ctx, x, y, 44, 'rgba(58,42,46,0.12)'); }
  }
  txt(ctx, `${S.cheeseTotal} cheese eaten`, 0, 58, 26, '#3A2A2E', 'center', 500);
  const bonkLine = S.bonks === 0 ? 'Not caught once. Wow!' : S.bonks === 1 ? 'Caught just once. Nice!' : `Caught ${S.bonks} times, still a win!`;
  txt(ctx, bonkLine + (S.catsBonked ? `  ·  Cats bonked: ${S.catsBonked}` : ''), 0, 94, 20, '#8A6F75', 'center', 500);
  const last = S.level >= LEVELS.length - 1;
  ctx.globalAlpha = t > 1.2 ? 0.7 + 0.3 * Math.sin(t * 4) : 0;
  txt(ctx, last ? 'Press Enter or A to celebrate!' : 'Press Enter or A for the next level', 0, h / 2 - 44, 24, '#A33F45', 'center', 700);
  ctx.globalAlpha = 1; ctx.restore();
}
const TSTARS = Array.from({ length: 46 }, () => ({ x: rand(0, VW), y: rand(0, 430), r: rand(1, 2.6), ph: rand(0, TAU) }));
function drawTitleBg() {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = '#2B2140'; ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.setTransform(scale, 0, 0, scale, offX, offY);
  const g = ctx.createLinearGradient(0, 0, 0, VH); g.addColorStop(0, '#2B2140'); g.addColorStop(0.7, '#4A2A3C'); g.addColorStop(1, '#6B3B2E');
  ctx.fillStyle = g; fullRect(ctx);
  for (const s of TSTARS) { ctx.globalAlpha = 0.45 + 0.45 * Math.sin(S.t * 2 + s.ph); ctx.fillStyle = '#FFF1C8'; circ(ctx, s.x, s.y, s.r); }
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#5B3B1E'; ctx.fillRect(-offX / scale - 2, 600, canvas.width / scale + 4, (canvas.height - offY) / scale);
  ctx.fillStyle = '#7A5230'; ctx.fillRect(-offX / scale - 2, 600, canvas.width / scale + 4, 10);
}
function drawTitle() {
  const t = S.t;
  ctx.save(); ctx.translate(640, 150); ctx.rotate(Math.sin(t * 1.5) * 0.06); drawCheese(ctx, 0, 0, 230, false, 0, 0); ctx.restore();
  const title = 'CHEESE CHASE'; ctx.font = `700 92px ${FONT}`;
  let total = 0; const widths = [...title].map(ch => { const w = ctx.measureText(ch).width; total += w; return w; });
  let x = 640 - total / 2;
  [...title].forEach((ch, i) => { const y = 288 + Math.sin(t * 2.2 + i * 0.55) * 7; txt(ctx, ch, x + widths[i] / 2, y, 92, i < 6 ? '#FFD23F' : '#FFF6E5', 'center', 700, '#3A1F2B', 16); x += widths[i]; });
  txt(ctx, 'Two mice. One house. All the cheese.', 640, 348, 26, '#F3CFE0', 'center', 500);
  const n = LEVELS.length, gap = 92, x0 = 640 - (n - 1) * gap / 2, yb = 452;
  txt(ctx, `Level ${S.sel + 1}  ·  ${LEVELS[S.sel].name}`, 640, 396, 28, '#FFF6E5');
  for (let i = 0; i < n; i++) {
    const bx = x0 + i * gap, unlocked = i <= save.unlocked, sel = i === S.sel;
    const r = sel ? 33 + Math.sin(t * 5) * 2 : 28;
    if (sel) { ctx.strokeStyle = '#FFF6E5'; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(bx, yb, r + 7, 0, TAU); ctx.stroke(); }
    ctx.fillStyle = unlocked ? LEVELS[i].pal.wall : '#4B4356'; circ(ctx, bx, yb, r);
    ctx.fillStyle = unlocked ? LEVELS[i].pal.wallLight : '#5A5265'; ell(ctx, bx, yb - r * 0.38, r * 0.62, r * 0.32);
    if (unlocked) txt(ctx, String(i + 1), bx, yb + 3, 30, '#FFF6E5', 'center', 700, 'rgba(0,0,0,0.35)', 5);
    else drawLock(ctx, bx, yb + 2, 24);
    for (let k = 0; k < 3; k++) star(ctx, bx - 18 + k * 18, yb + 50, 8, k < save.stars[i] ? '#FFD23F' : 'rgba(255,255,255,0.18)');
  }
  txt(ctx, '◀  ▶  pick a level', 640, 522, 17, 'rgba(255,246,229,0.6)', 'center', 500);
  ctx.globalAlpha = 0.7 + 0.3 * Math.sin(t * 4);
  txt(ctx, 'Press Enter or A to play', 640, 556, 30, '#FFD23F', 'center', 700, '#3A1F2B', 7);
  ctx.globalAlpha = 1;
  const mx = 640 + Math.sin(t * 0.7) * 230, face = Math.cos(t * 0.7) >= 0 ? 1 : -1;
  drawMouseBody(ctx, mx, 616, 30, 0, { face, moving: true, anim: t, t });
  if (S.players[1]) drawMouseBody(ctx, mx - 86 * face, 616, 30, 1, { face, moving: true, anim: t + 0.3, t });
  txt(ctx, S.players[1] ? 'Mouse 2 is in!' : 'Mouse 2: press W A S D or a button on controller 2 to join', 640, 672, 18, 'rgba(255,246,229,0.75)', 'center', 500);
  drawCheese(ctx, 1096, 40, 40, false, 0, 0); txt(ctx, `${save.eaten} eaten`, 1124, 40, 22, '#FFF6E5', 'left', 500);
  txt(ctx, FAMILY ? 'Move with arrows or ✛ · A / Enter to go · B / Escape to pause · Share the cheese!' : '🎮 ✛ move · A go · B pause · pad 2 = Mouse 2   ·   Keys: Arrows or W A S D · Enter · P pause · F fullscreen · M sound', 640, 703, 15, 'rgba(255,246,229,0.55)', 'center', 500);
}
function drawEnding() {
  const t = S.modeT;
  drawConfetti();
  txt(ctx, 'You cleared the whole house!', 640, 170 + Math.sin(t * 2) * 6, 56, '#FFD23F', 'center', 700, '#3A1F2B', 12);
  txt(ctx, 'Every cheese is gone and the cats are fast asleep.', 640, 236, 26, '#F3CFE0', 'center', 500);
  ctx.save(); ctx.translate(640, 400); ctx.rotate(Math.sin(t * 1.2) * 0.08); drawCheese(ctx, 0, 0, 280, true, t, 0); ctx.restore();
  const jump = Math.abs(Math.sin(t * 5)) * 36;
  drawMouseBody(ctx, 450, 560 - jump, 36, 0, { face: 1, moving: true, anim: t, t, crown: true });
  drawMouseBody(ctx, 830, 560 - Math.abs(Math.sin(t * 5 + 1)) * 36, 36, 1, { face: -1, moving: true, anim: t + 0.5, t, crown: true });
  txt(ctx, `Cheese eaten so far: ${save.eaten}`, 640, 640, 24, '#FFF6E5', 'center', 500);
  ctx.globalAlpha = t > 1 ? 0.7 + 0.3 * Math.sin(t * 4) : 0;
  txt(ctx, 'Press Enter or A to play any level again', 640, 686, 22, '#FFD23F', 'center', 700, '#3A1F2B', 5);
  ctx.globalAlpha = 1;
}

// ---------- main loop ----------
let last = 0;
function frame(ts) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, last ? (ts - last) / 1000 : 0.016); last = ts;
  try {
    familyTick(dt);
    render();
  } catch (e) { if (!window.__CC_err) { window.__CC_err = e; console.error('Cheese Chase error:', e); } }
}
window.addEventListener('resize', resize);
resize();
if (document.fonts && document.fonts.load) document.fonts.load('700 40px Fredoka').catch(() => {});
window.__CC = { S, LEVELS, save, startLevel, update, readInputs, beginPlay, stepMover, openFor, bfsDist, render, keys, pressed };
requestAnimationFrame(frame);

if (FAMILY) {
  const sounds=[], fields=Object.keys(S).filter(k=>!['cheese','items','honey','muted','cats'].includes(k));
  for(const key of Object.keys(SFX)){const fn=SFX[key];SFX[key]=(...args)=>{if(FAMILY.role==='host'&&sounds.length<24)sounds.push([key,args]);fn(...args);};}
  FAMILY.register({
    start(){S.players=[true,true];startLevel(save.unlocked);}, connection:familyConnection, unlock:initAudio,input(){},action:familyAction,
    snapshot(){const state={};for(const key of fields)state[key]=S[key];state.cheese=[...S.cheese];state.items=[...S.items];state.honey=[...S.honey];state.cats=S.cats.map(({homeDist,...cat})=>cat);return {state,progress:save,sounds:sounds.splice(0),menu:S.mode!=='playing'};},
    apply(v){
      if(!v?.state)return;
      const old=S.mice.map(m=>m&&({...m})), level=S.level, mode=S.mode, doors=JSON.stringify(S.doors.map(d=>d.open));
      for(const key of fields)if(key in v.state)S[key]=v.state[key];
      S.cheese=new Map(v.state.cheese);S.items=new Map(v.state.items);S.honey=new Set(v.state.honey);S.cats=v.state.cats;
      if(level!==S.level||doors!==JSON.stringify(S.doors.map(d=>d.open))||!bgCanvas.width)bgDirty=true;
      if(level===S.level&&mode===S.mode&&S.mode==='playing')familyBlend(old,S.mice,3);else familyTargets=[];
      if(v.progress){const before=JSON.stringify(save);save.unlocked=Math.max(save.unlocked,v.progress.unlocked);save.eaten=Math.max(save.eaten,v.progress.eaten);save.stars=save.stars.map((n,i)=>Math.max(n,v.progress.stars[i]||0));if(JSON.stringify(save)!==before)persist();}
      for(const [key,args] of v.sounds||[])if(Object.hasOwn(SFX,key))SFX[key](...args);
      musicTick();
    }
  });
}
})();
