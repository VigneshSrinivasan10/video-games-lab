(async function () {
  var optionalTiles = Array.from(document.querySelectorAll('[data-optional-asset]'));
  await Promise.all(optionalTiles.map(async function (tile) {
    try {
      var response = await fetch(tile.dataset.optionalAsset, { method: 'HEAD', redirect: 'manual', signal: AbortSignal.timeout(3000) });
      tile.hidden = !response.ok;
    } catch (_) { tile.hidden = true; }
  }));
  document.getElementById('optional-games-title').hidden = optionalTiles.every(function (tile) { return tile.hidden; });
  var tiles = Array.prototype.slice.call(document.querySelectorAll('.tile:not([hidden])'));
  var idx = 0;
  try {
    var savedIdx = parseInt(localStorage.getItem('arcade.idx') || '0', 10) || 0;
    idx = Math.max(0, Math.min(tiles.length - 1, savedIdx));
  } catch (e) {}
  function paint() { if(document.querySelector('dialog[open]'))return;
    tiles.forEach(function (t, i) { t.classList.toggle('focus', i === idx); });
    tiles[idx].focus({ preventScroll: true });
    tiles[idx].scrollIntoView({ block: 'nearest' });
    try { localStorage.setItem('arcade.idx', String(idx)); } catch (e) {}
  }
  function moveRow(dir) {
    // Use layout positions (offsetTop/offsetLeft): the focused tile is scaled, so its
    // bounding rect would sit a few pixels off and confuse the row test.
    var cur = tiles[idx], best = -1, bestD = 1e9;
    tiles.forEach(function (t, i) {
      var dy = t.offsetTop - cur.offsetTop;
      if (dir > 0 ? dy <= 10 : dy >= -10) return;
      var d = Math.abs(dy) * 10 + Math.abs(t.offsetLeft - cur.offsetLeft);
      if (d < bestD) { bestD = d; best = i; }
    });
    if (best >= 0) idx = best; else idx = dir > 0 ? 0 : tiles.length - 1;
  }
  function act() { if(document.querySelector('dialog[open]'))return; window.location.href = tiles[idx].getAttribute('href'); }
  document.addEventListener('keydown', function (e) {
    switch (e.key) {
      case 'ArrowRight': idx = (idx + 1) % tiles.length; break;
      case 'ArrowLeft': idx = (idx - 1 + tiles.length) % tiles.length; break;
      case 'ArrowDown': moveRow(1); break;
      case 'ArrowUp': moveRow(-1); break;
      case 'Enter': case ' ': act(); break;
      default: return;
    }
    e.preventDefault(); paint();
  });
  tiles.forEach(function (t, i) { t.addEventListener('mouseenter', function () { idx = i; paint(); }); });
  function pollPad() {
    if(document.querySelector('dialog[open]')){requestAnimationFrame(pollPad);return;}
    var states = GamepadStd.read('launcher');
    for (var i = 0; i < states.length; i++) {
      var s = states[i], nav = GamepadStd.navRepeat(s, 'launcher');
      if (nav.left) idx = (idx - 1 + tiles.length) % tiles.length;
      if (nav.right) idx = (idx + 1) % tiles.length;
      if (nav.up) moveRow(-1);
      if (nav.down) moveRow(1);
      if (nav.left || nav.right || nav.up || nav.down) paint();
      if (s.just.A) act();
    }
    requestAnimationFrame(pollPad);
  }
  requestAnimationFrame(pollPad);
  paint();
})();
