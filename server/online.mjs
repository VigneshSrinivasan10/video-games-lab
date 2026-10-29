import { dataRoot } from './paths.mjs';
import { profiles, profileSession } from './profiles.mjs';
import { sudokuAccounts } from './sudoku.mjs';
import { readFileSync } from 'node:fs';
import { scrypt, timingSafeEqual, randomBytes, createHmac } from 'node:crypto';
import { promisify } from 'node:util';
const auth = JSON.parse(readFileSync(new URL('auth.json', dataRoot)));
const derive = promisify(scrypt), rooms = new Map(), attempts = new Map();
// Online family play is limited to games without reaction-time demands.
const allowed = new Set(['chess','kitchen']);
const sign = v => createHmac('sha256',auth.secret).update(v).digest('hex');
const equal = (a,b) => typeof a === 'string' && a.length === b.length && timingSafeEqual(Buffer.from(a),Buffer.from(b));
function loggedIn(req) {
  const cookie = (req.headers.cookie || '').split(';').map(x=>x.trim()).find(x=>x.startsWith('arcade_session='));
  if (!cookie) return false;
  const [expiry,nonce,sig] = cookie.slice(15).split('.');
  return Number(expiry)>Date.now() && nonce && equal(sig,sign(expiry+'.'+nonce));
}
function json(res, code, data) { res.writeHead(code,{'Content-Type':'application/json','Cache-Control':'no-store'}); res.end(JSON.stringify(data)); }
async function body(req, limit=256000) {
  const chunks=[]; let n=0;
  for await (const chunk of req) { n+=chunk.length; if(n>limit) throw new Error('Too large'); chunks.push(chunk); }
  return Buffer.concat(chunks).toString();
}
const loginPage = error => `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Welcome to Family Arcade</title><style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:linear-gradient(#38b8ff,#134693);font:22px system-ui;color:#17365a}main{margin:20px;padding:32px;max-width:420px;background:#f1faff;border:6px solid #ffcf40;border-radius:28px;text-align:center;box-shadow:0 12px 0 #15396c}h1{font-size:32px}input,button{font:inherit;box-sizing:border-box;width:100%;padding:14px;border-radius:14px;margin:8px 0}button{background:#ffcf40;border:3px solid #b97b00;font-weight:bold;cursor:pointer}input:focus,button:focus{outline:5px solid #2796ed;outline-offset:3px}.error{color:#a32718}small{font-size:16px}</style></head><body><main><h1>🎮 Family Arcade</h1><p>Ask a grown-up to unlock.</p>${error?'<p class="error">'+error+'</p>':''}<form method="post" action="/login"><label for="password">Family password</label><input autofocus id="password" name="password" type="password" autocomplete="current-password" required maxlength="128"><button>Let’s play!</button></form><small>This browser remembers you for 30 days.</small></main><script>document.getElementById("password").addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();e.target.form.requestSubmit();}});</script></body></html>`;
function emit(member, data) {
  if (!member?.stream || member.stream.destroyed) return;
  if (member.stream.writableLength > 512000) { member.stream.destroy(); return; }
  member.stream.write('data: '+JSON.stringify(data)+'\n\n');
}
function presence(room) {
  const p={type:'presence',host:!!room.host.stream&&!!room.host.ready,guest:!!room.guest?.stream&&!!room.guest?.ready};
  emit(room.host,p); emit(room.guest,p);
}
function member(room,token) { return token===room.host.token ? room.host : token===room.guest?.token ? room.guest : null; }
const cleanup=setInterval(()=>{
  for (const [id,room] of rooms) {
    if (Date.now()-room.touched > 30*60*1000 && !room.host.stream && !room.guest?.stream) rooms.delete(id);
    else for(const m of [room.host,room.guest]) if(m?.stream) emit(m,{type:'ping'});
  }
  for(const [k,v] of attempts) if(Date.now()-v.at>10*60*1000) attempts.delete(k);
},10000); cleanup.unref();

export async function online(req,res) {
  const url=new URL(req.url,'http://localhost');
  const path=url.pathname;
  if(path==='/favicon.ico'){res.writeHead(204);res.end();return true;}
  const requested=url.searchParams.get('next')||'/';
  const next=requested.startsWith('/') && !requested.startsWith('//') && !requested.includes('\\') ? requested : '/';
  const page=error=>loginPage(error).replace('action="/login"','action="/login?next='+encodeURIComponent(next)+'"');
  const mutation=!['GET','HEAD'].includes(req.method);
  // Browser POSTs must originate on this exact arcade origin.
  if (mutation && req.headers.origin && new URL(req.headers.origin).host !== req.headers.host) { json(res,403,{error:'Wrong origin'}); return true; }
  if(path==='/login') {
    if(req.method==='GET') { res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'}); res.end(page()); return true; }
    if(req.method!=='POST') { json(res,405,{error:'Use POST'}); return true; }
    const ip=String(req.headers['x-forwarded-for']||req.socket.remoteAddress).slice(0,100);
    let a=attempts.get(ip); if(!a || Date.now()-a.at>600000) {a={at:Date.now(),n:0};attempts.set(ip,a);}
    if(a.n>=20) {res.writeHead(429,{'Content-Type':'text/html; charset=utf-8','Retry-After':'600'});res.end(page('Please wait 10 minutes, then try again.'));return true;}
    a.n++;
    const password=new URLSearchParams(await body(req,2000)).get('password')||'';
    const hash=(await derive(password,auth.salt,64)).toString('hex');
    if(!equal(hash,auth.hash)) {res.writeHead(401,{'Content-Type':'text/html; charset=utf-8'});res.end(page('That password didn’t match. Try again.'));return true;}
    attempts.delete(ip);
    const value=(Date.now()+30*86400000)+'.'+randomBytes(16).toString('hex');
    const local=/^(127\.0\.0\.1|localhost)(:\d+)?$/.test(req.headers.host||'');
    res.writeHead(303,{'Set-Cookie':`arcade_session=${value}.${sign(value)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=2592000${local?'':'; Secure'}`,'Location':next,'Cache-Control':'no-store'});res.end();return true;
  }
  if(!loggedIn(req)) {
    if(req.method==='GET' && (req.headers.accept||'').includes('text/html')) {res.writeHead(303,{Location:'/login?next='+encodeURIComponent(req.url),'Cache-Control':'no-store'});res.end();}
    else json(res,401,{error:'Please unlock the arcade',login:'/login'});
    return true;
  }
  if(await profiles(req,res)) return true;
  if(await sudokuAccounts(req,res)) return true;
  if ((path.endsWith('.html') || path.endsWith('/')) && !['/', '/index.html'].includes(path) && !profileSession(req)) {
    res.writeHead(303, {Location: '/index.html?next=' + encodeURIComponent(req.url)}); res.end(); return true;
  }
  if(!path.startsWith('/api/')) return false;
  if(path==='/api/online' && req.method==='GET') {json(res,200,{games:[...allowed]});return true;}
  if(path==='/api/rooms' && req.method==='GET') {
    const game=url.searchParams.get('game');
    if(!allowed.has(game)){json(res,400,{error:'Choose a game'});return true;}
    const waiting=[...rooms.values()].filter(r=>r.game===game && !r.closed && r.host.stream && !r.guest)
      .map(r=>({id:r.id,door:r.door})).sort((a,b)=>a.door-b.door);
    json(res,200,{rooms:waiting});return true;
  }
  if(path==='/api/rooms' && req.method==='POST') {
    const data=JSON.parse(await body(req,4000));
    if(!allowed.has(data.game)) {json(res,400,{error:'Choose a multiplayer game'});return true;}
    if(rooms.size>=100) {json(res,503,{error:'Please try later'});return true;}
    const id=randomBytes(6).toString('hex'), token=randomBytes(24).toString('hex');
    const used=new Set([...rooms.values()].map(r=>r.door));
    let door=1;while(used.has(door))door++;
    rooms.set(id,{id,door,game:data.game,host:{token,stream:null},guest:null,touched:Date.now(),state:null});
    json(res,201,{id,door,token,role:'host',game:data.game});return true;
  }
  const match=/^\/api\/rooms\/([a-f0-9]{12})\/(join|events|message|leave)$/.exec(path);
  if(!match) {json(res,404,{error:'Not found'});return true;}
  const room=rooms.get(match[1]);
  if(!room || (room.closed && match[2]==='join')) {json(res,404,{error:'This room has closed. Create a new room.'});return true;}
  room.touched=Date.now();
  if(match[2]==='join' && req.method==='POST') {
    const data=JSON.parse(await body(req,4000));
    let m=data.token && member(room,data.token);
    if(!m) {
      if(room.guest) {json(res,409,{error:'This room already has two players.'});return true;}
      m=room.guest={token:randomBytes(24).toString('hex'),stream:null};
    }
    json(res,200,{id:room.id,door:room.door,game:room.game,role:m===room.host?'host':'guest',token:m.token});return true;
  }
  const token=url.searchParams.get('token')||req.headers['x-room-token'];
  const m=member(room,token);
  if(!m) {json(res,403,{error:'Join this room first'});return true;}
  if(room.closed){
    if(match[2]==='events'){res.writeHead(200,{'Content-Type':'text/event-stream'});res.end('data: {"type":"closed"}\n\n');}
    else json(res,200,{closed:true});
    return true;
  }
  if(match[2]==='events' && req.method==='GET') {
    m.stream?.end(); m.stream=res; m.ready=false;
    res.writeHead(200,{'Content-Type':'text/event-stream','Cache-Control':'no-store','X-Accel-Buffering':'no'});
    res.write(': connected\n\n'); presence(room);
    if(room.state && m===room.guest) emit(m,room.state);
    req.on('close',()=>{if(m.stream===res){m.stream=null;room.touched=Date.now();presence(room);}});
    return true;
  }
  if(match[2]==='message' && req.method==='POST') {
    const data=JSON.parse(await body(req));
    if(data.type==='ready'){m.ready=true;presence(room);json(res,200,{ok:true});return true;}
    if(!['state','input','action'].includes(data.type) || (data.type==='state' && m!==room.host) || (data.type==='input' && m!==room.guest)) {json(res,403,{error:'Not allowed'});return true;}
    const now=Date.now();
    if(!m.rate || now-m.rate.at>1000) m.rate={at:now,n:0};
    if(++m.rate.n>80) {json(res,429,{error:'Too many messages'});return true;}
    const event={type:data.type,data:data.data,role:m===room.host?'host':'guest'};
    if(data.type==='state') room.state=event;
    emit(m===room.host?room.guest:room.host,event);
    json(res,200,{ok:true});return true;
  }
  if(match[2]==='leave' && req.method==='POST') {
    m.stream?.end();m.stream=null;
    if(m===room.host) {room.closed=true;emit(room.guest,{type:'closed'});room.guest?.stream?.end();setTimeout(()=>rooms.delete(room.id),30000).unref();}
    else {room.guest=null;presence(room);}
    json(res,200,{ok:true});return true;
  }
  json(res,405,{error:'Method not allowed'});return true;
}
