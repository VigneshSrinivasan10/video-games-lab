// Shared identity and revisioned game saves. Existing Sudoku/adult saves stay in place.
import { readFileSync, writeFileSync, mkdirSync, renameSync, existsSync } from 'node:fs';
import { createHmac, createHash, timingSafeEqual } from 'node:crypto';
const root = new URL('./.hosting/profiles/', import.meta.url);
mkdirSync(root, { recursive: true, mode: 0o700 });
const secret = JSON.parse(readFileSync(new URL('./.hosting/auth.json', import.meta.url))).secret;
const sign = value => createHmac('sha256', secret).update('profile:' + value).digest('hex');
const validName = name => typeof name === 'string' && /^[-a-z0-9_]{2,24}$/.test(name);
const file = name => new URL(createHash('sha256').update(name).digest('hex') + '.json', root);
const read = name => existsSync(file(name)) ? JSON.parse(readFileSync(file(name))) : { name, saves: {} };
function write(account) {
  const dest = file(account.name), temp = new URL(dest.href + '.tmp');
  writeFileSync(temp, JSON.stringify(account), { mode: 0o600 }); renameSync(temp, dest);
}
export function profileSession(req) {
  const cookie = (req.headers.cookie || '').split(';').map(s => s.trim()).find(s => s.startsWith('arcade_player='));
  if (!cookie) return null;
  const [name, expiry, signature] = cookie.slice(14).split('.');
  const expected = sign(name + '.' + expiry);
  return validName(name) && Number(expiry) > Date.now() && /^[a-f0-9]{64}$/.test(signature || '') && timingSafeEqual(Buffer.from(signature), Buffer.from(expected)) ? name : null;
}
function setCookie(req, res, name) {
  const local = /^(localhost|127\.0\.0\.1)(:\d+)?$/.test(req.headers.host || '');
  const value = name ? name + '.' + (Date.now() + 180 * 86400000) : '';
  res.setHeader('Set-Cookie', `arcade_player=${value ? value + '.' + sign(value) : ''}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${name ? 15552000 : 0}${local ? '' : '; Secure'}`);
}
function send(res, code, data) { res.writeHead(code, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(data)); }
async function body(req) {
  const chunks = []; let size = 0;
  for await (const chunk of req) { size += chunk.length; if (size > 6 * 1024 * 1024) throw Error('Save is too large'); chunks.push(chunk); }
  return JSON.parse(Buffer.concat(chunks).toString());
}
export async function profiles(req, res) {
  const path = new URL(req.url, 'http://localhost').pathname;
  if (!path.startsWith('/api/profile/')) return false;
  try {
    if (path === '/api/profile/login' && req.method === 'POST') {
      const data = await body(req), name = String(data.name || '').trim().toLowerCase();
      if (!validName(name) || ['__proto__', 'constructor', 'prototype'].includes(name)) { send(res, 400, { error: 'Use 2–24 letters, numbers, underscores or hyphens.' }); return true; }
      const account = read(name); write(account); setCookie(req, res, name); send(res, 200, { name }); return true;
    }
    if (path === '/api/profile/logout' && req.method === 'POST') { setCookie(req, res, null); send(res, 200, { ok: true }); return true; }
    const name = profileSession(req);
    if (path === '/api/profile/bootstrap' && req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'text/javascript; charset=utf-8', 'Cache-Control': 'no-store' });
      // External classic script intentionally loads before legacy game scripts.
      res.end('window.ArcadeBootstrap=' + JSON.stringify(name ? read(name) : { name: null, saves: {} }).replace(/</g, '\\u003c') + ';'); return true;
    }
    if (!name) { send(res, 401, { error: 'Choose your arcade username first.' }); return true; }
    if (path === '/api/profile/save' && req.method === 'POST') {
      const data = await body(req);
      if (data.name !== name) { send(res, 403, { error: 'Player changed in another tab. Return to the arcade.' }); return true; }
      if (typeof data.key !== 'string' || !/^[a-zA-Z0-9_.:-]{1,100}$/.test(data.key) || !Number.isInteger(data.revision) || !(data.value === null || typeof data.value === 'string')) { send(res, 400, { error: 'Invalid game save.' }); return true; }
      const account = read(name), old = Object.hasOwn(account.saves, data.key) ? account.saves[data.key] : { revision: 0, value: null };
      if (old.revision !== data.revision) { send(res, 409, { error: 'Another device saved this game.', ...old }); return true; }
      Object.defineProperty(account.saves, data.key, { value: { revision: old.revision + 1, value: data.value }, enumerable: true, writable: true, configurable: true });
      if (Object.keys(account.saves).length > 200 || JSON.stringify(account).length > 32 * 1024 * 1024) { send(res, 413, { error: 'Profile storage is full. Export a backup.' }); return true; }
      write(account); send(res, 200, { revision: old.revision + 1 }); return true;
    }
    send(res, 404, { error: 'Not found' });
  } catch { send(res, 400, { error: 'Could not save progress. Your device copy is kept.' }); }
  return true;
}
