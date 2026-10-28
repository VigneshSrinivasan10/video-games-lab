// Shared game-file and profile server. No dependencies. Local play proxies here.
import http from 'node:http';
import { realpath, stat } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { online } from './arcade-online.mjs';

const root = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.ARCADE_PORT || 8780);
const games = new Set(['arcade-profile.js','index.html','nonograms.html','mahjong.html','reversi.html','sudoku.html','family-room.html','family-room.js','gamepad-std.js','chess-quest.html','super-mario.html',
  'brick-ninja-quest.html','rocket-pals.html','pip-and-the-moonstone.html','berlin-city-flight.html',
  'cheese-chase.html','orchard-catch.html','kitchen-pals.html','beat-safari.html']);
const folders = new Set(['sudoku-kids','world-flight','adult-games','infinite-mario','neverball','astray','platforms','tetris','hextris']);
const types = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8',
  '.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8',
  '.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg',
  '.svg':'image/svg+xml','.gif':'image/gif','.webp':'image/webp','.ico':'image/x-icon',
  '.wasm':'application/wasm','.data':'application/octet-stream','.bin':'application/octet-stream',
  '.glb':'model/gltf-binary','.gltf':'model/gltf+json','.obj':'text/plain','.mtl':'text/plain',
  '.mp3':'audio/mpeg','.ogg':'audio/ogg','.wav':'audio/wav','.mid':'audio/midi',
  '.woff':'font/woff','.woff2':'font/woff2','.ttf':'font/ttf','.otf':'font/otf',
  '.webmanifest':'application/manifest+json','.webapp':'application/json','.txt':'text/plain',
  '.mp4':'video/mp4','.eot':'application/vnd.ms-fontobject','.appcache':'text/cache-manifest'};

export const server = http.createServer(async (req, res) => {
  res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('Referrer-Policy','same-origin');
  res.setHeader('Cache-Control','private, no-store');
  res.setHeader('X-Frame-Options','SAMEORIGIN');
  try { if (await online(req,res)) return; } catch { if(!res.headersSent) { res.writeHead(400,{'Content-Type':'application/json'}); res.end('{"error":"Invalid request"}'); } else res.end(); return; }
  const end = (code, message) => { res.writeHead(code, {'Content-Type':'text/plain; charset=utf-8'}); res.end(message); };
  if (!['GET','HEAD'].includes(req.method)) { res.setHeader('Allow','GET, HEAD'); return end(405,'Method not allowed'); }
  try {
    const raw = decodeURIComponent((req.url || '/').split('?')[0]);
    if (raw === '/favicon.ico') { res.writeHead(204); return res.end(); }
    const parts = raw.split('/').filter(Boolean);
    if (raw.includes('\\') || raw.includes('\0') || parts.some(p => p.startsWith('.') || ['node_modules','package.json','package-lock.json'].includes(p))) return end(404,'Not found');
    if (!parts.length) parts.push('index.html');
    if (!(parts.length === 1 && games.has(parts[0])) && !folders.has(parts[0])) return end(404,'Not found');
    let filename = path.join(root,...parts);
    let info = await stat(filename);
    if (info.isDirectory()) {
      if (!raw.endsWith('/')) { res.writeHead(301,{Location:'/'+parts.map(encodeURIComponent).join('/')+'/'}); return res.end(); }
      filename = path.join(filename,'index.html');
      info = await stat(filename);
    }
    const actual = await realpath(filename);
    if (actual !== filename || !actual.startsWith(root + path.sep) || !info.isFile() || !types[path.extname(actual)]) return end(404,'Not found');
    let start = 0, finish = info.size - 1, status = 200;
    res.setHeader('Accept-Ranges','bytes');
    if (req.headers.range) {
      const match = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range);
      if (!match || (!match[1] && !match[2])) return end(416,'Invalid range');
      if (!match[1]) start = Math.max(0,info.size - Number(match[2]));
      else { start = Number(match[1]); if (match[2]) finish = Math.min(finish,Number(match[2])); }
      if (start > finish || start >= info.size) { res.setHeader('Content-Range',`bytes */${info.size}`); return end(416,'Invalid range'); }
      status = 206;
      res.setHeader('Content-Range',`bytes ${start}-${finish}/${info.size}`);
    }
    res.writeHead(status,{'Content-Type':types[path.extname(actual)],'Content-Length':Math.max(0,finish-start+1)});
    if (req.method === 'HEAD' || !info.size) return res.end();
    const stream = createReadStream(actual,{start,end:finish});
    stream.on('error',()=>res.destroy());
    res.on('close',()=>stream.destroy());
    stream.pipe(res);
  } catch (error) { end(error instanceof URIError ? 400 : 404,'Not found'); }
});
server.requestTimeout = 15000;
server.headersTimeout = 10000;
server.listen(port,'127.0.0.1',()=>console.log(`Arcade: http://127.0.0.1:${port}`));
