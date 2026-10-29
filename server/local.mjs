import { dataRoot } from './paths.mjs';
// Local controller-play entry point. All saves go through the public server's
// single writer; the family password is automatically supplied only on loopback.
import http from 'node:http';
import { readFileSync } from 'node:fs';
import { createHmac, randomBytes } from 'node:crypto';
const { secret } = JSON.parse(readFileSync(new URL('auth.json', dataRoot)));
const port = Number(process.env.ARCADE_PORT || 8777);
const upstreamPort = Number(process.env.ARCADE_UPSTREAM_PORT || 8780);
http.createServer((req, res) => {
  if (!/^(localhost|127\.0\.0\.1)(:\d+)?$/.test(req.headers.host || '')) {
    res.writeHead(403); res.end('Use the Video Games Lab link for remote play.'); return;
  }
  const value = (Date.now() + 60000) + '.' + randomBytes(16).toString('hex');
  const signature = createHmac('sha256', secret).update(value).digest('hex');
  const cookies = (req.headers.cookie || '').split(';').map(s => s.trim()).filter(s => s && !s.startsWith('arcade_session='));
  cookies.push('arcade_session=' + value + '.' + signature);
  const upstream = http.request({ hostname: '127.0.0.1', port: upstreamPort, path: req.url, method: req.method, headers: { ...req.headers, cookie: cookies.join('; ') } }, response => {
    res.writeHead(response.statusCode, response.headers); response.pipe(res);
  });
  upstream.on('error', () => { if (!res.headersSent) res.writeHead(503, {'Content-Type': 'text/plain'}); res.end('The arcade server is restarting. Please reload in a moment.'); });
  req.on('aborted', () => upstream.destroy());
  res.on('close', () => upstream.destroy());
  req.pipe(upstream);
}).listen(port, '127.0.0.1', () => console.log(`Local arcade: http://127.0.0.1:${port}`));
