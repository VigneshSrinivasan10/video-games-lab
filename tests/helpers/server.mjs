import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { randomBytes, scryptSync } from 'node:crypto';
import { tmpdir } from 'node:os';
import path from 'node:path';
import net from 'node:net';
import { fileURLToPath } from 'node:url';

const project = fileURLToPath(new URL('../../', import.meta.url));
async function freePort() {
  const socket = net.createServer();
  socket.listen(0, '127.0.0.1'); await once(socket, 'listening');
  const port = socket.address().port; await new Promise(resolve => socket.close(resolve)); return port;
}
export async function startTestServer({ port } = {}) {
  const directory = await mkdtemp(path.join(tmpdir(), 'video-games-lab-test-'));
  const password = randomBytes(24).toString('hex'), salt = randomBytes(16).toString('hex');
  await writeFile(path.join(directory, 'auth.json'), JSON.stringify({ salt, hash: scryptSync(password, salt, 64).toString('hex'), secret: randomBytes(32).toString('hex') }), { mode: 0o600 });
  const backendPort = await freePort(), localPort = port || await freePort();
  const children = []; let logs = '';
  async function stop() {
    await Promise.all(children.map(async child => {
      if (child.exitCode !== null || child.signalCode !== null) return;
      const exited = once(child, 'exit'); child.kill(); await exited;
    }));
    await rm(directory, { recursive: true, force: true });
  }
  try {
    for (const [file, listen] of [['index.mjs', backendPort], ['local.mjs', localPort]]) {
      const child = spawn(process.execPath, [path.join(project, 'server', file)], { env: { ...process.env, ARCADE_DATA_DIR: directory, ARCADE_PORT: String(listen), ARCADE_UPSTREAM_PORT: String(backendPort) }, stdio: ['ignore', 'pipe', 'pipe'] });
      children.push(child); child.stdout.on('data', b => { logs += b; }); child.stderr.on('data', b => { logs += b; });
      let ready = false;
      for (let i = 0; i < 100; i++) {
        if (child.exitCode !== null) throw new Error(logs);
        try { await fetch(`http://127.0.0.1:${listen}/login`); ready = true; break; } catch { await new Promise(r => setTimeout(r, 50)); }
      }
      if (!ready) throw new Error('Test server did not start: ' + logs);
    }
    return { base: `http://127.0.0.1:${localPort}`, backend: `http://127.0.0.1:${backendPort}`, directory, password, stop };
  } catch (error) { await stop(); throw error; }
}
