(() => {
'use strict';

// ---------- setup ----------

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
  if (action === 'pause') { S.paused = true; return; }
  if (FAMILY.ready && ['A','B','start','X','left','right','up','down'].includes(action)) familyActions.add(action);
}
function familyTick(dt) {
  if (!FAMILY) { update(dt); return; }
  if (FAMILY.role === 'guest') {
    const f = 1 - Math.exp(-24 * dt);
    for (const [actor, x, y] of familyTargets) { actor.x += (x - actor.x) * f; if (y != null) actor.y += (y - actor.y) * f; }
    return;
  }
  if (!FAMILY.ready) return;
  familyAccumulator = Math.min(familyAccumulator + dt, 0.05);
  let n = 0;
  while (familyAccumulator >= 1 / 120 && n++ < 6) {
    update(1 / 120);
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

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d', { alpha: false });
const fsBtn = document.getElementById('fs');
if(FAMILY)fsBtn.style.display='none';
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const FONT = '"Baloo 2", "Nunito", "Segoe UI", system-ui, sans-serif';
const TAU = Math.PI * 2;
const VH = 900;
let VW = 1600, dpr = 1, scale = 1, offX = 0, offY = 0, cssW = 0, cssH = 0;
const TOP = 120, PAD = 44;

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rand = (a, b) => a + Math.random() * (b - a);
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
const dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);

function resize() {
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  cssW = window.innerWidth; cssH = window.innerHeight;
  canvas.width = Math.round(cssW * dpr); canvas.height = Math.round(cssH * dpr);
  scale = cssH / VH;
  VW = FAMILY ? 1600 : clamp(cssW / scale, 1100, 2200);
  if (VW * scale > cssW) scale = cssW / VW;
  offX = (cssW - VW * scale) / 2; offY = (cssH - VH * scale) / 2;
}

// ---------- story & levels ----------
const LEVELS = [
  { name: 'The Asteroid Field', goal: { type: 'collect', n: 8 },
    planet: { x: 0.84, y: 0.6, r: 260, c1: '#C97B4A', c2: '#8F4F2C' },
    asteroids: { n: 5, min: 40, max: 90, r: [26, 44] },
    intro: [
      ['Moon', 'Pip, wake up! My lantern broke and its pieces flew all across the sky.'],
      ['Pip', 'Without your light, the kids on Earth can\'t find their way home!'],
      ['Moon', 'Take the old rocket, the Lumen. The first pieces drifted into the asteroid field.'],
      ['Pip', 'Hold on, Moon. I\'ll bring back every single piece!'],
    ],
    outro: 'Great flying, Pip! The asteroids never even saw you coming.' },
  { name: 'Comet Alley', goal: { type: 'collect', n: 10 },
    planet: { x: 0.14, y: 0.32, r: 170, c1: '#5A7BD6', c2: '#2F4A9E' },
    asteroids: { n: 3, min: 40, max: 80, r: [24, 40] }, comets: { every: 1.9, speed: 640 }, shields: true,
    intro: [
      ['Moon', 'Careful now. Comets race through this alley without ever looking.'],
      ['Pip', 'I see shield bubbles floating around. One of those can take a hit for me!'],
      ['Moon', 'Ten pieces, Pip. Quick and clever.'],
    ],
    outro: 'Phew! Those comets were fast, but you were faster.' },
  { name: 'The Jellyfish Nebula', goal: { type: 'collect', n: 12 },
    planet: { x: 0.5, y: -0.25, r: 320, c1: '#C96BB0', c2: '#7B3F78' }, nebula: true,
    asteroids: { n: 2, min: 30, max: 60, r: [24, 36] }, jellies: { n: 3, speed: 78 }, shields: true,
    intro: [
      ['Pip', 'Moon, this nebula is full of space jellyfish. They look kind of friendly...'],
      ['Moon', 'They are friendly! They just want hugs. Very zappy hugs.'],
      ['Pip', 'Okay. No hugs. Twelve pieces, then straight out.'],
    ],
    outro: 'The jellyfish waved goodbye. At least, Pip thinks that was a wave.' },
  { name: 'The Ringed Giant', goal: { type: 'rings', n: 6 },
    planet: { x: 0.5, y: 0.58, r: 230, c1: '#E0B36A', c2: '#9C6F2E', ring: true },
    asteroids: { n: 6, min: 70, max: 140, r: [22, 40] },
    intro: [
      ['Moon', 'A piece is hidden in the giant\'s rings. Fly through each glowing ring, one after the other.'],
      ['Pip', 'Six rings? That\'s a race track in the sky!'],
      ['Moon', 'There is debris everywhere. Keep your eyes open.'],
    ],
    outro: 'Six rings, zero crashes. Even the giant looked impressed.' },
  { name: 'Shadow Storm', goal: { type: 'survive', n: 40 },
    planet: null, dark: true, meteors: { every: 0.3, speed: 700 }, shields: true,
    intro: [
      ['Moon', 'Pip... it\'s getting dark out there. My light is almost gone.'],
      ['Pip', 'A meteor storm! I can barely see. I\'ll just have to hold on.'],
      ['Moon', 'Forty seconds. Then it passes. I believe in you.'],
    ],
    outro: 'The storm passed. Pip is still here, a little dusty but smiling.' },
  { name: 'The Grumpy Comet', goal: { type: 'boss', n: 6 },
    planet: { x: 0.86, y: 0.82, r: 200, c1: '#6BC9B0', c2: '#2E7A66' }, boss: { speed: 170 },
    intro: [
      ['Moon', 'The last pieces... a grumpy comet took them. It hates being alone.'],
      ['Pip', 'So it bounces around angry? I know that feeling.'],
      ['Moon', 'Each spark you collect will calm it down. Six sparks, and it will let the pieces go.'],
      ['Pip', 'Here goes. Be nice, comet!'],
    ],
    outro: 'The comet stopped grumbling and gave back every piece. It even smiled.' },
];
const ENDING = [
  ['Moon', 'You did it, Pip. My lantern is whole again!'],
  ['Pip', 'Look! The whole sky is shining.'],
  ['Moon', 'Every kid on Earth can find their way home now. Thank you, little robot.'],
  ['Pip', 'Anytime, Moon. Anytime.'],
];

// ---------- state ----------
const S = {
  mode: 'title', paused: false, muted: false, t: 0,
  levelIdx: 0, unlocked: 0, sel: 0,
  hearts: 3, shield: false, progress: 0, pieces: 0, shake: 0,
  ship2: null,
  ship: { x: 0, y: 0, vx: 0, vy: 0, inv: 0, dash: 0, tilt: 0 },
  shards: [], asteroids: [], comets: [], jellies: [], meteors: [], pickups: [], parts: [], floats: [],
  ring: null, ringList: [], boss: null, spark: null,
  story: null, toast: null, timers: { comet: 0, meteor: 0, pickup: 0 },
};
try { S.unlocked = clamp(parseInt(ArcadeProfile.storage.getItem('pip-unlocked') || '0', 10) || 0, 0, LEVELS.length - 1); } catch (e) {}
function saveUnlocked() { try { ArcadeProfile.storage.setItem('pip-unlocked', String(S.unlocked)); } catch (e) {} }
const lv = () => LEVELS[S.levelIdx];

const starLayers = [0.15, 0.35, 0.7].map(sp => ({ sp, pts: Array.from({ length: 70 }, () => ({ x: Math.random(), y: Math.random(), r: rand(0.8, 2.6) * (0.5 + sp), tw: rand(0, TAU) })) }));

// ---------- input ----------
const keys = {};
const pressed = new Set();
window.addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT') return;
  if (e.repeat) return;
  keys[e.code] = true; pressed.add(e.code);
  if (e.code === 'KeyF') toggleFs();
  if (e.code === 'KeyM') S.muted = !S.muted;
  if (e.code === 'KeyP') togglePause();   // Escape is handled through inp.back (pause in play, back on menus)
  if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space'].includes(e.code)) e.preventDefault();
  initAudio();
});
window.addEventListener('keyup', e => { keys[e.code] = false; });
window.addEventListener('blur', () => { for (const k in keys) keys[k] = false; });
canvas.addEventListener('pointerdown', () => { initAudio(); if (S.mode !== 'play') pressed.add('Enter'); });
window.addEventListener('gamepadconnected', e => { S.toast = { text: `Controller ${e.gamepad.index + 1} connected`, life: 2.5 }; });

function readInput() {
  const inp = { mx: 0, my: 0, a: false, pause: false, back: false, left: false, right: false };
  if (keys.ArrowLeft || keys.KeyA) inp.mx -= 1;
  if (keys.ArrowRight || keys.KeyD) inp.mx += 1;
  if (keys.ArrowUp || keys.KeyW) inp.my -= 1;
  if (keys.ArrowDown || keys.KeyS) inp.my += 1;
  if (pressed.has('Enter') || pressed.has('Space')) inp.a = true;
  if (pressed.has('Escape')) inp.back = true;
  if (pressed.has('ArrowLeft') || pressed.has('KeyA')) inp.left = true;
  if (pressed.has('ArrowRight') || pressed.has('KeyD')) inp.right = true;
  // Controller via the shared standard (AGENTS.md §9); the first pad is the player.
  // D-pad or left stick = fly, A = confirm / dash, B = back (menus) or pause-resume (play), Start = pause-resume.
  const pads = GamepadStd.read('game');
  if (pads.length) {
    const p = pads[0];
    let ax = p.ax, ay = p.ay;                   // analog stick (deadzone handled by GamepadStd)
    if (p.left && ax > -0.5) ax = -1;           // d-pad gives full speed when the stick is centred
    if (p.right && ax < 0.5) ax = 1;
    if (p.up && ay > -0.5) ay = -1;
    if (p.down && ay < 0.5) ay = 1;
    inp.mx = clamp(inp.mx + ax, -1, 1); inp.my = clamp(inp.my + ay, -1, 1);
    const nav = GamepadStd.navRepeat(p, 'game');   // level select: 350 ms delay, then repeat
    if (nav.left) inp.left = true;
    if (nav.right) inp.right = true;
    if (p.just.A) inp.a = true;
    if (p.just.start) inp.pause = true;
    if (p.just.B) inp.back = true;
    if (p.any) initAudio();
  }
  if (FAMILY) {
    const p=familyRemote();
    inp.buddy={mx:Number(!!p.right)-Number(!!p.left),my:Number(!!p.down)-Number(!!p.up),a:familyActions.has('A')||familyActions.has('X')};
    inp.pause ||= familyActions.has('start');inp.back ||= familyActions.has('B');
    if(S.mode!=='play'){inp.a ||= familyActions.has('A');inp.left ||= familyActions.has('left');inp.right ||= familyActions.has('right');}
    if(S.paused && (inp.a||inp.buddy.a)){S.paused=false;inp.a=inp.buddy.a=false;}
    familyActions.clear();
  }
  pressed.clear();
  return inp;
}

// ---------- audio ----------
let actx = null;
function initAudio() {
  try { if (!actx) actx = new (window.AudioContext || window.webkitAudioContext)(); if (actx.state === 'suspended') actx.resume(); } catch (e) {}
}
function tone(f0, f1, dur, type, vol, delay) {
  if (!actx || S.muted || actx.state !== 'running') return;
  try {
    const o = actx.createOscillator(), g = actx.createGain(), t = actx.currentTime + (delay || 0);
    o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g).connect(actx.destination); o.start(t); o.stop(t + dur);
  } catch (e) {}
}
const sfx = {
  shard: () => { tone(880, 1320, 0.1, 'sine', 0.22); tone(1320, 1760, 0.14, 'sine', 0.18, 0.07); },
  ring: () => { tone(660, 990, 0.14, 'triangle', 0.22); tone(990, 1320, 0.18, 'triangle', 0.18, 0.1); },
  hit: () => { tone(200, 60, 0.35, 'sawtooth', 0.24); },
  shieldPop: () => tone(900, 300, 0.25, 'square', 0.14),
  pickup: () => { tone(500, 1000, 0.18, 'sine', 0.2); },
  dash: () => tone(300, 700, 0.12, 'square', 0.08),
  blip: () => tone(700, 900, 0.05, 'square', 0.05),
  next: () => { tone(523, 659, 0.1, 'sine', 0.18); },
  clear: () => { [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, f, 0.22, 'triangle', 0.24, i * 0.11)); },
  dead: () => { [392, 349, 311, 262].forEach((f, i) => tone(f, f * 0.9, 0.3, 'triangle', 0.2, i * 0.18)); },
  calm: () => { tone(440, 330, 0.3, 'sine', 0.2); tone(330, 262, 0.4, 'sine', 0.2, 0.2); },
  spark: () => { tone(1047, 1568, 0.12, 'sine', 0.22); tone(1568, 2093, 0.16, 'sine', 0.18, 0.08); },
};

// ---------- flow ----------
function togglePause() { if (S.mode === 'play') S.paused = !S.paused; }
function startStory(lines, next) { S.story = { lines, idx: 0, shown: 0, next }; S.mode = 'story'; }

function loadLevel(i) {
  S.levelIdx = i; const L = lv();
  S.hearts = 3; S.shield = false; S.progress = 0; S.shake = 0; S.paused = false;
  Object.assign(S.ship, { x: VW * 0.25, y: VH * 0.55, vx: 0, vy: 0, inv: 1.2, dash: 0, tilt: 0 });
  if(FAMILY) S.ship2 = { ...S.ship, x: VW * 0.4 };
  S.shards = []; S.asteroids = []; S.comets = []; S.jellies = []; S.meteors = []; S.pickups = []; S.parts = []; S.floats = [];
  S.ring = null; S.ringList = []; S.boss = null; S.spark = null;
  S.timers = { comet: 1.5, meteor: 0.8, pickup: 6 };
  if (L.asteroids) for (let k = 0; k < L.asteroids.n; k++) spawnAsteroid(L.asteroids, true);
  if (L.jellies) for (let k = 0; k < L.jellies.n; k++) S.jellies.push({ x: rand(VW * 0.55, VW - 80), y: rand(TOP + 60, VH - 80), phase: rand(0, TAU) });
  if (L.goal.type === 'rings') {
    for (let k = 0; k < L.goal.n; k++) S.ringList.push({ x: VW * (0.18 + 0.64 * ((k * 0.37) % 1)), y: TOP + 90 + ((k * 0.61) % 1) * (VH - TOP - 200), r: 92 });
    S.ring = S.ringList[0];
  }
  if (L.goal.type === 'boss') S.boss = { x: VW * 0.75, y: VH * 0.4, vx: L.boss.speed, vy: L.boss.speed * 0.7, r: 62, speed: L.boss.speed, calm: 0, face: 0 };
  S.mode = 'play';
}
function clearLevel() {
  sfx.clear(); S.mode = 'cleared';
  if (S.levelIdx + 1 > S.unlocked) { S.unlocked = Math.min(LEVELS.length - 1, S.levelIdx + 1); saveUnlocked(); }
  if (!reduceMotion) confetti(80);
}
function die() { sfx.dead(); S.mode = 'dead'; }

// ---------- spawning ----------
function localShip() { return FAMILY?.role === 'guest' && S.ship2 ? S.ship2 : S.ship; }
function ships() { return S.ship2 ? [S.ship,S.ship2] : [S.ship]; }
function nearShip(x,y,r) { return ships().some(sh=>dist(x,y,sh.x,sh.y)<r); }
function hitShips(x,y,r) { for(const sh of ships())if(dist(x,y,sh.x,sh.y)<r)hurt(x,y,sh); }
function farFromShip(x, y, d) { return ships().every(sh=>dist(x,y,sh.x,sh.y)>d); }
function randPos(margin) { return [rand(margin, VW - margin), rand(TOP + margin, VH - margin)]; }
function spawnAsteroid(cfg, anywhere) {
  let x, y, tries = 0;
  do { [x, y] = randPos(50); tries++; } while (!farFromShip(x, y, 260) && tries < 20);
  const r = rand(cfg.r[0], cfg.r[1]), sp = rand(cfg.min, cfg.max), a = rand(0, TAU);
  S.asteroids.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, r, rot: rand(0, TAU), spin: rand(-1, 1),
    verts: Array.from({ length: 8 }, (_, i) => { const t = (i / 8) * TAU, k = rand(0.7, 1.05); return [Math.cos(t) * k, Math.sin(t) * k]; }) });
}
function spawnShard() {
  let x, y, tries = 0;
  do { [x, y] = randPos(70); tries++; } while (!farFromShip(x, y, 220) && tries < 20);
  const a = rand(0, TAU), sp = rand(15, 45);
  S.shards.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, rot: rand(0, TAU), r: 20 });
}
function spawnSpark() {
  let x, y, tries = 0;
  do { [x, y] = randPos(80); tries++; } while ((!farFromShip(x, y, 200) || (S.boss && dist(x, y, S.boss.x, S.boss.y) < 300)) && tries < 30);
  S.spark = { x, y, rot: 0, r: 22 };
}
function spawnPickup() {
  let x, y, tries = 0;
  do { [x, y] = randPos(70); tries++; } while (!farFromShip(x, y, 200) && tries < 20);
  S.pickups.push({ x, y, r: 22, life: 9 });
}
function burst(x, y, color, n, sp) {
  for (let i = 0; i < n; i++) { const a = rand(0, TAU), v = rand(60, sp || 320); S.parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: rand(0.3, 0.8), color, r: rand(3, 7) }); }
}
function confetti(n) {
  const cols = ['#7FE7FF', '#FFE27A', '#FF8AD8', '#B8FF9A', '#FFFFFF'];
  for (let i = 0; i < n; i++) S.parts.push({ x: rand(0, VW), y: rand(-40, 0), vx: rand(-60, 60), vy: rand(80, 220), life: rand(1.5, 2.6), color: pick(cols), r: rand(4, 9), sq: true });
}
function floatText(x, y, text, color, size) { S.floats.push({ x, y, text, color, size: size || 34, life: 1 }); }

// ---------- update ----------
function hurt(x, y, sh = S.ship) {
  if (sh.inv > 0) return;
  if (S.shield) { S.shield = false; sh.inv = 0.9; if(FAMILY)for(const teammate of ships())teammate.inv=Math.max(teammate.inv,0.9); sfx.shieldPop(); burst(sh.x, sh.y, '#7FE7FF', 18); floatText(sh.x, sh.y - 50, 'Shield!', '#7FE7FF'); return; }
  S.hearts--; sh.inv = 1.6;
  if(FAMILY)for(const teammate of ships())teammate.inv=Math.max(teammate.inv,1.6); sfx.hit(); burst(sh.x, sh.y, '#FF8A5C', 16);
  if (!reduceMotion) S.shake = 0.35;
  const dx = sh.x - x, dy = sh.y - y, d = Math.hypot(dx, dy) || 1;
  sh.vx += dx / d * 420; sh.vy += dy / d * 420;
  if (S.hearts <= 0) die();
}
function bounce(o, r) {
  if (o.x < r) { o.x = r; o.vx = Math.abs(o.vx); } if (o.x > VW - r) { o.x = VW - r; o.vx = -Math.abs(o.vx); }
  if (o.y < TOP + r) { o.y = TOP + r; o.vy = Math.abs(o.vy); } if (o.y > VH - r) { o.y = VH - r; o.vy = -Math.abs(o.vy); }
}

function moveShip(sh, inp, dt) {
  // ship physics
  const ACC = 2100, MAX = 540;
  sh.vx += inp.mx * ACC * dt; sh.vy += inp.my * ACC * dt;
  const damp = Math.max(0, 1 - 4.2 * dt); sh.vx *= damp; sh.vy *= damp;
  const spd = Math.hypot(sh.vx, sh.vy); if (spd > MAX) { sh.vx *= MAX / spd; sh.vy *= MAX / spd; }
  sh.dash = Math.max(0, sh.dash - dt);
  if (inp.a && sh.dash <= 0) {
    let dx = inp.mx, dy = inp.my; if (!dx && !dy) { dx = sh.vx || 1; dy = sh.vy; }
    const d = Math.hypot(dx, dy) || 1; sh.vx += dx / d * 820; sh.vy += dy / d * 820;
    sh.dash = 1.1; sh.inv = Math.max(sh.inv, 0.25); sfx.dash();
    for (let i = 0; i < 10; i++) S.parts.push({ x: sh.x, y: sh.y, vx: -dx / d * rand(100, 300), vy: -dy / d * rand(100, 300), life: 0.4, color: '#7FE7FF', r: rand(3, 6) });
  }
  sh.x = clamp(sh.x + sh.vx * dt, PAD, VW - PAD); sh.y = clamp(sh.y + sh.vy * dt, TOP + 20, VH - PAD);
  sh.inv = Math.max(0, sh.inv - dt);
  sh.tilt += ((sh.vx / MAX) * 0.35 - sh.tilt) * Math.min(1, dt * 8);
  if (Math.hypot(sh.vx, sh.vy) > 40 && Math.random() < 0.6) S.parts.push({ x: sh.x - sh.vx * 0.03, y: sh.y + 22, vx: -sh.vx * 0.3 + rand(-30, 30), vy: 80 + rand(0, 60), life: 0.3, color: pick(['#FFB454', '#FF7A3D', '#FFE27A']), r: rand(3, 6) });
}

function update(dt, inp = readInput()) {
  S.t += dt;
  if (S.toast) { S.toast.life -= dt; if (S.toast.life <= 0) S.toast = null; }
  if (inp.pause || (inp.back && S.mode === 'play')) togglePause();
  // B = back on menus: story / repair / the end return to the chapter select.
  if (inp.back && (S.mode === 'story' || S.mode === 'dead' || S.mode === 'theend')) { S.mode = 'title'; S.sel = clamp(S.levelIdx, 0, S.unlocked); return; }

  if (S.mode === 'title') {
    if (inp.left) { S.sel = Math.max(0, S.sel - 1); sfx.blip(); }
    if (inp.right) { S.sel = Math.min(S.unlocked, S.sel + 1); sfx.blip(); }
    if (inp.a) { S.levelIdx = S.sel; startStory(lv().intro, 'play'); sfx.next(); }
    return;
  }
  if (S.mode === 'story') {
    const st = S.story, line = st.lines[st.idx][1];
    st.shown = Math.min(line.length, st.shown + dt * 42);
    if (inp.a) {
      if (st.shown < line.length) st.shown = line.length;
      else if (st.idx < st.lines.length - 1) { st.idx++; st.shown = 0; sfx.next(); }
      else if (st.next === 'play') loadLevel(S.levelIdx);
      else if (st.next === 'theend') { S.mode = 'theend'; if (!reduceMotion) confetti(120); sfx.clear(); }
    }
    return;
  }
  if (S.mode === 'cleared') {
    if (inp.a) {
      sfx.next();
      if (S.levelIdx + 1 < LEVELS.length) { S.levelIdx++; startStory(lv().intro, 'play'); }
      else startStory(ENDING, 'theend');
    }
    return;
  }
  if (S.mode === 'dead') { if (inp.a) loadLevel(S.levelIdx); return; }
  if (S.mode === 'theend') { if (inp.a) { S.mode = 'title'; S.sel = 0; } partsTick(dt); return; }
  if (S.paused) return;

  // ---- play ----
  const L = lv(), sh = S.ship, g = L.goal;
  moveShip(sh, inp, dt);
  if(S.ship2) moveShip(S.ship2, inp.buddy || {mx:0,my:0,a:false}, dt);
  S.shake = Math.max(0, S.shake - dt);
  const R = 24;

  // asteroids
  for (const a of S.asteroids) {
    a.x += a.vx * dt; a.y += a.vy * dt; a.rot += a.spin * dt; bounce(a, a.r);
    hitShips(a.x, a.y, a.r + R - 6);
  }
  // comets
  if (L.comets) {
    S.timers.comet -= dt;
    if (S.timers.comet <= 0) { S.timers.comet = L.comets.every * rand(0.7, 1.2); S.comets.push({ x: VW + 60, y: rand(TOP + 50, VH - 60), vx: -L.comets.speed * rand(0.85, 1.15), r: 22 }); }
    for (let i = S.comets.length - 1; i >= 0; i--) {
      const c = S.comets[i]; c.x += c.vx * dt;
      for (let k = 0; k < 2; k++) S.parts.push({ x: c.x + rand(-6, 6), y: c.y + rand(-8, 8), vx: 60, vy: rand(-20, 20), life: 0.45, color: pick(['#FFB454', '#FFE27A', '#FFFFFF']), r: rand(3, 9) });
      hitShips(c.x, c.y, c.r + R - 4);
      if (c.x < -80) S.comets.splice(i, 1);
    }
  }
  // jellies (homing)
  if (L.jellies) for (const j of S.jellies) {
    const target=ships().reduce((a,c)=>dist(c.x,c.y,j.x,j.y)<dist(a.x,a.y,j.x,j.y)?c:a);
    const dx = target.x - j.x, dy = target.y - j.y, d = Math.hypot(dx, dy) || 1;
    j.x += (dx / d) * L.jellies.speed * dt + Math.sin(S.t * 2 + j.phase) * 40 * dt;
    j.y += (dy / d) * L.jellies.speed * dt + Math.cos(S.t * 1.7 + j.phase) * 30 * dt;
    j.x = clamp(j.x, 30, VW - 30); j.y = clamp(j.y, TOP + 30, VH - 30);
    if (nearShip(j.x, j.y, 30 + R - 6)) { hitShips(j.x, j.y, 30 + R - 6); j.x -= dx / d * 120; j.y -= dy / d * 120; }
  }
  // meteors
  if (L.meteors) {
    S.timers.meteor -= dt;
    if (S.timers.meteor <= 0) {
      S.timers.meteor = L.meteors.every * rand(0.6, 1.3);
      const fromTop = Math.random() < 0.6, sp = L.meteors.speed * rand(0.8, 1.2), ang = rand(2.0, 2.5);
      S.meteors.push({ x: fromTop ? rand(0, VW + 300) : VW + 40, y: fromTop ? TOP - 40 : rand(TOP, VH * 0.6), vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, r: rand(11, 22), rot: rand(0, TAU), spin: rand(-3, 3) });
    }
    for (let i = S.meteors.length - 1; i >= 0; i--) {
      const m = S.meteors[i]; m.x += m.vx * dt; m.y += m.vy * dt; m.rot += m.spin * dt;
      if (Math.random() < 0.5) S.parts.push({ x: m.x, y: m.y, vx: -m.vx * 0.1, vy: -m.vy * 0.1, life: 0.3, color: '#FF9A5C', r: rand(2, 5) });
      hitShips(m.x, m.y, m.r + R - 6);
      if (m.x < -60 || m.y > VH + 60) S.meteors.splice(i, 1);
    }
  }
  // shield pickups
  if (L.shields) {
    S.timers.pickup -= dt;
    if (S.timers.pickup <= 0 && !S.shield && S.pickups.length === 0) { S.timers.pickup = rand(7, 12); spawnPickup(); }
    for (let i = S.pickups.length - 1; i >= 0; i--) {
      const p = S.pickups[i]; p.life -= dt;
      if (nearShip(p.x, p.y, p.r + R)) { S.shield = true; sfx.pickup(); burst(sh.x, sh.y, '#7FE7FF', 14); floatText(sh.x, sh.y - 50, 'Shield on!', '#7FE7FF'); S.pickups.splice(i, 1); }
      else if (p.life <= 0) S.pickups.splice(i, 1);
    }
  }

  // ---- goals ----
  if (g.type === 'collect' || g.type === 'survive') {
    const want = g.type === 'collect' ? Math.min(3, g.n - Math.floor(S.progress)) : 1;
    while (S.shards.length < want) spawnShard();
  }
  for (let i = S.shards.length - 1; i >= 0; i--) {
    const s = S.shards[i]; s.x += s.vx * dt; s.y += s.vy * dt; s.rot += 1.6 * dt; bounce(s, 24);
    if (nearShip(s.x, s.y, s.r + R)) {
      S.shards.splice(i, 1); S.pieces++; sfx.shard(); burst(s.x, s.y, '#C9F4FF', 14);
      if (g.type === 'collect') { S.progress++; floatText(s.x, s.y - 30, `${S.progress} / ${g.n}`, '#C9F4FF'); if (S.progress >= g.n) clearLevel(); }
      else floatText(s.x, s.y - 30, 'Bonus piece!', '#C9F4FF');
    }
  }
  if (g.type === 'survive') { S.progress = Math.min(g.n, S.progress + dt); if (S.progress >= g.n) clearLevel(); }
  if (g.type === 'rings' && S.ring) {
    if (nearShip(S.ring.x, S.ring.y, S.ring.r * 0.62)) {
      S.progress++; sfx.ring(); burst(S.ring.x, S.ring.y, '#FFE27A', 24, 260); floatText(S.ring.x, S.ring.y - 110, `Ring ${S.progress} / ${g.n}`, '#FFE27A');
      if (S.progress >= g.n) { S.ring = null; clearLevel(); } else S.ring = S.ringList[S.progress];
    }
  }
  if (g.type === 'boss' && S.boss) {
    const b = S.boss;
    // gently steer toward ship, bounce off walls
    const target=ships().reduce((a,c)=>dist(c.x,c.y,b.x,b.y)<dist(a.x,a.y,b.x,b.y)?c:a);
    const dx = target.x - b.x, dy = target.y - b.y, d = Math.hypot(dx, dy) || 1;
    b.vx += dx / d * 140 * dt; b.vy += dy / d * 140 * dt;
    const bs = Math.hypot(b.vx, b.vy); if (bs > b.speed) { b.vx *= b.speed / bs; b.vy *= b.speed / bs; }
    b.x += b.vx * dt; b.y += b.vy * dt; bounce(b, b.r);
    for (let k = 0; k < 3; k++) S.parts.push({ x: b.x - b.vx * 0.08 + rand(-20, 20), y: b.y - b.vy * 0.08 + rand(-20, 20), vx: -b.vx * 0.4, vy: -b.vy * 0.4, life: 0.5, color: b.calm >= 4 ? pick(['#7FE7FF', '#B8FF9A']) : pick(['#FF7A3D', '#FFB454']), r: rand(4, 12) });
    hitShips(b.x, b.y, b.r + R - 10);
    if (!S.spark) spawnSpark();
    const sp = S.spark; sp.rot += 3 * dt;
    if (nearShip(sp.x, sp.y, sp.r + R)) {
      S.spark = null; S.progress++; b.calm++; b.speed *= 0.84; S.pieces++; sfx.spark(); sfx.calm(); burst(sp.x, sp.y, '#FFE27A', 20);
      floatText(b.x, b.y - 90, pick(['Hmph...', 'Oh.', 'That tickles', 'Fine.', 'Thank you?', 'Friends?']), '#FFFFFF', 40);
      if (S.progress >= g.n) clearLevel();
    }
  }
  partsTick(dt);
}
function partsTick(dt) {
  for (let i = S.parts.length - 1; i >= 0; i--) { const q = S.parts[i]; q.life -= dt; q.x += q.vx * dt; q.y += q.vy * dt; if (q.sq) q.vy += 60 * dt; if (q.life <= 0) S.parts.splice(i, 1); }
  for (let i = S.floats.length - 1; i >= 0; i--) { const f = S.floats[i]; f.life -= dt; f.y -= 60 * dt; if (f.life <= 0) S.floats.splice(i, 1); }
}

// ---------- drawing ----------
function font(size, weight) { ctx.font = `${weight || 800} ${size}px ${FONT}`; }
function text(t, x, y, size, color, align, weight) { font(size, weight); ctx.textAlign = align || 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = color; ctx.fillText(t, x, y); }
function outlined(t, x, y, size, color, align) {
  font(size, 800); ctx.textAlign = align || 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
  ctx.lineWidth = Math.max(4, size * 0.14); ctx.strokeStyle = 'rgba(5,8,25,0.7)'; ctx.strokeText(t, x, y); ctx.fillStyle = color; ctx.fillText(t, x, y);
}
function wrap(t, maxW) {
  const words = t.split(' '), lines = []; let cur = '';
  for (const w of words) { const c = cur ? cur + ' ' + w : w; if (ctx.measureText(c).width > maxW && cur) { lines.push(cur); cur = w; } else cur = c; }
  if (cur) lines.push(cur); return lines;
}
function drawSpace(L) {
  const g = ctx.createLinearGradient(0, 0, 0, cssH);
  if (L && L.dark) { g.addColorStop(0, '#05070F'); g.addColorStop(1, '#0E1430'); }
  else if (L && L.nebula) { g.addColorStop(0, '#2A1038'); g.addColorStop(1, '#1A1A4A'); }
  else { g.addColorStop(0, '#0B1026'); g.addColorStop(1, '#1B2A5A'); }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.fillStyle = g; ctx.fillRect(0, 0, cssW, cssH);
}
function drawStars(bright) {
  const sh = S.ship, px = S.mode === 'play' ? sh.x / VW : 0.5, py = S.mode === 'play' ? sh.y / VH : 0.5;
  for (const layer of starLayers) {
    const ox = (0.5 - px) * layer.sp * 60, oy = (0.5 - py) * layer.sp * 40, drift = (S.t * layer.sp * 8) % VW;
    for (const s of layer.pts) {
      const tw = 0.55 + 0.45 * Math.sin(S.t * 1.5 + s.tw);
      ctx.globalAlpha = tw * (bright ? 1 : 0.85);
      ctx.fillStyle = '#EAF4FF';
      let x = (s.x * VW - drift + ox) % VW; if (x < 0) x += VW;
      ctx.beginPath(); ctx.arc(x, s.y * VH + oy, s.r, 0, TAU); ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
}
function drawPlanet(p) {
  if (!p) return;
  const x = p.x * VW, y = p.y * VH;
  if (p.ring) { ctx.save(); ctx.strokeStyle = 'rgba(255,226,122,0.45)'; ctx.lineWidth = 34; ctx.beginPath(); ctx.ellipse(x, y, p.r * 1.75, p.r * 0.42, -0.25, Math.PI * 0.95, Math.PI * 2.05); ctx.stroke(); ctx.restore(); }
  const g = ctx.createRadialGradient(x - p.r * 0.4, y - p.r * 0.4, p.r * 0.1, x, y, p.r);
  g.addColorStop(0, p.c1); g.addColorStop(1, p.c2);
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, p.r, 0, TAU); ctx.fill();
  ctx.save(); ctx.beginPath(); ctx.arc(x, y, p.r, 0, TAU); ctx.clip();
  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  for (let i = -3; i <= 3; i++) { ctx.beginPath(); ctx.ellipse(x, y + i * p.r * 0.28, p.r * 1.1, p.r * 0.08, 0, 0, TAU); ctx.fill(); }
  ctx.restore();
  if (p.ring) { ctx.save(); ctx.strokeStyle = 'rgba(255,226,122,0.75)'; ctx.lineWidth = 34; ctx.beginPath(); ctx.ellipse(x, y, p.r * 1.75, p.r * 0.42, -0.25, -0.05 * Math.PI, Math.PI * 0.95); ctx.stroke(); ctx.restore(); }
}
function drawPipFace(x, y, s, mood) {
  // round robot head
  ctx.fillStyle = '#DDE6F2'; ctx.beginPath(); ctx.roundRect(x - s, y - s * 0.9, s * 2, s * 1.8, s * 0.5); ctx.fill();
  ctx.strokeStyle = '#9FB0C4'; ctx.lineWidth = s * 0.08; ctx.beginPath(); ctx.moveTo(x, y - s * 0.9); ctx.lineTo(x, y - s * 1.3); ctx.stroke();
  ctx.fillStyle = '#7FE7FF'; ctx.beginPath(); ctx.arc(x, y - s * 1.35, s * 0.14, 0, TAU); ctx.fill();
  ctx.fillStyle = '#1B2A5A'; ctx.beginPath(); ctx.roundRect(x - s * 0.7, y - s * 0.45, s * 1.4, s * 0.8, s * 0.3); ctx.fill();
  const blink = Math.sin(S.t * 3) > 0.97 ? 0.15 : 1;
  ctx.fillStyle = '#7FE7FF';
  ctx.beginPath(); ctx.ellipse(x - s * 0.32, y - s * 0.05, s * 0.16, s * 0.2 * blink, 0, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.ellipse(x + s * 0.32, y - s * 0.05, s * 0.16, s * 0.2 * blink, 0, 0, TAU); ctx.fill();
  ctx.strokeStyle = '#7FE7FF'; ctx.lineWidth = s * 0.07; ctx.lineCap = 'round';
  ctx.beginPath(); if (mood === 'sad') ctx.arc(x, y + s * 0.4, s * 0.2, Math.PI * 1.15, Math.PI * 1.85); else ctx.arc(x, y + s * 0.1, s * 0.25, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();
}
function drawMoonFace(x, y, s, lit) {
  ctx.save();
  if (lit) { ctx.shadowColor = '#FFF4C2'; ctx.shadowBlur = s * 0.8; }
  ctx.fillStyle = lit ? '#FFF4C2' : '#C9CDD9'; ctx.beginPath(); ctx.arc(x, y, s, 0, TAU); ctx.fill();
  ctx.restore();
  ctx.fillStyle = lit ? 'rgba(220,200,120,0.35)' : 'rgba(120,125,140,0.45)';
  ctx.beginPath(); ctx.arc(x - s * 0.4, y - s * 0.3, s * 0.18, 0, TAU); ctx.arc(x + s * 0.45, y + s * 0.35, s * 0.14, 0, TAU); ctx.arc(x + s * 0.2, y - s * 0.55, s * 0.1, 0, TAU); ctx.fill();
  ctx.fillStyle = '#2A2733';
  ctx.beginPath(); ctx.ellipse(x - s * 0.25, y - s * 0.05, s * 0.07, s * 0.14, 0, 0, TAU); ctx.ellipse(x + s * 0.25, y - s * 0.05, s * 0.07, s * 0.14, 0, 0, TAU); ctx.fill();
  ctx.strokeStyle = '#2A2733'; ctx.lineWidth = s * 0.06; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.arc(x, y + s * 0.15, s * 0.25, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();
}
function drawShip(sh = S.ship, player = 0) {
  if (sh.inv > 0 && Math.floor(sh.inv * 14) % 2 === 0 && S.mode === 'play') return;
  ctx.save(); ctx.translate(sh.x, sh.y); ctx.rotate(sh.tilt);
  if (S.shield) { ctx.fillStyle = 'rgba(127,231,255,0.16)'; ctx.strokeStyle = 'rgba(127,231,255,0.9)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, 44 + Math.sin(S.t * 6) * 2, 0, TAU); ctx.fill(); ctx.stroke(); }
  // engine
  ctx.fillStyle = '#5B6B86'; ctx.beginPath(); ctx.roundRect(-16, 14, 32, 16, 6); ctx.fill();
  const fl = 10 + Math.random() * 10 + Math.hypot(sh.vx, sh.vy) * 0.03;
  ctx.fillStyle = '#FFB454'; ctx.beginPath(); ctx.moveTo(-10, 28); ctx.lineTo(0, 28 + fl); ctx.lineTo(10, 28); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#FFE27A'; ctx.beginPath(); ctx.moveTo(-5, 28); ctx.lineTo(0, 28 + fl * 0.55); ctx.lineTo(5, 28); ctx.closePath(); ctx.fill();
  // body
  ctx.fillStyle = '#EAF0F8'; ctx.beginPath(); ctx.ellipse(0, 4, 30, 24, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = player ? '#5CB8FF' : '#FF6A6A'; ctx.beginPath(); ctx.ellipse(0, 18, 30, 8, 0, 0, Math.PI); ctx.fill();
  // dome
  ctx.fillStyle = 'rgba(127,231,255,0.35)'; ctx.strokeStyle = '#7FE7FF'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(0, -4, 20, Math.PI, TAU); ctx.closePath(); ctx.fill(); ctx.stroke();
  drawPipFace(0, -9, 9, 'happy');
  if(FAMILY)outlined(player ? 'P2' : 'P1',player ? 24 : -24,-50,24,player ? '#7FE7FF' : '#FF9C9C');
  ctx.restore();
}
function drawAsteroid(a) {
  ctx.save(); ctx.translate(a.x, a.y); ctx.rotate(a.rot);
  ctx.beginPath(); a.verts.forEach(([vx, vy], i) => i ? ctx.lineTo(vx * a.r, vy * a.r) : ctx.moveTo(vx * a.r, vy * a.r)); ctx.closePath();
  ctx.fillStyle = '#6F6A7A'; ctx.fill(); ctx.strokeStyle = '#3E3A48'; ctx.lineWidth = 4; ctx.lineJoin = 'round'; ctx.stroke();
  ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.arc(a.r * 0.25, a.r * 0.2, a.r * 0.22, 0, TAU); ctx.arc(-a.r * 0.35, -a.r * 0.3, a.r * 0.14, 0, TAU); ctx.fill();
  ctx.restore();
}
function drawShard(s) {
  ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(s.rot); ctx.shadowColor = '#7FE7FF'; ctx.shadowBlur = 22;
  ctx.fillStyle = '#C9F4FF'; ctx.beginPath(); ctx.moveTo(0, -s.r); ctx.lineTo(s.r * 0.6, 0); ctx.lineTo(0, s.r); ctx.lineTo(-s.r * 0.6, 0); ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.beginPath(); ctx.moveTo(0, -s.r * 0.7); ctx.lineTo(s.r * 0.25, 0); ctx.lineTo(0, s.r * 0.1); ctx.lineTo(-s.r * 0.25, 0); ctx.closePath(); ctx.fill();
  ctx.restore();
}
function drawComet(c) {
  ctx.save(); ctx.shadowColor = '#FFB454'; ctx.shadowBlur = 20;
  ctx.fillStyle = '#FFE27A'; ctx.beginPath(); ctx.arc(c.x, c.y, c.r, 0, TAU); ctx.fill();
  ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.arc(c.x - 6, c.y - 5, c.r * 0.45, 0, TAU); ctx.fill();
  ctx.restore();
}
function drawJelly(j) {
  const w = Math.sin(S.t * 3 + j.phase);
  ctx.save(); ctx.translate(j.x, j.y);
  ctx.strokeStyle = 'rgba(255,138,216,0.8)'; ctx.lineWidth = 4; ctx.lineCap = 'round';
  for (let k = -2; k <= 2; k++) { ctx.beginPath(); ctx.moveTo(k * 11, 8); ctx.quadraticCurveTo(k * 11 + w * 12, 30, k * 11 - w * 10, 54); ctx.stroke(); }
  ctx.fillStyle = 'rgba(255,138,216,0.75)'; ctx.beginPath(); ctx.arc(0, 0, 30 + w * 2, Math.PI, TAU); ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.beginPath(); ctx.ellipse(-10, -14, 8, 5, -0.5, 0, TAU); ctx.fill();
  ctx.fillStyle = '#5A1E4A'; ctx.beginPath(); ctx.arc(-10, -6, 3.5, 0, TAU); ctx.arc(10, -6, 3.5, 0, TAU); ctx.fill();
  ctx.restore();
}
function drawMeteor(m) {
  ctx.save(); ctx.translate(m.x, m.y); ctx.rotate(m.rot);
  ctx.fillStyle = '#8A5A4A'; ctx.beginPath(); ctx.moveTo(m.r, 0); ctx.lineTo(m.r * 0.3, m.r * 0.9); ctx.lineTo(-m.r * 0.8, m.r * 0.5); ctx.lineTo(-m.r, -m.r * 0.4); ctx.lineTo(-m.r * 0.1, -m.r); ctx.lineTo(m.r * 0.7, -m.r * 0.6); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#FF9A5C'; ctx.lineWidth = 3; ctx.stroke();
  ctx.restore();
}
function drawRing(r, active) {
  ctx.save(); ctx.translate(r.x, r.y);
  const pulse = active ? 1 + Math.sin(S.t * 5) * 0.04 : 1;
  ctx.strokeStyle = active ? '#FFE27A' : 'rgba(255,226,122,0.25)'; ctx.lineWidth = active ? 12 : 6;
  if (active) { ctx.shadowColor = '#FFE27A'; ctx.shadowBlur = 24; }
  ctx.beginPath(); ctx.ellipse(0, 0, r.r * pulse, r.r * 0.55 * pulse, 0, 0, TAU); ctx.stroke();
  if (active) for (let i = 0; i < 6; i++) { const a = S.t * 2 + i * TAU / 6; ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.arc(Math.cos(a) * r.r, Math.sin(a) * r.r * 0.55, 5, 0, TAU); ctx.fill(); }
  ctx.restore();
}
function drawArrowTo(x, y) {
  const sh = localShip(), dx = x - sh.x, dy = y - sh.y, d = Math.hypot(dx, dy); if (d < 180) return;
  const a = Math.atan2(dy, dx), ax = sh.x + Math.cos(a) * 70, ay = sh.y + Math.sin(a) * 70;
  ctx.save(); ctx.translate(ax, ay); ctx.rotate(a); ctx.fillStyle = 'rgba(255,226,122,0.85)';
  ctx.beginPath(); ctx.moveTo(14, 0); ctx.lineTo(-8, -10); ctx.lineTo(-4, 0); ctx.lineTo(-8, 10); ctx.closePath(); ctx.fill(); ctx.restore();
}
function drawBoss(b) {
  const angry = 1 - b.calm / 6;
  ctx.save(); ctx.translate(b.x, b.y);
  ctx.shadowColor = angry > 0.4 ? '#FF7A3D' : '#7FE7FF'; ctx.shadowBlur = 30;
  ctx.fillStyle = angry > 0.4 ? '#FFB454' : '#A8F0E6'; ctx.beginPath(); ctx.arc(0, 0, b.r, 0, TAU); ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.arc(-18, -8, 14, 0, TAU); ctx.arc(18, -8, 14, 0, TAU); ctx.fill();
  ctx.fillStyle = '#2A2733'; ctx.beginPath(); ctx.arc(-16, -6, 7, 0, TAU); ctx.arc(20, -6, 7, 0, TAU); ctx.fill();
  ctx.strokeStyle = '#2A2733'; ctx.lineWidth = 6; ctx.lineCap = 'round';
  if (angry > 0.4) {
    ctx.beginPath(); ctx.moveTo(-32, -30); ctx.lineTo(-8, -20); ctx.moveTo(32, -30); ctx.lineTo(8, -20); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 32, 16, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke();
  } else {
    ctx.beginPath(); ctx.arc(0, 14, 20, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();
  }
  ctx.restore();
}
function drawSpark(sp) {
  ctx.save(); ctx.translate(sp.x, sp.y); ctx.rotate(sp.rot); ctx.shadowColor = '#FFE27A'; ctx.shadowBlur = 24; ctx.fillStyle = '#FFE27A';
  ctx.beginPath(); for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4, rr = i % 2 ? sp.r * 0.45 : sp.r; ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } ctx.closePath(); ctx.fill();
  ctx.restore();
}
function drawPickup(p) {
  ctx.save(); ctx.translate(p.x, p.y + Math.sin(S.t * 4) * 5); ctx.globalAlpha = p.life < 2 ? (Math.floor(p.life * 8) % 2 ? 0.3 : 1) : 1;
  ctx.fillStyle = 'rgba(127,231,255,0.25)'; ctx.strokeStyle = '#7FE7FF'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(0, 0, p.r, 0, TAU); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.arc(-7, -7, 5, 0, TAU); ctx.fill();
  ctx.restore();
}
function drawHUD(L) {
  for (let i = 0; i < 3; i++) {
    const x = 58 + i * 50, y = 58; ctx.beginPath(); ctx.moveTo(x, y + 14);
    ctx.bezierCurveTo(x - 24, y - 2, x - 12, y - 20, x, y - 8); ctx.bezierCurveTo(x + 12, y - 20, x + 24, y - 2, x, y + 14); ctx.closePath();
    if (i < S.hearts) { ctx.fillStyle = '#FF6A6A'; ctx.fill(); } else { ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.lineWidth = 3; ctx.stroke(); }
  }
  // Each device shows its own ship's dash cooldown.
  const myShip=localShip();
  ctx.fillStyle = myShip.dash <= 0 ? '#7FE7FF' : 'rgba(127,231,255,0.25)'; ctx.beginPath(); ctx.moveTo(44, 100); ctx.lineTo(70, 100); ctx.lineTo(60, 112); ctx.lineTo(80, 112); ctx.lineTo(50, 130); ctx.lineTo(60, 116); ctx.lineTo(40, 116); ctx.closePath(); ctx.fill();
  text(myShip.dash <= 0 ? 'Dash ready' : 'Dash', 90, 114, 22, 'rgba(234,244,255,0.85)', 'left', 600);
  // objective
  const g = L.goal; let obj = '';
  if (g.type === 'collect') obj = `Moonstone  ${S.progress} / ${g.n}`;
  if (g.type === 'rings') obj = `Rings  ${S.progress} / ${g.n}`;
  if (g.type === 'survive') obj = `Hold on  ${Math.ceil(g.n - S.progress)}s`;
  if (g.type === 'boss') obj = `Calm the comet  ${S.progress} / ${g.n}`;
  outlined(obj, VW / 2, 54, 36, '#FFFFFF');
  const bw = 320, bx = VW / 2 - bw / 2;
  ctx.fillStyle = 'rgba(255,255,255,0.15)'; ctx.beginPath(); ctx.roundRect(bx, 84, bw, 14, 7); ctx.fill();
  ctx.fillStyle = '#7FE7FF'; ctx.beginPath(); ctx.roundRect(bx, 84, Math.max(10, bw * clamp(S.progress / g.n, 0, 1)), 14, 7); ctx.fill();
  text(`Chapter ${S.levelIdx + 1}: ${L.name}`, VW - 40, 56, 26, 'rgba(234,244,255,0.85)', 'right', 700);
  if (S.toast) { text(S.toast.text, VW / 2, 140, 24, '#7FE7FF', 'center', 600); }
}
function drawPanel(w, h, yOff) {
  const x = VW / 2 - w / 2, y = VH / 2 - h / 2 + (yOff || 0);
  ctx.fillStyle = 'rgba(8,12,34,0.88)'; ctx.strokeStyle = 'rgba(127,231,255,0.6)'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.roundRect(x, y, w, h, 28); ctx.fill(); ctx.stroke(); return y;
}
function drawDialogue() {
  const st = S.story, [who, line] = st.lines[st.idx];
  const boxH = 230, y = VH - boxH - 50, x = 120, w = VW - 240;
  ctx.fillStyle = 'rgba(8,12,34,0.9)'; ctx.strokeStyle = 'rgba(127,231,255,0.6)'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.roundRect(x, y, w, boxH, 28); ctx.fill(); ctx.stroke();
  if (who === 'Pip') drawPipFace(x + 110, y + 118, 44, 'happy'); else drawMoonFace(x + 110, y + 115, 60, st.next === 'theend');
  text(who, x + 220, y + 48, 30, '#7FE7FF', 'left', 800);
  font(34, 600); ctx.fillStyle = '#EAF4FF'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  const lines = wrap(line, w - 290); let shown = Math.floor(st.shown), ly = y + 100;
  for (const l of lines) { const part = l.slice(0, Math.max(0, shown)); ctx.fillText(part, x + 220, ly); shown -= l.length + 1; ly += 44; if (shown <= 0) break; }
  if (st.shown >= line.length && Math.floor(S.t * 2) % 2 === 0) text(st.idx < st.lines.length - 1 ? 'A  ▸' : 'A  Go!', x + w - 40, y + boxH - 34, 26, '#FFE27A', 'right', 800);
  text(`Chapter ${S.levelIdx + 1}: ${st.next === 'theend' ? 'The Moon shines again' : lv().name}`, VW / 2, 80, 40, '#FFFFFF', 'center', 800);
}
function drawTitle() {
  drawMoonFace(VW * 0.5, VH * 0.3, 110, false);
  // cracked look: a few dark lines
  ctx.strokeStyle = 'rgba(42,39,51,0.6)'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(VW * 0.5 - 70, VH * 0.3 - 80); ctx.lineTo(VW * 0.5 - 30, VH * 0.3 - 20); ctx.lineTo(VW * 0.5 - 55, VH * 0.3 + 40); ctx.stroke();
  for (let i = 0; i < 5; i++) { const a = S.t * 0.4 + i * TAU / 5; drawShard({ x: VW * 0.5 + Math.cos(a) * 220, y: VH * 0.3 + Math.sin(a) * 110, rot: S.t + i, r: 18 }); }
  outlined('Pip and the Moonstone', VW / 2, VH * 0.56, 84, '#FFFFFF');
  text(FAMILY ? 'Two ships. One moon. Fly together!' : 'A space story in six chapters', VW / 2, VH * 0.64, 30, 'rgba(234,244,255,0.8)', 'center', 600);
  const name = LEVELS[S.sel].name, canL = S.sel > 0, canR = S.sel < S.unlocked;
  text(canL ? '◀' : ' ', VW / 2 - 330, VH * 0.76, 44, '#7FE7FF');
  text(canR ? '▶' : ' ', VW / 2 + 330, VH * 0.76, 44, '#7FE7FF');
  text(`Chapter ${S.sel + 1}: ${name}`, VW / 2, VH * 0.76, 40, '#FFE27A', 'center', 800);
  if (Math.floor(S.t * 2) % 2 === 0) text('Press A to begin', VW / 2, VH * 0.85, 36, '#FFFFFF');
  text('Controller:  ✛ / stick fly  •  A dash  •  B pause  •  Start pause      Keys: arrows, Enter, P', VW / 2, VH * 0.93, 22, 'rgba(234,244,255,0.6)', 'center', 600);
  if (S.unlocked > 0) text('Use ◀ ▶ to replay an earlier chapter', VW / 2, VH * 0.965, 20, 'rgba(234,244,255,0.5)', 'center', 600);
}
function drawCleared() {
  const y = drawPanel(900, 360);
  outlined('Chapter complete!', VW / 2, y + 70, 60, '#FFE27A');
  font(30, 600); ctx.fillStyle = '#EAF4FF'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const lines = wrap(lv().outro, 780); let ly = y + 150; for (const l of lines) { ctx.fillText(l, VW / 2, ly); ly += 40; }
  text(`Pieces collected so far: ${S.pieces}`, VW / 2, y + 250, 26, '#7FE7FF', 'center', 600);
  if (Math.floor(S.t * 2) % 2 === 0) text(S.levelIdx + 1 < LEVELS.length ? 'Press A for the next chapter' : 'Press A to see what happens', VW / 2, y + 310, 30, '#FFFFFF');
}
function drawDead() {
  const y = drawPanel(760, 300);
  outlined('Oh no!', VW / 2, y + 70, 60, '#FF6A6A');
  text('The Lumen needs a quick repair.', VW / 2, y + 140, 30, '#EAF4FF', 'center', 600);
  text(`Pip is okay. Try Chapter ${S.levelIdx + 1} again?`, VW / 2, y + 185, 30, '#EAF4FF', 'center', 600);
  if (Math.floor(S.t * 2) % 2 === 0) text('Press A to try again', VW / 2, y + 250, 30, '#FFFFFF');
}
function drawTheEnd() {
  drawMoonFace(VW * 0.5, VH * 0.36, 140, true);
  outlined('The End', VW / 2, VH * 0.68, 96, '#FFFFFF');
  text(`Pip brought home ${S.pieces} pieces of Moonstone.`, VW / 2, VH * 0.78, 30, '#FFE27A', 'center', 600);
  if (Math.floor(S.t * 2) % 2 === 0) text('Press A to return to the start', VW / 2, VH * 0.88, 28, 'rgba(234,244,255,0.8)', 'center', 600);
}
function drawPaused() { const y = drawPanel(520, 200); outlined('Paused', VW / 2, y + 70, 60, '#FFFFFF'); text('Press B or Start to continue', VW / 2, y + 140, 26, 'rgba(234,244,255,0.8)', 'center', 600); }

function render() {
  const inGame = ['play', 'cleared', 'dead'].includes(S.mode);
  const L = inGame || S.mode === 'story' ? lv() : null;
  drawSpace(S.mode === 'theend' ? null : L);
  let sx = 0, sy = 0; if (S.shake > 0) { sx = rand(-1, 1) * S.shake * 16; sy = rand(-1, 1) * S.shake * 16; }
  ctx.setTransform(dpr * scale, 0, 0, dpr * scale, dpr * (offX + sx * scale), dpr * (offY + sy * scale));
  drawStars(S.mode === 'theend');
  if (L && (inGame || S.mode === 'story')) drawPlanet(L.planet);
  if (inGame) {
    if (S.ringList.length) S.ringList.forEach(r => drawRing(r, r === S.ring));
    for (const p of S.pickups) drawPickup(p);
    for (const s of S.shards) drawShard(s);
    if (S.spark) drawSpark(S.spark);
    for (const a of S.asteroids) drawAsteroid(a);
    for (const m of S.meteors) drawMeteor(m);
    for (const j of S.jellies) drawJelly(j);
    for (const c of S.comets) drawComet(c);
    if (S.boss) drawBoss(S.boss);
    if (S.mode !== 'dead') { drawShip(); if(S.ship2)drawShip(S.ship2,1); }
    if (S.mode === 'play' && S.ring) drawArrowTo(S.ring.x, S.ring.y);
    if (S.mode === 'play' && S.spark) drawArrowTo(S.spark.x, S.spark.y);
  }
  for (const q of S.parts) { ctx.globalAlpha = clamp(q.life * 2, 0, 1); ctx.fillStyle = q.color; if (q.sq) ctx.fillRect(q.x - q.r / 2, q.y - q.r / 2, q.r, q.r * 0.6); else { ctx.beginPath(); ctx.arc(q.x, q.y, q.r, 0, TAU); ctx.fill(); } }
  ctx.globalAlpha = 1;
  if (inGame && L.dark && S.mode === 'play' && !S.ship2) {
    const g = ctx.createRadialGradient(S.ship.x, S.ship.y, 60, S.ship.x, S.ship.y, 340);
    g.addColorStop(0, 'rgba(5,7,15,0)'); g.addColorStop(1, 'rgba(5,7,15,0.82)');
    ctx.fillStyle = g; ctx.fillRect(-20, -20, VW + 40, VH + 40);
  }
  if(inGame && L.dark && S.mode==='play' && S.ship2)drawTeamDarkness();
  for (const f of S.floats) { ctx.globalAlpha = clamp(f.life * 1.5, 0, 1); outlined(f.text, f.x, f.y, f.size, f.color); }
  ctx.globalAlpha = 1;
  if (inGame) drawHUD(L);
  if (S.mode === 'title') drawTitle();
  else if (S.mode === 'story') drawDialogue();
  else if (S.mode === 'cleared') drawCleared();
  else if (S.mode === 'dead') drawDead();
  else if (S.mode === 'theend') drawTheEnd();
  else if (S.mode === 'play' && S.paused) drawPaused();
}

// ---------- loop ----------
let last = performance.now();
function frame(now) { const dt = Math.min(0.05, (now - last) / 1000); last = now; familyTick(dt); render(); requestAnimationFrame(frame); }
document.addEventListener('visibilitychange', () => { if (document.hidden && S.mode === 'play') S.paused = true; last = performance.now(); });
function toggleFs() { try { if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen(); } catch (e) {} }
fsBtn.addEventListener('click', () => { initAudio(); toggleFs(); });
document.addEventListener('fullscreenchange', () => { fsBtn.hidden = !!document.fullscreenElement; });
window.addEventListener('resize', resize);
resize();
if (document.fonts && document.fonts.load) document.fonts.load('800 40px "Baloo 2"').catch(() => {});
requestAnimationFrame(frame);

const teamDark=document.createElement('canvas');teamDark.width=1600;teamDark.height=900;
function drawTeamDarkness(){
 const c=teamDark.getContext('2d');c.clearRect(0,0,1600,900);c.globalCompositeOperation='source-over';c.fillStyle='rgba(5,7,15,.82)';c.fillRect(0,0,1600,900);c.globalCompositeOperation='destination-out';
 for(const sh of ships()){const g=c.createRadialGradient(sh.x,sh.y,60,sh.x,sh.y,340);g.addColorStop(0,'#000');g.addColorStop(1,'transparent');c.fillStyle=g;c.fillRect(0,0,1600,900);}
 c.globalCompositeOperation='source-over';ctx.drawImage(teamDark,0,0);
}
window.PM = {S,LEVELS,loadLevel,update,clearLevel,ships};
if(FAMILY){
 const sounds=[],fields=Object.keys(S).filter(k=>!['unlocked','muted'].includes(k));
 for(const key of Object.keys(sfx)){const fn=sfx[key];sfx[key]=(...args)=>{if(FAMILY.role==='host'&&sounds.length<24)sounds.push([key,args]);fn(...args);};}
 FAMILY.register({
  start(){S.levelIdx=S.unlocked;startStory(lv().intro,'play');},connection:familyConnection,unlock:initAudio,input(){},action:familyAction,
  snapshot(){const state={};for(const key of fields)state[key]=S[key];return {state,unlocked:S.unlocked,sounds:sounds.splice(0),menu:S.mode!=='play'||S.paused};},
  apply(v){
   if(!v?.state)return;
   const old=ships().map(sh=>({...sh})),level=S.levelIdx,mode=S.mode;
   for(const key of fields)if(key in v.state)S[key]=v.state[key];
   if(S.ring)S.ring=S.ringList[S.progress];
   if(level===S.levelIdx&&mode===S.mode&&!S.paused)familyBlend(old,ships(),400);else familyTargets=[];
   if(v.unlocked>S.unlocked){S.unlocked=v.unlocked;saveUnlocked();}
   for(const [key,args] of v.sounds||[])if(Object.hasOwn(sfx,key))sfx[key](...args);
  }
 });
}
})();
