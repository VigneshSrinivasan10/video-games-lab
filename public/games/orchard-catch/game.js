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
const FONT = '"Fredoka", "Nunito", "Segoe UI", system-ui, sans-serif';

const VH = 900;
let VW = 1600, dpr = 1, scale = 1, offX = 0, offY = 0, cssW = 0, cssH = 0;
const GROUND_Y = VH - 90;
const BASKET_Y = GROUND_Y - 58;
const LEVEL_PTS = 12;          // points per level
const TAU = Math.PI * 2;

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rand = (a, b) => a + Math.random() * (b - a);
const pick = arr => arr[Math.floor(Math.random() * arr.length)];

function resize() {
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  cssW = window.innerWidth; cssH = window.innerHeight;
  canvas.width = Math.round(cssW * dpr); canvas.height = Math.round(cssH * dpr);
  scale = cssH / VH;
  VW = FAMILY ? 1600 : clamp(cssW / scale, 1000, 2200);
  if (VW * scale > cssW) scale = cssW / VW;
  offX = (cssW - VW * scale) / 2; offY = (cssH - VH * scale) / 2;
  for (const p of players) p.x = clamp(p.x || VW / 2, p.w / 2, VW - p.w / 2);
}

// ---------- skies: one per level, cycling ----------
const SKIES = [
  { name: 'day',       top: '#79C9EE', bot: '#BFE8F8', leaf: '#3F9C47', leaf2: '#58B85C', grass: '#5FC256', grass2: '#79D36C', night: false },
  { name: 'afternoon', top: '#66B8E8', bot: '#D6EEF8', leaf: '#3A9143', leaf2: '#55B059', grass: '#5BBD52', grass2: '#76CF69', night: false },
  { name: 'sunset',    top: '#F08A5D', bot: '#FFD79A', leaf: '#3C7F3D', leaf2: '#5A9E4F', grass: '#58AE4C', grass2: '#74C262', night: false },
  { name: 'dusk',      top: '#6F5BA8', bot: '#F2A3A0', leaf: '#2F6A3A', leaf2: '#48874A', grass: '#4A9A46', grass2: '#64AF5A', night: false },
  { name: 'night',     top: '#141F3C', bot: '#2F4470', leaf: '#1F4A2E', leaf2: '#2E6A3F', grass: '#2F6E3A', grass2: '#3F8449', night: true },
  { name: 'dawn',      top: '#F4A7C0', bot: '#FFE9C9', leaf: '#3F9C47', leaf2: '#5EBD60', grass: '#5FC256', grass2: '#7ED66F', night: false },
];
const nightStars = Array.from({ length: 70 }, () => ({ x: Math.random(), y: Math.random() * 0.6, r: rand(1, 3), tw: rand(0, TAU) }));

// ---------- state ----------
const players = [
  { active: true,  x: 0, w: 180, h: 60, body: '#B5733A', rim: '#8A5425', label: 'P1', flash: 0 },
  { active: false, x: 0, w: 180, h: 60, body: '#3E7BD6', rim: '#2A5AA3', label: 'P2', flash: 0 },
];
const S = {
  mode: 'title', score: 0, hearts: 3, best: 0, level: 1, bestLevel: 1,
  items: [], parts: [], floats: [], banner: null, toast: null,
  t: 0, spawnT: 0, shake: 0, paused: false, muted: false,
  streak: 0, wind: 0, showerT: 0, shower: null,
};
try { S.best = parseInt(ArcadeProfile.storage.getItem('orchard-best') || '0', 10) || 0; } catch (e) {}
function saveBest() { try { ArcadeProfile.storage.setItem('orchard-best', String(S.best)); } catch (e) {} }

const clouds = Array.from({ length: 4 }, (_, i) => ({ x: rand(0, 2000), y: 150 + i * 70 + rand(-20, 20), s: rand(0.8, 1.4), v: rand(8, 18) }));

// ---------- input ----------
const keys = {};
const pressed = new Set();
window.addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT') return;
  if (e.repeat) return;
  keys[e.code] = true; pressed.add(e.code);
  if (e.code === 'KeyF') toggleFs();
  if (e.code === 'KeyM') S.muted = !S.muted;
  if (e.code === 'KeyP' || e.code === 'Escape') togglePause();
  if (['ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
  initAudio();
});
window.addEventListener('keyup', e => { keys[e.code] = false; });
window.addEventListener('blur', () => { for (const k in keys) keys[k] = false; });
canvas.addEventListener('pointerdown', () => { initAudio(); if (S.mode !== 'playing') act(0, true); });
window.addEventListener('gamepadconnected', e => { S.toast = { text: `Controller ${e.gamepad.index + 1} connected`, life: 2.5 }; });
window.addEventListener('gamepaddisconnected', e => { S.toast = { text: `Controller ${e.gamepad.index + 1} disconnected`, life: 2.5 }; });

function readInputs() {
  const inp = [{ move: 0, action: false, pause: false, back: false }, { move: 0, action: false, pause: false, back: false }];
  if (keys.ArrowLeft) inp[0].move -= 1;
  if (keys.ArrowRight) inp[0].move += 1;
  if (keys.KeyA) inp[1].move -= 1;
  if (keys.KeyD) inp[1].move += 1;
  if (pressed.has('Enter') || pressed.has('Space')) inp[0].action = true;
  if (pressed.has('KeyW')) inp[1].action = true;
  // Controllers via the shared standard (AGENTS.md §9): pad in slot 0 = player 1, slot 1 = player 2.
  // D-pad or left stick = move, A = go / join, B = pause-resume (back), Start = pause-resume.
  const pads = GamepadStd.read('game');
  for (let slot = 0; slot < Math.min(2, pads.length); slot++) {
    const p = pads[slot];
    let ax = p.ax;                              // analog stick for smooth basket movement
    if (p.left && ax > -0.5) ax = -1;           // d-pad overrides when the stick is centred
    if (p.right && ax < 0.5) ax = 1;
    inp[slot].move = clamp(inp[slot].move + ax, -1, 1);
    if (p.just.A) inp[slot].action = true;
    if (p.just.start) inp[slot].pause = true;
    if (p.just.B) inp[slot].back = true;
    if (p.any) initAudio();
  }
  if (FAMILY) {
    const p = familyRemote();
    inp[1] = { move: Number(!!p.right)-Number(!!p.left), action: familyActions.has('A'), pause: familyActions.has('start'), back: familyActions.has('B') };
    if (S.paused && (inp[0].action || inp[1].action)) { S.paused = false; inp[0].action = inp[1].action = false; }
    familyActions.clear();
  }
  pressed.clear();
  return inp;
}

// ---------- audio ----------
let actx = null;
function initAudio() {
  try {
    if (!actx) actx = new (window.AudioContext || window.webkitAudioContext)();
    if (actx.state === 'suspended') actx.resume();
  } catch (e) {}
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
  fruit: () => tone(520, 880, 0.12, 'sine', 0.25),
  star: () => { tone(660, 1320, 0.18, 'triangle', 0.25); tone(990, 1760, 0.2, 'triangle', 0.2, 0.09); },
  gold: () => { [660, 880, 1100, 1320].forEach((f, i) => tone(f, f * 1.3, 0.16, 'triangle', 0.22, i * 0.07)); },
  rock: () => tone(180, 70, 0.3, 'sawtooth', 0.22),
  bee: () => tone(240, 120, 0.35, 'square', 0.12),
  heart: () => { tone(523, 659, 0.15, 'sine', 0.25); tone(784, 1047, 0.25, 'sine', 0.25, 0.14); },
  streak: () => { tone(880, 1320, 0.1, 'square', 0.12); tone(1320, 1760, 0.14, 'square', 0.12, 0.08); },
  level: () => { [523, 659, 784, 1047].forEach((f, i) => tone(f, f, 0.22, 'triangle', 0.26, i * 0.12)); },
  start: () => { tone(440, 660, 0.12, 'sine', 0.2); tone(660, 880, 0.15, 'sine', 0.2, 0.11); },
};

// ---------- game logic ----------
function startGame(withP2) {
  S.mode = 'playing'; S.score = 0; S.hearts = 3; S.level = 1; S.items = []; S.parts = []; S.floats = [];
  S.spawnT = 0.7; S.shake = 0; S.paused = false; S.streak = 0; S.wind = 0; S.showerT = 14; S.shower = null;
  S.banner = { text: 'Level 1', sub: 'Catch the fruit!', life: 1.6 };
  players[0].active = true; players[1].active = !!FAMILY || !!withP2;
  players[0].x = players[1].active ? VW * 0.35 : VW / 2;
  players[1].x = VW * 0.65;
  sfx.start();
}
function togglePause() { if (S.mode === 'playing') S.paused = !S.paused; }
function act(slot, isClick) {
  if (S.mode === 'title') startGame(slot === 1);
  else if (S.mode === 'over') startGame(players[1].active || slot === 1);
  else if (S.mode === 'playing' && slot === 1 && !players[1].active && !isClick) {
    players[1].active = true; players[1].x = clamp(players[0].x + 260, 90, VW - 90);
    S.floats.push({ x: players[1].x, y: BASKET_Y - 40, text: 'Player 2 joined!', life: 1.6, color: '#3E7BD6', size: 34 });
  }
}
function sky() { return SKIES[(S.level - 1) % SKIES.length]; }

const LEVEL_INTRO = {
  2: 'Golden apples are worth 10!',
  3: 'Watch out for bees!',
  4: 'The wind is picking up',
  5: 'Night time! Fruit showers ahead',
  6: 'Catch a heart to heal',
};
function levelUp() {
  S.level++;
  S.banner = { text: `Level ${S.level}!`, sub: LEVEL_INTRO[S.level] || pick(['Faster now!', 'You are doing great!', 'Keep going!']), life: 2 };
  sfx.level();
  if (!reduceMotion) confetti(70);
}
function confetti(n) {
  const cols = ['#E8463A', '#FF8C2E', '#FFD23F', '#58B85C', '#3E7BD6', '#C56BD6'];
  for (let i = 0; i < n; i++) S.parts.push({ x: rand(0, VW), y: rand(-60, 0), vx: rand(-80, 80), vy: rand(60, 220), life: rand(1.4, 2.4), color: pick(cols), r: rand(5, 10), g: 220, sq: true });
}

function spawnItem(forceFruit) {
  const L = S.level, r = Math.random();
  let type;
  if (forceFruit) type = Math.random() < 0.5 ? 'apple' : 'orange';
  else if (L >= 6 && S.hearts < 3 && r < 0.06) type = 'heart';
  else if (L >= 2 && r < 0.11) type = 'gold';
  else if (L >= 3 && r < 0.11 + Math.min(0.16, 0.05 + L * 0.02)) type = 'bee';
  else if (r < 0.38) type = 'star';
  else if (r < 0.38 + (L === 1 ? 0.16 : 0.2)) type = 'rock';
  else type = Math.random() < 0.55 ? 'apple' : 'orange';
  if (type === 'star' && Math.random() > 0.35) type = Math.random() < 0.55 ? 'apple' : 'orange';
  const item = { type, x: rand(70, VW - 70), y: 60, r: type === 'star' ? 30 : 28, rot: rand(0, TAU), spin: rand(-1.5, 1.5), phase: rand(0, TAU) };
  if (type === 'rock') item.verts = Array.from({ length: 7 }, (_, i) => { const a = (i / 7) * TAU; const k = rand(0.72, 1.05); return [Math.cos(a) * k, Math.sin(a) * k]; });
  S.items.push(item);
}
function burst(x, y, color, n) {
  for (let i = 0; i < n; i++) S.parts.push({ x, y, vx: rand(-260, 260), vy: rand(-420, -80), life: rand(0.4, 0.8), color, r: rand(4, 9), g: 900 });
}
function loseHeart(p, x, text) {
  S.hearts--; S.streak = 0; p.flash = 0.5; if (!reduceMotion) S.shake = 0.35;
  S.floats.push({ x, y: BASKET_Y - 30, text, life: 1, color: '#E8463A', size: 40 });
  if (S.hearts <= 0) {
    S.mode = 'over';
    if (S.score > S.best) { S.best = S.score; saveBest(); }
  }
}
function addPoints(n, x, color, size) {
  S.score += n;
  S.floats.push({ x, y: BASKET_Y - 30, text: `+${n}`, life: 0.9, color, size: size || 36 });
  S.streak++;
  if (S.streak % 5 === 0) {
    S.score += 2; sfx.streak();
    S.floats.push({ x: VW / 2, y: VH / 2 - 40, text: `${S.streak} in a row! +2`, life: 1.3, color: '#C56BD6', size: 46 });
  }
  while (S.score >= S.level * LEVEL_PTS) levelUp();
  if (FAMILY && S.score > S.best) { S.best = S.score; saveBest(); }
}

function update(dt, inp = readInputs()) {
  S.t += dt;
  const windMul = S.level >= 4 ? 2.2 : 1;
  for (const c of clouds) { c.x += c.v * windMul * dt; if (c.x > VW + 200) c.x = -200; }
  if (S.toast) { S.toast.life -= dt; if (S.toast.life <= 0) S.toast = null; }

  const back = inp[0].back || inp[1].back;
  if (inp[0].pause || inp[1].pause || (back && S.mode === 'playing')) togglePause();
  if (back && S.mode === 'over') S.mode = 'title';   // B = back to the title screen
  if (S.mode !== 'playing') {
    if (inp[0].action) act(0);
    if (inp[1].action) act(1);
    return;
  }
  if (S.paused) return;
  if (inp[1].action) act(1);
  if (S.banner) { S.banner.life -= dt; if (S.banner.life <= 0) S.banner = null; }

  // baskets
  const SPEED = 920;
  players.forEach((p, i) => {
    if (!p.active) return;
    p.x = clamp(p.x + inp[i].move * SPEED * dt, p.w / 2, VW - p.w / 2);
    p.flash = Math.max(0, p.flash - dt);
  });

  // wind (level 4+)
  S.wind = S.level >= 4 ? Math.sin(S.t * 0.45) * (90 + Math.min(S.level, 10) * 8) : 0;

  // spawn
  const L = S.level;
  S.spawnT -= dt;
  if (S.spawnT <= 0) {
    spawnItem(false);
    S.spawnT = Math.max(0.36, 1.1 - (L - 1) * 0.09);
  }
  // fruit shower (level 5+)
  if (L >= 5 && !S.shower) {
    S.showerT -= dt;
    if (S.showerT <= 0) {
      S.shower = { n: 8, t: 0 }; S.showerT = rand(12, 18);
      S.banner = { text: 'Fruit shower!', sub: 'Catch them all', life: 1.4 };
    }
  }
  if (S.shower) {
    S.shower.t -= dt;
    if (S.shower.t <= 0) { spawnItem(true); S.shower.t = 0.16; if (--S.shower.n <= 0) S.shower = null; }
  }

  // items
  const fall = 230 + Math.min(L - 1, 10) * 36;
  for (let i = S.items.length - 1; i >= 0; i--) {
    const it = S.items[i];
    it.y += fall * (it.type === 'bee' ? 0.85 : 1) * dt;
    it.x += S.wind * dt;
    if (it.type === 'bee') it.x += Math.cos(S.t * 5 + it.phase) * 170 * dt;
    if (it.type === 'gold' && Math.random() < 0.5) S.parts.push({ x: it.x + rand(-20, 20), y: it.y + rand(-20, 20), vx: 0, vy: 30, life: 0.4, color: '#FFE27A', r: rand(2, 5), g: 0 });
    it.x = clamp(it.x, 30, VW - 30);
    it.rot += it.spin * dt;
    let caught = false;
    for (const p of players) {
      if (!p.active) continue;
      if (it.y + it.r >= BASKET_Y && it.y < BASKET_Y + 36 && Math.abs(it.x - p.x) < p.w / 2 + it.r * 0.4) {
        caught = true;
        switch (it.type) {
          case 'rock': loseHeart(p, it.x, 'Oops!'); burst(it.x, BASKET_Y, '#8E8E96', 10); sfx.rock(); break;
          case 'bee': loseHeart(p, it.x, 'Bzzz!'); burst(it.x, BASKET_Y, '#FFD23F', 10); sfx.bee(); break;
          case 'star': addPoints(5, it.x, '#FFB400', 48); burst(it.x, BASKET_Y, '#FFD23F', 18); sfx.star(); break;
          case 'gold': addPoints(10, it.x, '#E8A800', 56); burst(it.x, BASKET_Y, '#FFE27A', 26); sfx.gold(); break;
          case 'heart':
            S.hearts = Math.min(3, S.hearts + 1); sfx.heart();
            S.floats.push({ x: it.x, y: BASKET_Y - 30, text: 'Heart back!', life: 1.1, color: '#E8463A', size: 40 });
            burst(it.x, BASKET_Y, '#FF8FA3', 16); break;
          default: addPoints(1, it.x, '#2E8B3A'); burst(it.x, BASKET_Y, it.type === 'apple' ? '#E8463A' : '#FF8C2E', 10); sfx.fruit();
        }
        break;
      }
    }
    if (!caught && it.y - it.r > GROUND_Y + 10) {
      if (it.type === 'apple' || it.type === 'orange' || it.type === 'star' || it.type === 'gold') S.streak = 0;
      S.items.splice(i, 1);
    } else if (caught) S.items.splice(i, 1);
  }

  for (let i = S.parts.length - 1; i >= 0; i--) {
    const q = S.parts[i]; q.life -= dt; q.vy += q.g * dt; q.x += q.vx * dt; q.y += q.vy * dt;
    if (q.life <= 0) S.parts.splice(i, 1);
  }
  for (let i = S.floats.length - 1; i >= 0; i--) {
    const f = S.floats[i]; f.life -= dt; f.y -= 70 * dt;
    if (f.life <= 0) S.floats.splice(i, 1);
  }
  S.shake = Math.max(0, S.shake - dt);
}

// ---------- drawing ----------
function font(size, weight) { ctx.font = `${weight || 700} ${size}px ${FONT}`; }
function drawStar(x, y, r, rot) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) { const a = rot + i * Math.PI / 5 - Math.PI / 2; const rr = i % 2 ? r * 0.48 : r; ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
  ctx.closePath();
}
function heartPath(x, y, s) {
  ctx.beginPath(); ctx.moveTo(x, y + s * 0.9);
  ctx.bezierCurveTo(x - s * 1.4, y - s * 0.1, x - s * 0.7, y - s * 1.1, x, y - s * 0.35);
  ctx.bezierCurveTo(x + s * 0.7, y - s * 1.1, x + s * 1.4, y - s * 0.1, x, y + s * 0.9);
  ctx.closePath();
}
function drawHeart(x, y, s, filled) {
  heartPath(x, y, s);
  if (filled) { ctx.fillStyle = '#E8463A'; ctx.fill(); }
  else { ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 4; ctx.stroke(); }
}
function drawApple(x, y, r, rot, color) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot * 0.2);
  ctx.fillStyle = color || '#E8463A'; ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.beginPath(); ctx.ellipse(-r * 0.35, -r * 0.35, r * 0.28, r * 0.18, -0.7, 0, TAU); ctx.fill();
  ctx.strokeStyle = '#6B3F1E'; ctx.lineWidth = 5; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(0, -r * 0.8); ctx.lineTo(r * 0.1, -r * 1.25); ctx.stroke();
  ctx.fillStyle = '#4CAF50'; ctx.beginPath(); ctx.ellipse(r * 0.35, -r * 1.05, r * 0.32, r * 0.16, -0.5, 0, TAU); ctx.fill();
  ctx.restore();
}
function drawOrange(x, y, r, rot) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot * 0.2);
  ctx.fillStyle = '#FF8C2E'; ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.beginPath(); ctx.ellipse(-r * 0.35, -r * 0.35, r * 0.26, r * 0.16, -0.7, 0, TAU); ctx.fill();
  ctx.fillStyle = '#4CAF50'; ctx.beginPath(); ctx.ellipse(r * 0.2, -r * 0.95, r * 0.3, r * 0.14, -0.4, 0, TAU); ctx.fill();
  ctx.restore();
}
function drawRock(it) {
  ctx.save(); ctx.translate(it.x, it.y); ctx.rotate(it.rot);
  ctx.beginPath();
  it.verts.forEach(([vx, vy], i) => { const px = vx * it.r, py = vy * it.r; i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); });
  ctx.closePath();
  ctx.fillStyle = '#8E8E96'; ctx.fill();
  ctx.strokeStyle = '#5C5C64'; ctx.lineWidth = 4; ctx.lineJoin = 'round'; ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.beginPath(); ctx.arc(-it.r * 0.3, -it.r * 0.3, it.r * 0.22, 0, TAU); ctx.fill();
  ctx.restore();
}
function drawBee(it) {
  const x = it.x, y = it.y, r = it.r, flap = Math.sin(S.t * 40 + it.phase) * 0.35;
  ctx.save(); ctx.translate(x, y);
  ctx.fillStyle = 'rgba(200,230,255,0.75)';
  ctx.beginPath(); ctx.ellipse(-10, -r * 0.9, 16, 9, -0.6 + flap, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.ellipse(10, -r * 0.9, 16, 9, 0.6 - flap, 0, TAU); ctx.fill();
  ctx.fillStyle = '#FFD23F'; ctx.beginPath(); ctx.ellipse(0, 0, r, r * 0.72, 0, 0, TAU); ctx.fill();
  ctx.save(); ctx.beginPath(); ctx.ellipse(0, 0, r, r * 0.72, 0, 0, TAU); ctx.clip();
  ctx.fillStyle = '#2A2733'; ctx.fillRect(-r * 0.45, -r, r * 0.26, r * 2); ctx.fillRect(r * 0.05, -r, r * 0.26, r * 2); ctx.restore();
  ctx.fillStyle = '#2A2733'; ctx.beginPath(); ctx.arc(-r * 0.78, 0, r * 0.32, 0, TAU); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(-r * 0.86, -r * 0.08, r * 0.1, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.moveTo(r * 0.95, 0); ctx.lineTo(r * 1.3, -4); ctx.lineTo(r * 1.3, 4); ctx.closePath(); ctx.fill();
  ctx.restore();
}
function drawItem(it) {
  switch (it.type) {
    case 'apple': drawApple(it.x, it.y, it.r, it.rot); break;
    case 'orange': drawOrange(it.x, it.y, it.r, it.rot); break;
    case 'gold':
      ctx.save(); ctx.shadowColor = '#FFE27A'; ctx.shadowBlur = 24; drawApple(it.x, it.y, it.r, it.rot, '#FFC107'); ctx.restore(); break;
    case 'star': ctx.fillStyle = '#FFD23F'; drawStar(it.x, it.y, it.r, it.rot); ctx.fill(); ctx.strokeStyle = '#E8A800'; ctx.lineWidth = 3; ctx.stroke(); break;
    case 'rock': drawRock(it); break;
    case 'bee': drawBee(it); break;
    case 'heart':
      ctx.save(); ctx.shadowColor = '#FF8FA3'; ctx.shadowBlur = 18; heartPath(it.x, it.y, it.r * 0.95);
      ctx.fillStyle = '#FF4F6E'; ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 4; ctx.stroke(); ctx.restore(); break;
  }
}
function drawBasket(p) {
  const x = p.x, y = BASKET_Y, w = p.w, h = p.h;
  ctx.save();
  const hit = p.flash > 0 && Math.floor(p.flash * 12) % 2 === 0;
  ctx.fillStyle = hit ? '#E8463A' : p.body;
  ctx.beginPath(); ctx.moveTo(x - w / 2, y); ctx.lineTo(x + w / 2, y); ctx.lineTo(x + w / 2 - 22, y + h); ctx.lineTo(x - w / 2 + 22, y + h); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.18)'; ctx.lineWidth = 3;
  for (let i = 1; i < 4; i++) { ctx.beginPath(); ctx.moveTo(x - w / 2 + i * 6, y + i * (h / 4)); ctx.lineTo(x + w / 2 - i * 6, y + i * (h / 4)); ctx.stroke(); }
  for (let i = -3; i <= 3; i++) { ctx.beginPath(); ctx.moveTo(x + i * (w / 7), y); ctx.lineTo(x + i * (w / 7) * 0.78, y + h); ctx.stroke(); }
  ctx.fillStyle = hit ? '#B8332A' : p.rim;
  ctx.beginPath(); ctx.roundRect(x - w / 2 - 8, y - 10, w + 16, 20, 10); ctx.fill();
  if (players[1].active) { font(26, 700); ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic'; ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.fillText(p.label, x, y - 24); }
  ctx.restore();
}
function drawCanopy(sk) {
  const sway = reduceMotion ? 0 : Math.sin(S.t * 0.6) * (S.level >= 4 ? 14 : 6);
  ctx.save(); ctx.translate(sway, 0);
  const blobs = [];
  for (let x = -60; x < VW + 120; x += 150) blobs.push([x, 10 + ((x / 150) % 3) * 22, 110]);
  ctx.fillStyle = sk.leaf;
  for (const [bx, by, br] of blobs) { ctx.beginPath(); ctx.arc(bx, by, br, 0, TAU); ctx.fill(); }
  ctx.fillStyle = sk.leaf2;
  for (const [bx, by, br] of blobs) { ctx.beginPath(); ctx.arc(bx - 30, by - 30, br * 0.78, 0, TAU); ctx.fill(); }
  ctx.fillStyle = '#E8463A';
  for (let x = 40; x < VW; x += 190) { ctx.beginPath(); ctx.arc(x, 70 + ((x / 190) % 2) * 25, 11, 0, TAU); ctx.fill(); }
  ctx.restore();
}
function drawSkyExtras(sk) {
  if (sk.night) {
    ctx.fillStyle = '#FFF4C2';
    for (const s of nightStars) { const tw = 0.6 + 0.4 * Math.sin(S.t * 2 + s.tw); ctx.globalAlpha = tw; ctx.beginPath(); ctx.arc(s.x * VW, 120 + s.y * 500, s.r, 0, TAU); ctx.fill(); }
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#FFF4C2'; ctx.beginPath(); ctx.arc(VW - 220, 230, 52, 0, TAU); ctx.fill();
    ctx.fillStyle = sk.top; ctx.beginPath(); ctx.arc(VW - 200, 216, 44, 0, TAU); ctx.fill();
  } else if (sk.name === 'sunset' || sk.name === 'dawn') {
    ctx.fillStyle = sk.name === 'sunset' ? '#FFD36A' : '#FFE9A3'; ctx.beginPath(); ctx.arc(VW * 0.78, GROUND_Y - 40, 110, Math.PI, TAU); ctx.fill();
  } else {
    ctx.fillStyle = '#FFE27A'; ctx.beginPath(); ctx.arc(VW - 200, 230, 48, 0, TAU); ctx.fill();
  }
}
function drawClouds(sk) {
  ctx.fillStyle = sk.night ? 'rgba(160,175,210,0.35)' : 'rgba(255,255,255,0.85)';
  for (const c of clouds) {
    ctx.beginPath();
    ctx.arc(c.x, c.y, 34 * c.s, 0, TAU); ctx.arc(c.x + 36 * c.s, c.y - 14 * c.s, 42 * c.s, 0, TAU); ctx.arc(c.x + 76 * c.s, c.y, 32 * c.s, 0, TAU);
    ctx.fill();
  }
}
function drawGround(sk) {
  ctx.fillStyle = sk.grass; ctx.fillRect(-10, GROUND_Y, VW + 20, VH - GROUND_Y + 10);
  ctx.fillStyle = sk.grass2; ctx.fillRect(-10, GROUND_Y, VW + 20, 14);
  ctx.strokeStyle = sk.leaf; ctx.lineWidth = 4; ctx.lineCap = 'round';
  const lean = S.wind * 0.08;
  for (let x = 30; x < VW; x += 95) {
    ctx.beginPath(); ctx.moveTo(x, GROUND_Y + 10); ctx.lineTo(x - 6 + lean, GROUND_Y - 14); ctx.moveTo(x + 10, GROUND_Y + 10); ctx.lineTo(x + 16 + lean, GROUND_Y - 10); ctx.stroke();
  }
}
function outlined(text, x, y, size, fill, align) {
  font(size, 700); ctx.textAlign = align || 'center'; ctx.textBaseline = 'middle';
  ctx.lineWidth = Math.max(5, size * 0.12); ctx.lineJoin = 'round'; ctx.strokeStyle = 'rgba(0,0,0,0.28)'; ctx.strokeText(text, x, y);
  ctx.fillStyle = fill; ctx.fillText(text, x, y);
}
function drawHUD() {
  drawApple(70, 68, 26, 0);
  outlined(String(S.score), 112, 70, 64, '#FFFFFF', 'left');
  for (let i = 0; i < 3; i++) drawHeart(VW - 60 - i * 60, 68, 24, i < S.hearts);
  // level progress bar
  const bw = 360, bx = VW / 2 - bw / 2, by = 46;
  const prog = clamp((S.score - (S.level - 1) * LEVEL_PTS) / LEVEL_PTS, 0, 1);
  ctx.fillStyle = 'rgba(0,0,0,0.28)'; ctx.beginPath(); ctx.roundRect(bx, by, bw, 26, 13); ctx.fill();
  ctx.fillStyle = '#FFD23F'; ctx.beginPath(); ctx.roundRect(bx + 3, by + 3, Math.max(20, (bw - 6) * prog), 20, 10); ctx.fill();
  outlined(`Level ${S.level}`, VW / 2, by + 50, 28, '#FFFFFF');
  if (S.streak >= 3) outlined(`${S.streak} in a row`, 112, 118, 24, '#F0C4FF', 'left');
  if (S.toast) {
    font(28, 500); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const w = ctx.measureText(S.toast.text).width + 48;
    ctx.fillStyle = 'rgba(42,39,51,0.75)'; ctx.beginPath(); ctx.roundRect(VW / 2 - w / 2, 150, w, 52, 26); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.fillText(S.toast.text, VW / 2, 177);
  }
  if (S.banner) {
    const a = clamp(S.banner.life * 2, 0, 1), pop = 1 + (reduceMotion ? 0 : Math.max(0, S.banner.life - 1.6) * 1.5);
    ctx.save(); ctx.globalAlpha = a; ctx.translate(VW / 2, VH * 0.4); ctx.scale(pop, pop);
    outlined(S.banner.text, 0, 0, 96, '#FFFFFF');
    if (S.banner.sub) outlined(S.banner.sub, 0, 80, 38, '#FFE27A');
    ctx.restore();
  }
}
function panel(w, h) {
  const x = VW / 2 - w / 2, y = VH / 2 - h / 2;
  ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.beginPath(); ctx.roundRect(x, y + 10, w, h, 36); ctx.fill();
  ctx.fillStyle = '#FFF8E7'; ctx.beginPath(); ctx.roundRect(x, y, w, h, 36); ctx.fill();
  return y;
}
function centered(text, y, size, color, weight) {
  font(size, weight); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = color; ctx.fillText(text, VW / 2, y);
}
function drawTitle() {
  const y = panel(900, 540);
  centered('Orchard Catch', y + 80, 86, '#2A2733');
  const row = y + 170;
  drawApple(VW / 2 - 330, row, 26, 0); drawOrange(VW / 2 - 200, row, 26, 0);
  ctx.fillStyle = '#FFD23F'; drawStar(VW / 2 - 70, row, 30, 0); ctx.fill();
  drawApple(VW / 2 + 70, row, 26, 0, '#FFC107');
  drawBee({ x: VW / 2 + 200, y: row, r: 24, phase: 0 });
  drawRock({ x: VW / 2 + 330, y: row, r: 26, rot: 0.3, verts: [[1, 0], [0.6, 0.8], [-0.4, 0.9], [-1, 0.2], [-0.8, -0.7], [0.1, -1], [0.8, -0.6]] });
  centered('Fruit is 1 point, stars 5, golden apples 10.', y + 232, 32, '#4A4650', 500);
  centered('Bees and rocks cost a heart. Every 12 points is a new level!', y + 274, 32, '#4A4650', 500);
  const blink = Math.floor(S.t * 2) % 2 === 0;
  centered(blink ? 'Press A to play' : ' ', y + 356, 50, '#2E8B3A');
  centered('Controller:  ✛ move  ·  A go  ·  B pause      Keys: ← →, Enter, P', y + 428, 26, '#7A7580', 500);
  centered(FAMILY ? 'Two baskets. One score. Catch together!' : 'Player 2: press A on controller 2 to join, or W (then A D keys)', y + 464, 26, '#7A7580', 500);
}
function drawOver() {
  const y = panel(760, 440);
  centered('All done!', y + 76, 72, '#2A2733');
  centered(`${S.score} points`, y + 168, 60, '#2E8B3A');
  centered(`You reached level ${S.level}`, y + 228, 32, '#4A4650', 500);
  centered(S.score >= S.best && S.score > 0 ? 'New best score!' : `Best: ${S.best}`, y + 272, 32, '#4A4650', 500);
  const blink = Math.floor(S.t * 2) % 2 === 0;
  centered(blink ? 'Press A to play again' : ' ', y + 356, 44, '#2A2733');
  centered('B: back to the title', y + 404, 24, '#7A7580', 500);
}
function drawPaused() {
  const y = panel(520, 220);
  centered('Paused', y + 80, 64, '#2A2733');
  centered('Press B or Start to continue', y + 150, 28, '#7A7580', 500);
}

function render() {
  const sk = sky();
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const g = ctx.createLinearGradient(0, 0, 0, cssH);
  g.addColorStop(0, sk.top); g.addColorStop(1, sk.bot);
  ctx.fillStyle = g; ctx.fillRect(0, 0, cssW, cssH);

  let sx = 0, sy = 0;
  if (S.shake > 0) { sx = rand(-1, 1) * S.shake * 18; sy = rand(-1, 1) * S.shake * 18; }
  ctx.setTransform(dpr * scale, 0, 0, dpr * scale, dpr * (offX + sx * scale), dpr * (offY + sy * scale));

  drawSkyExtras(sk);
  drawClouds(sk);
  drawCanopy(sk);
  drawGround(sk);
  for (const p of players) if (p.active) drawBasket(p);
  for (const it of S.items) drawItem(it);
  for (const q of S.parts) {
    ctx.globalAlpha = clamp(q.life * 2, 0, 1); ctx.fillStyle = q.color;
    if (q.sq) ctx.fillRect(q.x - q.r / 2, q.y - q.r / 2, q.r, q.r * 0.6);
    else { ctx.beginPath(); ctx.arc(q.x, q.y, q.r, 0, TAU); ctx.fill(); }
  }
  ctx.globalAlpha = 1;
  for (const f of S.floats) {
    ctx.globalAlpha = clamp(f.life * 1.5, 0, 1); font(f.size, 700); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.lineWidth = 6; ctx.lineJoin = 'round'; ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.strokeText(f.text, f.x, f.y);
    ctx.fillStyle = f.color; ctx.fillText(f.text, f.x, f.y);
  }
  ctx.globalAlpha = 1;
  drawHUD();
  if (S.mode === 'title') drawTitle();
  else if (S.mode === 'over') drawOver();
  else if (S.paused) drawPaused();
}

// ---------- loop ----------
let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  familyTick(dt); render();
  requestAnimationFrame(frame);
}
document.addEventListener('visibilitychange', () => { if (document.hidden && S.mode === 'playing') S.paused = true; last = performance.now(); });

// ---------- fullscreen ----------
function toggleFs() {
  try { if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen(); } catch (e) {}
}
fsBtn.addEventListener('click', () => { initAudio(); toggleFs(); });
document.addEventListener('fullscreenchange', () => { fsBtn.hidden = !!document.fullscreenElement; });

window.addEventListener('resize', resize);
resize();
players[0].x = VW / 2; players[1].x = VW * 0.65;
if (document.fonts && document.fonts.load) document.fonts.load('700 40px Fredoka').catch(() => {});
requestAnimationFrame(frame);

window.OC = { S, players, startGame, update, addPoints, loseHeart };
if (FAMILY) {
  const sounds = [], fields = Object.keys(S).filter(k => !['best','muted'].includes(k));
  for (const key of Object.keys(sfx)) { const fn=sfx[key]; sfx[key]=(...args)=>{if(FAMILY.role==='host' && sounds.length<24)sounds.push([key,args]);fn(...args);}; }
  FAMILY.register({
    start() { startGame(true); }, connection: familyConnection, unlock: initAudio, input() {}, action: familyAction,
    snapshot() { const state={};for(const key of fields)state[key]=S[key];return {state,players,best:S.best,sounds:sounds.splice(0),menu:S.mode!=='playing'||S.paused}; },
    apply(v) {
      if(!v?.state || !Array.isArray(v.players))return;
      const old=players.map(p=>({...p})), mode=S.mode;
      for(const key of fields)if(key in v.state)S[key]=v.state[key];
      v.players.slice(0,2).forEach((p,i)=>Object.assign(players[i],p));
      if(mode===S.mode && !S.paused)familyBlend(old,players,400);else familyTargets=[];
      if(v.best>S.best){S.best=v.best;saveBest();}
      for(const [key,args] of v.sounds||[])if(Object.hasOwn(sfx,key))sfx[key](...args);
    }
  });
}
})();
