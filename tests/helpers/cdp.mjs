// Minimal DevTools-protocol harness for snap Chromium (no puppeteer available).
// Usage (ESM):  import { launch } from './cdp.mjs';
//   const b = await launch({ headed: false });
//   await b.addInit(fs.readFileSync('fakepad.js','utf8'));   // before goto()
//   await b.goto('http://127.0.0.1:8766/super-mario.html');
//   await b.eval('__fake.tap("A")');  // press the button the controller calls A for 120 ms
//   await b.screenshot('shot.png'); console.log(b.logs); await b.close();
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

export async function launch(opts = {}) {
  const port = opts.port || 9300 + Math.floor(Math.random() * 500);
  const dir = path.join(os.homedir(), 'snap/chromium/common/claude-test', String(process.pid) + '-' + port);
  fs.mkdirSync(dir, { recursive: true });
  const args = [
    '--remote-debugging-port=' + port, '--user-data-dir=' + dir, '--no-first-run', '--no-default-browser-check',
    '--window-size=1280,760', '--autoplay-policy=no-user-gesture-required', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader',
    ...(opts.args || [])
  ];
  if (!opts.headed) args.push('--headless=new', '--disable-gpu');
  const env = { ...process.env }; if (opts.headed) env.DISPLAY = env.DISPLAY || ':0';
  const proc = spawn('chromium', [...args, 'about:blank'], { stdio: 'ignore', env });
  let ws, target;
  for (let i = 0; i < 100; i++) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
      target = list.find((t) => t.type === 'page');
      if (target) break;
    } catch (e) { /* not up yet */ }
    await new Promise((r) => setTimeout(r, 150));
  }
  if (!target) throw new Error('Chromium did not start on port ' + port);
  ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  let id = 0; const pending = new Map(); const logs = []; const handlers = [];
  ws.onmessage = (m) => {
    const msg = JSON.parse(m.data);
    if (msg.id && pending.has(msg.id)) { const { res, rej } = pending.get(msg.id); pending.delete(msg.id); msg.error ? rej(new Error(JSON.stringify(msg.error))) : res(msg.result); return; }
    if (msg.method === 'Runtime.consoleAPICalled') logs.push(msg.params.type.toUpperCase() + ' ' + msg.params.args.map((a) => a.value ?? a.description ?? '').join(' '));
    if (msg.method === 'Runtime.exceptionThrown') logs.push('EXC ' + (msg.params.exceptionDetails.exception?.description || msg.params.exceptionDetails.text));
    if (msg.method === 'Log.entryAdded') logs.push('LOG ' + msg.params.entry.level + ' ' + msg.params.entry.text);
    handlers.forEach((h) => h(msg));
  };
  const send = (method, params = {}) => new Promise((res, rej) => { const i = ++id; pending.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params })); });
  // Re-attach Runtime/Page after a navigation to a new document (same target, so nothing to do; kept for clarity).
  await send('Runtime.enable'); await send('Page.enable'); await send('Log.enable');
  const b = {
    logs, send, proc,
    errors() { return logs.filter((l) => /^(ERR|EXC|LOG error)/.test(l)); },
    addInit: (source) => send('Page.addScriptToEvaluateOnNewDocument', { source }),
    async goto(url) { await send('Page.navigate', { url }); await new Promise((r) => setTimeout(r, 800)); },
    async eval(expression) {
      const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
      if (r.exceptionDetails) throw new Error('eval failed: ' + (r.exceptionDetails.exception?.description || r.exceptionDetails.text) + ' in ' + expression);
      return r.result.value;
    },
    // Fire-and-forget evaluate for actions that navigate the page (errors like "target navigated" are swallowed).
    async fire(expression) { try { await send('Runtime.evaluate', { expression, awaitPromise: false, returnByValue: true }); } catch (e) { /* navigated */ } },
    async screenshot(file) { const r = await send('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(file, Buffer.from(r.data, 'base64')); return file; },
    // Real keyboard press through CDP (gives a user gesture in headed mode). code like 'Space', key like ' '.
    async press(code, key, hold = 150) {
      const vk = { Space: 32, Enter: 13, Escape: 27, ArrowLeft: 37, ArrowUp: 38, ArrowRight: 39, ArrowDown: 40 }[code] || (code.startsWith('Key') ? code.charCodeAt(3) : 0);
      const base = { code, key, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk };
      await send('Input.dispatchKeyEvent', { type: 'keyDown', ...base, text: key.length === 1 ? key : undefined });
      await new Promise((r) => setTimeout(r, hold));
      await send('Input.dispatchKeyEvent', { type: 'keyUp', ...base });
    },
    sleep: (ms) => new Promise((r) => setTimeout(r, ms)),
    async signIn(base, name = 'test-player') {
      await this.goto(base + '/index.html');
      const status = await this.eval(`fetch('/api/profile/login', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({name:${JSON.stringify(name)}})}).then(r=>r.status)`);
      if (status !== 200) throw new Error('Test profile login failed: ' + status);
    },
    async close() {
      try { await send('Browser.close'); } catch (e) { /* browser may already be closed */ }
      if (proc.exitCode === null && proc.signalCode === null) {
        await new Promise(resolve => { proc.once('exit', resolve); proc.kill(); });
      }
      await new Promise(resolve => setTimeout(resolve, 500));
      await fs.promises.rm(dir, { recursive: true, force: true, maxRetries: 20, retryDelay: 200 });
    }
  };
  return b;
}
