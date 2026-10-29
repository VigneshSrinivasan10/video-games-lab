// Injected before any page script (Page.addScriptToEvaluateOnNewDocument).
// Fakes the real controller exactly as Chromium exposes it on this machine:
// GameSir Nova in Android/D-input mode = "Zikway HID gamepad", mapping "", 16 buttons, 8 axes.
// Raw layout: A=0 B=1 X=3 Y=4 LB=6 RB=7 LT=8 RT=9 select=10 start=11 home=12 LS=13 RS=14,
// d-pad hat on axes[6] (x) and axes[7] (y), triggers on axes[4]/[5] (-1 released), right stick axes[2]/[3].
(function () {
  var DIN = { A: 0, B: 1, X: 3, Y: 4, LB: 6, RB: 7, LT: 8, RT: 9, select: 10, start: 11, home: 12, LS: 13, RS: 14 };
  function makePad(index) {
    var btn = []; for (var i = 0; i < 16; i++) btn.push({ pressed: false, touched: false, value: 0 });
    return { id: 'Zikway HID gamepad (Vendor: 3537 Product: 1041)', index: index, connected: true, mapping: '', timestamp: 0, buttons: btn, axes: [0, 0, 0, 0, -1, -1, 0, 0] };
  }
  var pads = [makePad(0)];
  navigator.getGamepads = function () { return pads.slice(); };
  function set(name, down, p) {
    var g = pads[p || 0]; if (!g) return;
    if (name in DIN) { var b = g.buttons[DIN[name]]; b.pressed = !!down; b.touched = !!down; b.value = down ? 1 : 0; }
    else if (name === 'up') g.axes[7] = down ? -1 : 0;
    else if (name === 'down') g.axes[7] = down ? 1 : 0;
    else if (name === 'left') g.axes[6] = down ? -1 : 0;
    else if (name === 'right') g.axes[6] = down ? 1 : 0;
    else throw new Error('fakepad: unknown button ' + name);
    g.timestamp = performance.now();
  }
  window.__fake = {
    pads: pads,
    set: set,
    stick: function (x, y, p) { var g = pads[p || 0]; g.axes[0] = x; g.axes[1] = y; g.timestamp = performance.now(); },
    // press for ms (default 120) then release, resolve 80 ms later so the game has polled the release
    tap: function (name, ms, p) { set(name, true, p); return new Promise(function (r) { setTimeout(function () { set(name, false, p); setTimeout(r, 80); }, ms || 120); }); },
    hold: function (name, ms, p) { return this.tap(name, ms, p); },
    addPad: function () { var g = makePad(pads.length); pads.push(g); return g.index; },
    disconnect: function (p) { pads[p || 0].connected = false; }
  };
})();
