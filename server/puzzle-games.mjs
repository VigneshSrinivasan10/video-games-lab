import { dataRoot } from './paths.mjs';
import{readFileSync,writeFileSync,renameSync,mkdirSync,existsSync,readdirSync}from'node:fs';
import{createHash,randomBytes}from'node:crypto';
import * as R from '../public/games/reversi/vendor/reversi.mjs';
const root=new URL('adult-games/', dataRoot);mkdirSync(root,{recursive:true,mode:0o700});
const games=new Set(['nonogram','mahjong','reversi']);
const file=(name,game)=>new URL(createHash('sha256').update(name+':'+game).digest('hex')+'.json',root);
const roomfile=id=>new URL('room-'+id+'.json',root);
const read=f=>existsSync(f)?JSON.parse(readFileSync(f)):null;
function write(f,d){const t=new URL(f.href+'.tmp');writeFileSync(t,JSON.stringify(d),{mode:0o600});renameSync(t,f);}
function send(res,code,data){res.writeHead(code,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(data));}
async function body(req){let n=0,chunks=[];for await(const c of req){n+=c.length;if(n>5e6)throw Error('Save too large');chunks.push(c);}return JSON.parse(Buffer.concat(chunks).toString());}
function publicRoom(r,name){return{...r,you:r.players.B===name?'B':r.players.W===name?'W':null};}
export async function adultGames(req,res,name){
 const path=new URL(req.url,'http://localhost').pathname,save=/^\/api\/sudoku\/games\/(nonogram|mahjong|reversi)$/.exec(path),room=/^\/api\/sudoku\/reversi\/rooms(?:\/([a-f0-9]{12}))?$/.exec(path);if(!save&&!room)return false;
 try{
 if(save){const game=save[1],f=file(name,game);if(req.method==='GET'){send(res,200,{name,...(read(f)||{revision:0,data:null})});return true;}
 if(req.method==='POST'){const d=await body(req),old=read(f)||{revision:0,data:null};if(d.name!==name){send(res,403,{error:'Player changed in another tab. Sign in again.'});return true;}if(d.revision!==old.revision){send(res,409,{error:'Another device has newer progress.',...old});return true;}
 if(!d.data||d.data.version!==1||typeof d.data.records!=='object'||Array.isArray(d.data.records)||!d.data.records||Object.keys(d.data.records).length>5000){send(res,400,{error:'Invalid save.'});return true;}
 write(f,{revision:old.revision+1,data:d.data});send(res,200,{revision:old.revision+1});return true;}}
 if(room){const id=room[1];if(!id){if(req.method==='GET'){const rooms=readdirSync(root).filter(f=>/^room-[a-f0-9]{12}\.json$/.test(f)).map(f=>read(new URL(f,root))).filter(r=>Date.now()-r.updated<7*86400000&&(Object.values(r.players).includes(name)||!r.players.W&&!r.closed));send(res,200,{rooms:rooms.map(r=>({id:r.id,players:r.players,closed:r.closed,turn:r.turn,updated:r.updated,you:r.players.B===name?'B':r.players.W===name?'W':null})).sort((a,b)=>b.updated-a.updated).slice(0,50)});return true;}
 if(req.method==='POST'){await body(req);const own=readdirSync(root).filter(f=>/^room-/.test(f)&&f.endsWith('.json')).map(f=>read(new URL(f,root))).find(r=>r.players.B===name&&!r.players.W&&!r.closed&&Date.now()-r.updated<7*86400000);if(own){send(res,200,publicRoom(own,name));return true;}const id=randomBytes(6).toString('hex'),r={id,players:{B:name,W:null},board:R.createInitialBoard(),turn:'B',history:[],lastMove:null,revision:0,updated:Date.now(),closed:false};write(roomfile(id),r);send(res,200,publicRoom(r,name));return true;}}
 else{const f=roomfile(id);let r=read(f);if(!r){send(res,404,{error:'Match not found.'});return true;}
 if(req.method==='GET'){if(!Object.values(r.players).includes(name)){send(res,403,{error:'Join this match first.'});return true;}send(res,200,publicRoom(r,name));return true;}
 if(req.method==='POST'){const d=await body(req);r=read(f);if(d.name!==name){send(res,403,{error:'Player changed. Sign in again.'});return true;}
 if(d.action==='join'){if(r.closed){send(res,409,{error:'This match has ended.'});return true;}if(!Object.values(r.players).includes(name)){if(r.players.W){send(res,409,{error:'This match already has two players.'});return true;}r.players.W=name;}}
 else{const side=r.players.B===name?'B':r.players.W===name?'W':null;if(!side){send(res,403,{error:'You are not in this match.'});return true;}if(r.closed){send(res,409,{error:'This match has ended.'});return true;}
 if(d.action==='move'){if(d.revision!==r.revision){send(res,409,{error:'The board changed. Try your move again.'});return true;}if(!r.players.W||r.turn!==side){send(res,409,{error:'Wait for your turn.'});return true;}if(!Number.isInteger(d.index)||d.index<0||d.index>63){send(res,400,{error:'Choose a square.'});return true;}const p={row:d.index/8|0,col:d.index%8};if(!R.isLegalMove(r.board,side,p)){send(res,400,{error:'That move does not flip any discs.'});return true;}r.history.push({board:r.board,turn:r.turn,lastMove:r.lastMove});r.board=R.applyMove(r.board,side,p);r.lastMove=p;r.turn=R.nextPlayer(r.board,side);if(!r.turn){r.closed=true;r.result=R.winner(r.board);}}
 else if(d.action==='resign'){r.closed=true;r.result=R.opponent(side);r.resigned=side;r.turn=null;}
 else{send(res,400,{error:'Unknown action.'});return true;}}
 r.revision++;r.updated=Date.now();write(f,r);send(res,200,publicRoom(r,name));return true;}}
 }
 send(res,405,{error:'Method not allowed.'});
 }catch{send(res,400,{error:'Could not process the request. Your saved progress is kept.'});}return true;
}
