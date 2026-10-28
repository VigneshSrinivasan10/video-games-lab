import { profileSession } from './arcade-profiles.mjs';
import { adultGames } from './adult-games-server.mjs';
// Individual Sudoku accounts, behind the existing family login.
import { readFileSync, writeFileSync, mkdirSync, renameSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
const root=new URL('./.hosting/sudoku/',import.meta.url);
mkdirSync(root,{recursive:true,mode:0o700});
const file=name=>new URL(createHash('sha256').update(name).digest('hex')+'.json',root);
function send(res,code,data){res.writeHead(code,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(data));}
function write(name,data){const dest=file(name),tmp=new URL(dest.href+'.tmp');writeFileSync(tmp,JSON.stringify(data),{mode:0o600});renameSync(tmp,dest);}
async function body(req){let size=0;const chunks=[];for await(const c of req){size+=c.length;if(size>16*1024*1024)throw Error('Save is too large');chunks.push(c);}return JSON.parse(Buffer.concat(chunks).toString());}
function valid(d){return d&&typeof d==='object'&&d.boards&&typeof d.boards==='object'&&!Array.isArray(d.boards)&&Object.keys(d.boards).length<=10000&&Object.entries(d.boards).every(([k,b])=>/^([0-9]):([1-9][0-9]{0,2}|1000)$/.test(k)&&b&&['givens','solution','values','notes'].every(p=>Array.isArray(b[p])&&b[p].length===81&&b[p].every(x=>Number.isInteger(x)&&x>=0&&x<=(p==='notes'?511:9)))&&Number.isFinite(b.seconds)&&b.seconds>=0)&&d.active&&Number.isInteger(d.active.l)&&d.active.l>=0&&d.active.l<10&&Number.isInteger(d.active.n)&&d.active.n>=1&&d.active.n<=1000;}
export async function sudokuAccounts(req,res){
 const path=new URL(req.url,'http://localhost').pathname;if(!path.startsWith('/api/sudoku/'))return false;
 try{
 const name=profileSession(req);if(!name){send(res,401,{error:'Choose a player at the arcade.'});return true;}
 if(!existsSync(file(name)))write(name,{name,revision:0,data:{active:{l:0,n:1},boards:{}}});
 if(await adultGames(req,res,name)) return true;
 const account=JSON.parse(readFileSync(file(name)));
 if(path==='/api/sudoku/save'&&req.method==='GET'){send(res,200,{name,revision:account.revision,data:account.data});return true;}
 if(path==='/api/sudoku/save'&&req.method==='POST'){
  const data=await body(req);
  if(data.name!==name){send(res,403,{error:'The signed-in player changed in another tab. Reload before saving.'});return true;}
  // Read again after consuming the request: another device may have saved meanwhile.
  const latest=JSON.parse(readFileSync(file(name)));
  if(data.revision!==latest.revision){send(res,409,{error:'Progress changed on another device. Reload its save before continuing.',name,revision:latest.revision,data:latest.data});return true;}
  if(!valid(data.data)){send(res,400,{error:'Invalid save format.'});return true;}
  latest.data=data.data;latest.revision++;write(name,latest);send(res,200,{revision:latest.revision});return true;
 }
 send(res,404,{error:'Not found'});
 }catch{send(res,400,{error:'Unable to read or save progress. Please try again.'});}
 return true;
}
