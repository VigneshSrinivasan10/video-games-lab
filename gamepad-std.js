/* gamepad-std.js — the ONE controller mapping for every game in this folder (AGENTS.md §9).
 *
 * What it does
 *  1. Replaces navigator.getGamepads() with a version that returns every pad in the W3C
 *     "standard" layout, ordered by the LABEL printed on the button, not by position:
 *       buttons[0]=A  1=B  2=X  3=Y  4=LB  5=RB  6=LT  7=RT  8=Select(−)  9=Start(+)
 *       10=LS  11=RS  12=Up  13=Down  14=Left  15=Right  16=Home
 *       axes[0..1] = left stick, axes[2..3] = right stick.
 *     Known raw layouts:
 *       - pads Chromium already maps ("standard", e.g. the Nova in XInput mode): passed through.
 *       - GameSir Nova in Android / D-input mode ("Zikway HID gamepad", USB 3537:1041): 16 buttons
 *         + 8 axes and no mapping. Raw A=0 B=1 X=3 Y=4 LB=6 RB=7 LT=8 RT=9 −=10 +=11 Home=12
 *         LS=13 RS=14; d-pad is a hat on axes 6/7; triggers also on axes 4/5 (−1 = released).
 *  2. GamepadStd.read(channel) gives per-pad booleans with press edges (s.just.A) and merges the
 *     left stick into up/down/left/right. GamepadStd.navRepeat() adds menu auto-repeat.
 *  3. Holding B for 2 seconds anywhere leaves the game for the arcade launcher (index.html next
 *     to this file), with an on-screen ring so the child sees it coming.
 *  4. Optional, for games that only listen to the keyboard:
 *       <script src="../gamepad-std.js" data-keys='{"A":"Space","B":"Escape","start":"KeyP"}'><\/script>
 *     synthesizes keydown/keyup events. Names: A B X Y LB RB LT RT select start LS RS up down left
 *     right home. A value may be one key code or an array of codes ("A":["Space","Enter"]). data-keys2 is the same for the second pad. data-exit overrides the launcher URL,
 *     data-no-exit="1" disables hold-B.
 *
 * Standard meaning in every game (keyboard equivalent in brackets):
 *   D-pad / left stick = move, steer, choose [arrows] · A = jump, confirm, go [Space / Enter]
 *   B = back, pause / resume [Escape] · X / Y = second action (run, boost, throw) · Start = pause [P]
 *
 * The whole file can be pasted inside a <script> of a single-file game; it then exposes window.GamepadStd.
 */
(function () {
  'use strict';
  if (window.GamepadStd) return;

  var NAMES = ['A', 'B', 'X', 'Y', 'LB', 'RB', 'LT', 'RT', 'select', 'start', 'LS', 'RS', 'up', 'down', 'left', 'right', 'home'];
  var DIN = { A: 0, B: 1, X: 3, Y: 4, LB: 6, RB: 7, LT: 8, RT: 9, select: 10, start: 11, home: 12, LS: 13, RS: 14 };
  var rawGet = navigator.getGamepads ? navigator.getGamepads.bind(navigator) : function () { return []; };

  function mk(p, v) { p = !!p; return { pressed: p, touched: p, value: v == null ? (p ? 1 : 0) : v }; }
  function isDinput(gp) { return gp.mapping !== 'standard' && gp.buttons.length >= 15 && gp.axes.length >= 8; }

  function normalize(gp) {
    if (!gp) return null;
    var B = gp.buttons, A = gp.axes, i, n, b;
    var out = {
      id: gp.id, index: gp.index, connected: gp.connected, timestamp: gp.timestamp, mapping: 'standard',
      buttons: [], axes: [A[0] || 0, A[1] || 0, A[2] || 0, A[3] || 0], raw: gp,
      vibrationActuator: gp.vibrationActuator || null, hapticActuators: gp.hapticActuators || []
    };
    if (isDinput(gp)) {
      var hx = A[6] || 0, hy = A[7] || 0;
      for (i = 0; i < NAMES.length; i++) {
        n = NAMES[i];
        if (n === 'up') b = mk(hy < -0.5);
        else if (n === 'down') b = mk(hy > 0.5);
        else if (n === 'left') b = mk(hx < -0.5);
        else if (n === 'right') b = mk(hx > 0.5);
        else if (n === 'LT' || n === 'RT') {
          var ax = A[n === 'LT' ? 4 : 5], t = ax == null ? 0 : (ax + 1) / 2, rb = B[DIN[n]];
          var pressed = (rb && rb.pressed) || t > 0.5;
          b = mk(pressed, Math.max(t, pressed ? 1 : 0));
        } else { var r = B[DIN[n]]; b = r ? mk(r.pressed, r.value) : mk(false); }
        out.buttons.push(b);
      }
    } else {
      for (i = 0; i < NAMES.length; i++) { var s = B[i]; out.buttons.push(s ? mk(s.pressed, s.value) : mk(false)); }
    }
    return out;
  }

  function pads() {
    var raw, list = [], i;
    try { raw = rawGet() || []; } catch (e) { raw = []; }
    for (i = 0; i < raw.length; i++) list.push(normalize(raw[i]));
    return list;
  }
  navigator.getGamepads = pads;

  /* ---- read(channel): booleans + press edges per connected pad ---- */
  var prevByChannel = {};
  function read(channel) {
    channel = channel || 'default';
    var prevMap = prevByChannel[channel] || (prevByChannel[channel] = {});
    var list = pads(), res = [], i, j, n;
    for (i = 0; i < list.length; i++) {
      var gp = list[i];
      if (!gp || !gp.connected) continue;
      var s = { index: gp.index, id: gp.id, just: {}, released: {}, any: false };
      var ax = gp.axes[0], ay = gp.axes[1];
      if (Math.hypot(ax, ay) < 0.3) { ax = 0; ay = 0; }
      s.ax = ax; s.ay = ay; s.rx = gp.axes[2]; s.ry = gp.axes[3];
      for (j = 0; j < NAMES.length; j++) { n = NAMES[j]; s[n] = gp.buttons[j].pressed; }
      s.left = s.left || ax < -0.5; s.right = s.right || ax > 0.5; s.up = s.up || ay < -0.5; s.down = s.down || ay > 0.5;
      var prev = prevMap[gp.index] || {}, now = {};
      for (j = 0; j < NAMES.length; j++) {
        n = NAMES[j]; now[n] = s[n];
        s.just[n] = s[n] && !prev[n]; s.released[n] = !s[n] && !!prev[n];
        if (s[n]) s.any = true;
      }
      prevMap[gp.index] = now;
      res.push(s);
    }
    return res;
  }

  /* ---- navRepeat(s, channel): menu movement with 350 ms delay then 140 ms repeat ---- */
  var navTimers = {};
  function navRepeat(s, channel) {
    var key = (channel || 'default') + ':' + s.index, t = navTimers[key] || (navTimers[key] = {}), now = performance.now(), out = {};
    ['up', 'down', 'left', 'right'].forEach(function (d) {
      if (!s[d]) { t[d] = 0; out[d] = false; return; }
      if (!t[d]) { t[d] = now + 350; out[d] = true; return; }
      if (now >= t[d]) { t[d] = now + 140; out[d] = true; return; }
      out[d] = false;
    });
    return out;
  }

  /* ---- hold B for 2 s = back to the arcade ---- */
  var script = document.currentScript, cfg = (script && script.dataset) || {};
  var exitUrl = cfg.exit || new URL('index.html', (script && script.src) || location.href).href;
  // hold-B is off only on the launcher itself (other pages may also be called index.html, e.g. tetris/index.html)
  var here = location.href.split(/[?#]/)[0];
  var noExit = cfg.noExit === '1' || here === exitUrl || here + 'index.html' === exitUrl;
  var HOLD = 2000, holdStart = 0, ring = null, exiting = false;
  function ensureRing() {
    if (ring) return ring;
    ring = document.createElement('div');
    ring.id = 'gamepad-std-exit';
    ring.style.cssText = 'position:fixed;left:50%;bottom:6%;transform:translateX(-50%);z-index:2147483647;display:none;align-items:center;gap:14px;' +
      'padding:12px 22px;border-radius:999px;background:rgba(10,20,40,.78);color:#fff;font:700 26px/1 "Baloo 2","Fredoka","Lilita One",Nunito,Arial,sans-serif;' +
      'box-shadow:0 8px 24px rgba(0,0,0,.4);pointer-events:none;';
    ring.innerHTML = '<svg width="56" height="56" viewBox="0 0 56 56" style="display:block"><circle cx="28" cy="28" r="23" fill="none" stroke="rgba(255,255,255,.25)" stroke-width="7"/>' +
      '<circle id="gamepad-std-arc" cx="28" cy="28" r="23" fill="none" stroke="#ffd54f" stroke-width="7" stroke-linecap="round" stroke-dasharray="144.5" stroke-dashoffset="144.5" transform="rotate(-90 28 28)"/>' +
      '<text x="28" y="37" text-anchor="middle" font-size="24" font-weight="700" fill="#fff" font-family="Arial">B</text></svg><span>🕹️ Arcade</span>';
    (document.body || document.documentElement).appendChild(ring);
    return ring;
  }
  function exitToArcade() { if (exiting) return; exiting = true; window.dispatchEvent(new Event('arcade-exit')); location.href = exitUrl; }
  function tickExit() {
    var list = pads(), held = false, i;
    for (i = 0; i < list.length; i++) if (list[i] && list[i].connected && list[i].buttons[1].pressed) held = true;
    var el = document.activeElement, typing = el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA');
    if (held && !typing) {
      if (!holdStart) holdStart = performance.now();
      var p = Math.min(1, (performance.now() - holdStart) / HOLD);
      if (p > 0.15) { var r = ensureRing(); r.style.display = 'flex'; r.querySelector('#gamepad-std-arc').setAttribute('stroke-dashoffset', String(144.5 * (1 - p))); }
      if (p >= 1) exitToArcade();
    } else { holdStart = 0; if (ring) ring.style.display = 'none'; }
  }

  /* ---- optional keyboard synthesis for keyboard-only games ---- */
  var KEY = {
    Space: [' ', 32], Enter: ['Enter', 13], Escape: ['Escape', 27], ShiftLeft: ['Shift', 16], ShiftRight: ['Shift', 16], Tab: ['Tab', 9], Backspace: ['Backspace', 8],
    ArrowUp: ['ArrowUp', 38], ArrowDown: ['ArrowDown', 40], ArrowLeft: ['ArrowLeft', 37], ArrowRight: ['ArrowRight', 39]
  };
  function keyInfo(code) {
    if (KEY[code]) return { key: KEY[code][0], keyCode: KEY[code][1] };
    var m = /^Key([A-Z])$/.exec(code); if (m) return { key: m[1].toLowerCase(), keyCode: m[1].charCodeAt(0) };
    m = /^Digit(\d)$/.exec(code); if (m) return { key: m[1], keyCode: 48 + Number(m[1]) };
    return { key: code, keyCode: 0 };
  }
  function sendKey(type, code) {
    var info = keyInfo(code);
    var ev = new KeyboardEvent(type, { key: info.key, code: code, keyCode: info.keyCode, which: info.keyCode, bubbles: true, cancelable: true });
    try { Object.defineProperty(ev, 'keyCode', { get: function () { return info.keyCode; } }); Object.defineProperty(ev, 'which', { get: function () { return info.keyCode; } }); } catch (e) { /* ignore */ }
    ev.gamepadStd = true;
    var el = document.activeElement; if (!el || el === document.documentElement) el = document.body || document.documentElement;
    el.dispatchEvent(ev);
  }
  var keyMaps = [];
  try { if (cfg.keys) keyMaps[0] = JSON.parse(cfg.keys); if (cfg.keys2) keyMaps[1] = JSON.parse(cfg.keys2); } catch (e) { console.warn('gamepad-std: bad data-keys JSON', e); }
  // Online game adapters read normalized buttons themselves, without synthetic keys.
  if (new URLSearchParams(location.search).has('family')) keyMaps = [];
  var defaultDirs = { up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight' };
  function tickKeys() {
    if (!keyMaps.length) return;
    var states = read('gamepad-std-keys'), slot = 0, i, n;
    for (i = 0; i < states.length && slot < 2; i++, slot++) {
      var s = states[i], map = keyMaps[slot]; if (!map) continue;
      for (n in map) {
        if (n in defaultDirs) continue;
        var codes = [].concat(map[n] || []); if (!codes.length) continue;
        if (s.just[n]) codes.forEach(function (c) { sendKey('keydown', c); });
        else if (s.released[n]) codes.forEach(function (c) { sendKey('keyup', c); });
      }
      // stick-merged directions get edges here (s.just only tracks buttons)
      var dir = dirPrev[slot] || (dirPrev[slot] = {});
      ['up', 'down', 'left', 'right'].forEach(function (d) {
        var codes = [].concat((d in map) ? (map[d] || []) : defaultDirs[d]); if (!codes.length) return;
        if (s[d] && !dir[d]) codes.forEach(function (c) { sendKey('keydown', c); }); else if (!s[d] && dir[d]) codes.forEach(function (c) { sendKey('keyup', c); });
        dir[d] = s[d];
      });
    }
  }
  var dirPrev = [];

  function loop() { try { if (!noExit) tickExit(); tickKeys(); } catch (e) { /* never break the game */ } requestAnimationFrame(loop); }
  requestAnimationFrame(loop);

  window.GamepadStd = { NAMES: NAMES, pads: pads, read: read, navRepeat: navRepeat, exitToArcade: exitToArcade, exitUrl: exitUrl, normalize: normalize, version: 1 };
})();
