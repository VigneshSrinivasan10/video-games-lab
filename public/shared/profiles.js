/* Shared arcade identity, local recovery cache and revisioned cloud saves. */
(() => {
  'use strict';
  let native, storageAvailable = true;
  try { native = window.localStorage; } catch {
    storageAvailable = false;
    const memory = new Map();
    native = { getItem: key => memory.get(key) ?? null, setItem: (key, value) => memory.set(key, value), key: i => [...memory.keys()][i], get length() { return memory.size; } };
  }
  const get = key => { try { return native.getItem(key); } catch { return null; } };
  const put = (key, value) => { try { native.setItem(key, value); return storageAvailable; } catch { return false; } };
  const parse = value => { try { return JSON.parse(value); } catch { return null; } };
  const hosted = !!window.ArcadeBootstrap;
  const name = hosted ? ArcadeBootstrap.name : get('arcade.player');
  const launcher = /\/(?:index.html)?$/.test(location.pathname) && location.pathname.split('/').filter(Boolean).length <= 1;
  const entries = new Map(), pending = new Map(), frozen = new Set();
  let timer, warning = '', gameStatus = '', dialog;
  if (name) put('arcade.player', name);
  const cacheKey = key => 'arcade.save.' + name + '.' + key;
  function cache(key, entry) {
    if (!put(cacheKey(key), JSON.stringify(entry))) warning = hosted ? 'Device storage unavailable · using cloud saves' : 'Device storage unavailable · export a backup';
    paint();
  }
  function entry(key) {
    if (entries.has(key)) return entries.get(key);
    const local = parse(get(cacheKey(key)));
    const cloud = hosted && Object.hasOwn(ArcadeBootstrap.saves, key) ? ArcadeBootstrap.saves[key] : { value: null, revision: 0 };
    let value = local && (local.dirty || !hosted) ? local : { ...cloud, dirty: false };
    if (hosted && local?.dirty && local.revision !== cloud.revision) {
      if (local.value === cloud.value) value = { ...cloud, dirty: false };
      else value = { ...local, conflict: cloud };
    }
    entries.set(key, value);
    return value;
  }
  function legacy(key) {
    const raw = get(key), data = parse(raw);
    if (data?.profiles) {
      if (Array.isArray(data.profiles)) {
        const selected = data.profiles.find(p => typeof p.name === 'string' && p.name.toLowerCase() === name);
        return selected ? JSON.stringify({ ...data, current: 0, profiles: [{ ...selected, name }] }) : null;
      }
      const match = Object.keys(data.profiles).find(n => n.toLowerCase() === name);
      return match ? JSON.stringify({ ...data, current: name, profiles: { [name]: data.profiles[match] } }) : null;
    }
    return get('arcade.legacy-owner') === name ? raw : null;
  }
  const storage = {
    getItem(key) {
      if (!name) return null;
      key = String(key); const e = entry(key);
      if (e.value === null && e.revision === 0 && !e.dirty) {
        const migrated = legacy(key);
        if (migrated !== null) storage.setItem(key, migrated);
      }
      return e.value;
    },
    setItem(key, value) {
      if (!name || frozen.has(String(key))) return;
      key = String(key); const e = entry(key), next = String(value);
      if (next === e.value) return;
      e.value = next; e.dirty = true; cache(key, e); schedule();
    },
    removeItem(key) { if (!name || frozen.has(String(key))) return; const e = entry(String(key)); e.value = null; e.dirty = true; cache(String(key), e); schedule(); }
  };
  async function api(path, body) {
    const res = await fetch('/api/profile/' + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), keepalive: JSON.stringify(body).length < 60000, signal: AbortSignal.timeout(10000) });
    const value = await res.json();
    if (!res.ok) throw Object.assign(Error(value.error || 'Connection unavailable'), { status: res.status, payload: value });
    return value;
  }
  function schedule() { clearTimeout(timer); timer = setTimeout(sync, 500); }
  async function saveOne(key, e) {
    const value = e.value;
    try {
      const result = await api('save', { name, key, value, revision: e.revision });
      e.revision = result.revision; e.dirty = e.value !== value; warning = ''; cache(key, e);
    } catch (error) {
      if (error.status === 409) {
        if (e.value === error.payload.value) { e.revision = error.payload.revision; e.dirty = false; }
        else e.conflict = error.payload;
      } else warning = error.status === 403 || error.status === 401 ? 'Player session changed · return to arcade' : 'Saved here · sync pending';
      cache(key, e);
    }
  }
  async function sync() {
    if (!hosted || !name) return;
    clearTimeout(timer);
    for (const [key, e] of entries) {
      if (!e.dirty || e.conflict) continue;
      if (!pending.has(key)) {
        const job = saveOne(key, e).finally(() => pending.delete(key)); pending.set(key, job);
      }
    }
    await Promise.all([...pending.values()]);
    paint();
    if ([...entries.values()].some(e => e.dirty && !e.conflict)) timer = setTimeout(sync, warning ? 15000 : 500);
  }
  function status() {
    if ([...entries.values()].some(e => e.conflict)) return 'Save conflict · choose progress';
    if (warning) return warning;
    if (gameStatus) return gameStatus;
    if (!hosted) return 'Saved on this device';
    return [...entries.values()].some(e => e.dirty) ? 'Saved here · syncing…' : 'Progress synced';
  }
  function paint() { document.querySelectorAll('[data-arcade-status]').forEach(node => { node.textContent = status(); }); }
  function nextURL() {
    const raw = new URLSearchParams(location.search).get('next');
    if (!raw) return '/index.html';
    const url = new URL(raw, location.origin);
    return url.origin === location.origin && !url.pathname.startsWith('/api/') && url.pathname !== '/login' ? url.pathname + url.search + url.hash : '/index.html';
  }
  async function switchPlayer() {
    window.dispatchEvent(new Event('arcade-exit'));
    await sync();
    location.href = '/index.html?switch=1&next=' + encodeURIComponent(launcher ? nextURL() : location.pathname + location.search + location.hash);
  }
  function exportBackup() {
    const saves = {};
    for (let i = 0; i < native.length; i++) { const key = native.key(i); if (key.startsWith('arcade.save.' + name + '.')) saves[key] = parse(get(key)); }
    for (const [key, e] of entries) saves[cacheKey(key)] = e;
    const url = URL.createObjectURL(new Blob([JSON.stringify({ name, saves }, null, 2)], { type: 'application/json' }));
    const a = document.createElement('a'); a.href = url; a.download = 'arcade-' + name + '-backup.json'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  function account() {
    dialog.innerHTML = '<h2>Your arcade profile</h2><p id="arcade-details"></p><p data-arcade-status></p><div id="arcade-conflicts"></div><button id="arcade-sync">Sync now</button><button id="arcade-export">Export backup</button><button id="arcade-switch">Switch player</button><button id="arcade-import">Import old device progress</button><button id="arcade-close">Keep playing</button>';
    dialog.querySelector('#arcade-details').textContent = 'Playing as ' + name + '. Use this username on another device to resume. Anyone using the same name shares this profile.';
    for (const [key, e] of entries) if (e.conflict) {
      const row = document.createElement('p'); row.textContent = key + ': ';
      for (const [label, local] of [['Keep this device’s save', true], ['Use server save', false]]) {
        const b = document.createElement('button'); b.textContent = label;
        b.onclick = async () => {
          e.revision = e.conflict.revision;
          if (!local) { e.value = e.conflict.value; frozen.add(key); }
          e.dirty = local; delete e.conflict; cache(key, e); await sync(); location.reload();
        }; row.append(b);
      }
      dialog.querySelector('#arcade-conflicts').append(row);
    }
    dialog.querySelector('#arcade-sync').onclick = sync;
    dialog.querySelector('#arcade-export').onclick = exportBackup;
    dialog.querySelector('#arcade-switch').onclick = switchPlayer;
    dialog.querySelector('#arcade-close').onclick = () => dialog.close();
    dialog.querySelector('#arcade-import').onclick = () => {
      if (get('arcade.legacy-owner') && get('arcade.legacy-owner') !== name) { alert('Old unnamed saves have already been assigned to another player.'); return; }
      if (confirm('Assign old unnamed browser saves to ' + name + '? They will be imported when you open each game, only where this profile has no save. Existing named profiles are matched automatically.')) { put('arcade.legacy-owner', name); location.reload(); }
    };
    paint(); dialog.showModal();
  }
  function signIn() {
    dialog.innerHTML = '<h2>Who is playing?</h2><p>One username for every game. Use the same name on another device to continue your progress.</p><form id="arcade-signin"><label for="arcade-username">Username</label><input id="arcade-username" name="username" autocomplete="username" pattern="[A-Za-z0-9_-]{2,24}" minlength="2" maxlength="24" required autofocus><p id="arcade-error" role="alert"></p><button>Let’s play</button></form><p>Anyone using the same username shares that profile.</p>';
    dialog.oncancel = e => e.preventDefault();
    dialog.querySelector('form').onsubmit = async e => {
      e.preventDefault(); const button = dialog.querySelector('button'); button.disabled = true;
      const chosen = dialog.querySelector('input').value.trim().toLowerCase();
      try {
        if (['__proto__', 'constructor', 'prototype'].includes(chosen)) throw Error('Please choose another username.');
        if (hosted) await api('login', { name: chosen });
        put('arcade.player', chosen);
        location.href = nextURL();
      } catch (error) { dialog.querySelector('#arcade-error').textContent = error.message; button.disabled = false; }
    };
    dialog.showModal(); dialog.querySelector('input').focus();
  }
  window.ArcadeProfile = { name: name || 'Player', storage, sync, switchPlayer, account, hosted, setGameStatus(value) { gameStatus = value; paint(); } };
  // Recover pending saves from other games, including interrupted navigation.
  if (name) {
    for (let i = 0; i < native.length; i++) { const key = native.key(i), prefix = 'arcade.save.' + name + '.'; if (key.startsWith(prefix)) entry(key.slice(prefix.length)); }
    schedule();
  }
  if (!name && !launcher) location.replace('/index.html?next=' + encodeURIComponent(location.pathname + location.search + location.hash));
  document.addEventListener('DOMContentLoaded', () => {
    const style = document.createElement('style');
    style.textContent = '#arcade-profile-bar{position:fixed;bottom:8px;right:8px;z-index:2147483000;font:13px system-ui;display:flex;gap:8px;align-items:center;background:#fff8e8;color:#183b4b;border:2px solid #d5aa45;border-radius:14px;padding:7px 10px}#arcade-profile-bar button{font:inherit;cursor:pointer;border:0;background:transparent;color:inherit;font-weight:bold}#arcade-profile-dialog{font:17px/1.5 system-ui;color:#183b4b;background:#fffaf0;border:3px solid #d5aa45;border-radius:22px;padding:26px;width:min(480px,90vw);max-height:85vh;box-sizing:border-box}#arcade-profile-dialog::backdrop{background:#10293dcc}#arcade-profile-dialog button,#arcade-profile-dialog input{font:inherit;padding:10px;margin:5px;border:2px solid #a2bbc4;border-radius:10px}#arcade-profile-dialog input{display:block;width:90%}#arcade-profile-dialog button{cursor:pointer;background:#fff0ba}#arcade-profile-dialog h2{font:700 28px system-ui}#arcade-profile-dialog p{font:16px/1.5 system-ui}#arcade-error{color:#a32520}'; document.head.append(style);
    if (window.GamepadStd) { const read = GamepadStd.read; GamepadStd.read = function(...args) { return dialog?.open ? [] : read.apply(this, args); }; }
    dialog = document.createElement('dialog'); dialog.id = 'arcade-profile-dialog'; document.body.append(dialog);
    // Game handlers must not interpret text entry or account-dialog navigation.
    window.addEventListener('keydown', e => { if (dialog.open) e.stopImmediatePropagation(); }, true);
    window.addEventListener('keyup', e => { if (dialog.open) e.stopImmediatePropagation(); }, true);
    if (name) {
      const bar = document.createElement('aside'); bar.id = 'arcade-profile-bar';
      const button = document.createElement('button'); button.textContent = '👤 ' + name; button.onclick = account; bar.append(button);
      const label = document.createElement('span'); label.dataset.arcadeStatus = ''; bar.append(label); document.body.append(bar); paint();
    }
    if (launcher && (!name || new URLSearchParams(location.search).has('switch'))) signIn();
  });
  window.addEventListener('online', sync);
  window.addEventListener('pagehide', sync);
  document.addEventListener('visibilitychange', () => { if (document.hidden) sync(); });
  window.addEventListener('storage', e => {
    if (e.key === 'arcade.player' && e.newValue !== name) { warning = 'Player changed in another tab · return to arcade'; paint(); }
  });
})();
