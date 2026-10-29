import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir, symlink, unlink } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { startTestServer } from '../helpers/server.mjs';
import { publicRoot } from '../../server/paths.mjs';
import path from 'node:path';

const legacyPages = ['index.html', 'family-room.html', 'sudoku-kids/', 'sudoku.html', 'nonograms.html', 'mahjong.html', 'reversi.html', 'beat-safari.html', 'chess-quest.html', 'super-mario.html', 'brick-ninja-quest.html', 'world-flight/index.html', 'world-flight/game.html?city=paris', 'berlin-city-flight.html', 'rocket-pals.html', 'pip-and-the-moonstone.html', 'cheese-chase.html', 'orchard-catch.html', 'kitchen-pals.html'];

await test('reorganized arcade preserves routes, authentication, saves, and private boundaries', async t => {
  const server = await startTestServer();
  try {
    const unauthenticated = await fetch(server.backend + '/index.html', { headers: { Accept: 'text/html' }, redirect: 'manual' });
    assert.equal(unauthenticated.status, 303);
    assert.equal((await fetch(server.backend + '/api/profile/bootstrap')).status, 401);
    const login = await fetch(server.backend + '/login', { method: 'POST', body: new URLSearchParams({ password: server.password }), redirect: 'manual' });
    assert.equal(login.status, 303);
    const profile = await fetch(server.base + '/api/profile/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'migration-check' }) });
    assert.equal(profile.status, 200);
    const cookie = profile.headers.get('set-cookie').split(';')[0];
    const headers = { cookie };
    for (const page of legacyPages) {
      const response = await fetch(server.base + '/' + page, { headers, redirect: 'manual' });
      assert.equal(response.status, 200, page);
      assert.match(response.headers.get('content-type'), /text\/html/, page);
      const text = await response.text();
      const base = new URL(text.match(/<base href="([^"]+)"/)?.[1] || page, server.base + '/');
      for (const match of text.matchAll(/<(?:script|link)\b[^>]*(?:src|href)="([^"]+)"/g)) {
        const asset = new URL(match[1], base);
        if (asset.origin !== new URL(server.base).origin) continue;
        assert.equal((await fetch(asset, { headers, method: asset.pathname.startsWith('/api/') ? 'GET' : 'HEAD' })).status, 200, page + ' -> ' + asset.pathname);
      }
    }
    await t.test('canonical game folders also load', async () => {
      for (const entry of await readdir(path.join(publicRoot, 'games'), { withFileTypes: true })) {
        if (entry.isDirectory()) assert.equal((await fetch(server.base + '/games/' + entry.name + '/', { headers })).status, 200, entry.name);
      }
    });
    await t.test('save contents and revision conflicts survive module relocation', async () => {
      const save = value => fetch(server.base + '/api/profile/save', { method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'migration-check', key: 'still-sudoku-v1', revision: 0, value }) });
      assert.equal((await save('{"completed":7}')).status, 200);
      assert.equal((await save('{"completed":8}')).status, 409);
      const filename = createHash('sha256').update('migration-check').digest('hex') + '.json';
      const data = JSON.parse(await readFile(path.join(server.directory, 'profiles', filename)));
      assert.equal(data.saves['still-sudoku-v1'].value, '{"completed":7}');
      assert.equal(data.saves['still-sudoku-v1'].revision, 1);
      const bootstrap = await (await fetch(server.base + '/api/profile/bootstrap', { headers })).text();
      assert.ok(bootstrap.includes('completed'));
    });
    await t.test('module aliases, worker imports, and map byte ranges work', async () => {
      for (const asset of ['arcade-profile.js', 'gamepad-std.js', 'family-room.js', 'adult-games/nonograms.json', 'adult-games/reversi-worker.mjs', 'adult-games/vendor/reversi/ai.mjs', 'adult-games/vendor/SOURCES.txt', 'world-flight/vendor/three.min.js', 'world-flight/vendor/water.js', 'sudoku-kids/engine.js']) {
        assert.equal((await fetch(server.base + '/' + asset, { headers })).status, 200, asset);
      }
      const asset = '/games/city-flight/berlin/data/berlin.bin';
      const response = await fetch(server.base + asset, { headers: { ...headers, Range: 'bytes=0-31' } });
      assert.equal(response.status, 206); assert.equal((await response.arrayBuffer()).byteLength, 32);
      for (const file of await readdir(path.join(publicRoot, 'games/city-flight/data'))) {
        assert.equal((await fetch(server.base + '/world-flight/data/' + file, { headers, method: 'HEAD' })).status, 200, file);
      }
    });
    await t.test('source, credentials, hidden paths, and symlinks remain private', async () => {
      for (const route of ['/.hosting/auth.json', '/.git/config', '/server/index.mjs', '/server/paths.mjs', '/scripts/setup-auth.py', '/README.md', '/docs/development.md', '/local-games/astray/index.html', '/games/%2e%2e%2f%2e%2e%2f.hosting/auth.json']) {
        assert.equal((await fetch(server.base + route, { headers })).status, 404, route);
      }
      const link = path.join(publicRoot, 'test-private-link.json');
      await symlink(path.join(server.directory, 'auth.json'), link);
      try { assert.equal((await fetch(server.base + '/test-private-link.json', { headers })).status, 404); } finally { await unlink(link); }
    });
  } finally { await server.stop(); }
});
