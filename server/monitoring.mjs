import { readFileSync, writeFileSync, renameSync, readdirSync } from 'node:fs';
import { createHmac, createHash, timingSafeEqual } from 'node:crypto';
import { isIP } from 'node:net';
import { dataRoot } from './paths.mjs';
import { profileSession } from './profiles.mjs';
const secret = JSON.parse(readFileSync(new URL('auth.json', dataRoot))).secret;
const file = new URL('monitoring.json', dataRoot);
let adminKey = process.env.ARCADE_MONITOR_KEY;
if (!adminKey) { try { adminKey = readFileSync(new URL('monitoring-key',dataRoot),'utf8').trim(); } catch {} }
const retention = 30 * 86400000;
const equal = (a, b) => typeof a === 'string' && Buffer.byteLength(a) === Buffer.byteLength(b) && timingSafeEqual(Buffer.from(a), Buffer.from(b));
let visits = [], sessions = new Map(), dirty = false, storageError = null;
try { visits = JSON.parse(readFileSync(file)).visits || []; } catch (e) { if (e.code !== 'ENOENT') storageError = 'Previous visit history could not be read.'; }
function trim() { visits = visits.filter(v => v.lastSeen > Date.now() - retention).slice(-10000); }
function flush() {
  trim(); if (!dirty) return;
  try { const temp = new URL(file.href + '.tmp'); writeFileSync(temp, JSON.stringify({visits}), {mode:0o600}); renameSync(temp,file); dirty = false; storageError = null; }
  catch { storageError = 'Visit history could not be saved.'; }
}
setInterval(() => { flush(); for (const [id,s] of sessions) if (Date.now()-s.lastSeen > 86400000) sessions.delete(id); }, 10000).unref();
export function connection(req) {
  const localProof = req.headers['x-arcade-local'];
  const session = (req.headers.cookie || '').split(';').map(x=>x.trim()).find(x=>x.startsWith('arcade_session='))?.slice(15) || '';
  const local = equal(localProof, createHmac('sha256',secret).update('local-monitor:'+session).digest('hex'));
  let ip = req.socket.remoteAddress || 'unknown';
  // The configured reverse proxy MUST overwrite this header. Never trust arbitrary XFF.
  const header = process.env.ARCADE_CLIENT_IP_HEADER?.toLowerCase();
  if (!local && header && ['127.0.0.1','::1','::ffff:127.0.0.1'].includes(ip)) {
    const candidate = req.headers[header];
    if (typeof candidate === 'string' && isIP(candidate.trim())) ip = candidate.trim();
  }
  return {ip, source:local ? 'localhost' : 'direct / hosted'};
}
export function observeVisit(req,res) {
  if (req.method !== 'GET') return;
  res.on('finish', () => {
    if (res.statusCode !== 200 || !String(res.getHeader('Content-Type')).includes('text/html')) return;
    const pathname = new URL(req.url,'http://localhost').pathname;
    if (pathname.startsWith('/monitor')) return;
    const {ip,source}=connection(req), player=profileSession(req), now=Date.now();
    trim();
    let row=visits.find(v=>v.ip===ip && v.source===source && v.player===player && v.path===pathname && v.day===new Date(now).toISOString().slice(0,10));
    if (!row) { row={ip,source,player,path:pathname,day:new Date(now).toISOString().slice(0,10),firstSeen:now,lastSeen:now,views:0};visits.push(row); }
    row.views++;row.lastSeen=now;dirty=true;
  });
}
const send=(res,code,data)=>{res.writeHead(code,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(data));};
// Extract labeled save fields, never claim an unlocked level is the currently played level.
export function summarize(value) {
  let data;try {data=typeof value==='string'?JSON.parse(value):value;}catch{return [];}
  const result=[];let budget=1500;
  function walk(v,path,depth) {
    if (--budget<0 || depth>5 || result.length>=40 || v===null) return;
    if (typeof v!=='object') {if (/level|stage|chapter|unlock|score|star|win|won|complete|best|coin|time|difficulty/i.test(path) && ['number','boolean','string'].includes(typeof v)) result.push({field:path,value:String(v).slice(0,100)});return;}
    for(const [k,x] of Object.entries(v).slice(0,200)) walk(x,path?path+'.'+k:k,depth+1);
  }
  if (typeof data==='number') return [{field:'saved value',value:String(data)}];
  walk(data,'',0);return result;
}
process.once('exit', flush);
process.once('SIGTERM', () => { flush(); process.exit(0); });
function savedProgress() {
  const out=[];
  try {for(const f of readdirSync(new URL('profiles/',dataRoot)).filter(f=>/^[a-f0-9]{64}\.json$/.test(f))) {
    try {const account=JSON.parse(readFileSync(new URL('profiles/'+f,dataRoot)));
      for(const [game,s] of Object.entries(account.saves||{})) out.push({player:account.name,game,revision:s.revision,stats:summarize(s.value)});
      for (const game of ['sudoku','nonogram','mahjong','reversi']) {
        try {
          const hash=createHash('sha256').update(game==='sudoku'?account.name:account.name+':'+game).digest('hex');
          const save=JSON.parse(readFileSync(new URL((game==='sudoku'?'sudoku/':'adult-games/')+hash+'.json',dataRoot)));
          const d=save.data, records=Object.values(d.boards||d.records||{});
          const stats=[{field:'puzzles started',value:String(records.length)},{field:'puzzles completed',value:String(records.filter(x=>x.done).length)}, {field:'saved seconds',value:String(Math.round(records.reduce((n,x)=>n+(Number(x.seconds)||0),0)))}];
          if (d.active) stats.push({field:'saved level / puzzle',value:(d.active.l+1)+' / '+d.active.n});
          else if (Number.isInteger(d.level)) stats.push({field:'saved level / puzzle',value:(d.level+1)+' / '+(d.number+1)});
          out.push({player:account.name,game,revision:save.revision,stats});
        } catch {}
      }
    }catch{}
  }}catch{}
  return out;
}
export async function monitoring(req,res) {
  const path=new URL(req.url,'http://localhost').pathname;
  if (path==='/api/monitoring') {
    const key=adminKey;
    if (!key || key.length<24) {send(res,503,{error:'Run node scripts/setup-monitoring.mjs, or set ARCADE_MONITOR_KEY to at least 24 characters, then restart the main server.'});return true;}
    if (!equal(req.headers.authorization,'Bearer '+key)) {send(res,401,{error:'Enter the monitoring admin key.'});return true;}
    if(req.method!=='GET'){send(res,405,{error:'Use GET'});return true;}
    flush();
    const now=Date.now();
    send(res,200,{now,storageError,retentionDays:30,visits:[...visits].sort((a,b)=>b.lastSeen-a.lastSeen),sessions:[...sessions.values()].map(s=>({...s,status:now-s.lastSeen>45000?'offline':s.visible?'active':'background'})),progress:savedProgress()});return true;
  }
  if(path!=='/api/monitoring/heartbeat') return false;
  if(req.method!=='POST'){send(res,405,{error:'Use POST'});return true;}
  let raw='', size=0;
  for await(const chunk of req){size+=chunk.length;if(size>4096){send(res,413,{error:'Too large'});return true;}raw+=chunk;}
  let d;try{d=JSON.parse(raw);}catch{send(res,400,{error:'Invalid heartbeat'});return true;}
  if(!d || typeof d.id!=='string'|| !/^[a-f0-9-]{20,64}$/.test(d.id)||typeof d.path!=='string'|| !d.path.startsWith('/')||d.path.length>250 || typeof d.visible!=='boolean'){send(res,400,{error:'Invalid heartbeat'});return true;}
  const player=profileSession(req), c=connection(req), id=player+':'+c.ip+':'+d.id;
  const previous=sessions.get(id), now=Date.now();
  if(previous && now-previous.lastSeen<1000){send(res,429,{error:'Wait before updating'});return true;}
  if(!previous && sessions.size>=5000){send(res,503,{error:'Monitoring is full'});return true;}
  const elapsed=previous && previous.visible ? Math.min(30000,now-previous.lastSeen) : 0;
  sessions.set(id,{id:d.id,player,...c,path:d.path.split('?')[0],level:typeof d.level==='string'?d.level.slice(0,120):null,visible:d.visible,firstSeen:previous?.firstSeen||now,lastSeen:now,activeMs:(previous?.activeMs||0)+elapsed});
  send(res,200,{ok:true});return true;
}
