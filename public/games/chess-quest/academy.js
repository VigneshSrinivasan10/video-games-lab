 'use strict';
// Six different arrangements per skill, then mirrored practice from the other side.
const academySq = name => (8 - Number(name[1])) * 8 + 'abcdefgh'.indexOf(name[0]);
function academyPosition(task) {
  const b=Array(64).fill('.');
  for(const [sq,piece] of Object.entries(task.pieces)) b[academySq(sq)]=piece;
  return {b,turn:'w',castle:'',ep:-1};
}
const rescueSeeds = [
 {pieces:{a8:'k',h1:'K',d5:'r',d2:'Q'},from:'d2'},
 {pieces:{a8:'k',h1:'K',e5:'n',d3:'R'},from:'d3'},
 {pieces:{a8:'k',h1:'K',g6:'b',c2:'N'},from:'c2'},
 {pieces:{a8:'k',h1:'K',e5:'p',d4:'B'},from:'d4'},
 {pieces:{a8:'k',h1:'K',b6:'q',f2:'R'},from:'f2'},
 {pieces:{b8:'k',h1:'K',f6:'n',e4:'Q',b2:'P'},from:'e4'}
];
const captureSeeds = [
 {pieces:{a8:'k',h1:'K',d1:'R',d5:'p',c6:'p',g1:'n'},from:'d1',proposed:'d5'},
 {pieces:{a8:'k',h1:'K',d4:'B',f6:'r',g7:'p',b2:'n'},from:'d4',proposed:'f6'},
 {pieces:{a8:'k',h1:'K',e4:'N',f6:'r',g7:'p',c3:'p'},from:'e4',proposed:'f6'},
 {pieces:{a8:'k',h1:'K',d3:'Q',d6:'r',c7:'p',g3:'b'},from:'d3',proposed:'d6'},
 {pieces:{a8:'k',h1:'K',e4:'P',d5:'n',f5:'b',g6:'p'},from:'e4',proposed:'f5'},
 {pieces:{a8:'k',h1:'K',f2:'R',f6:'b',e7:'p',c2:'n'},from:'f2',proposed:'f6'}
];
function academyMirror(task) {
 const flip=s=>'hgfedcba'['abcdefgh'.indexOf(s[0])]+s[1];
 return {...task,pieces:Object.fromEntries(Object.entries(task.pieces).map(([s,p])=>[flip(s),p])),from:flip(task.from),proposed:task.proposed&&flip(task.proposed),line:task.line?.map(([f,t])=>[flip(f),flip(t)])};
}
function academyExpand(seeds,type) {return seeds.concat(seeds.map(academyMirror)).map(t=>({...t,type}));}
// Find a genuine second attack after a safe escape, rather than a pretend opponent turn.
function academyDefense(seed) {
 const pos=academyPosition(seed), from=academySq(seed.from);
 for(const first of legalMoves(pos).filter(m=>m.from===from&&!m.cap)) {
  const next=makeMove(pos,first);
  if(captureThreats(next,'b').some(m=>m.to===first.to))continue;
  for(const reply of legalMoves(next).filter(m=>!m.cap&&m.piece!=='K')) {
   const last=makeMove(next,reply);
   if(inCheck(last,'w')||!captureThreats(last,'b').some(m=>m.to===first.to))continue;
   const finish=legalMoves(last).find(m=>m.from===first.to&&!captureThreats(makeMove(last,m),'b').some(r=>r.to===m.to));
   if(finish)return {...seed,line:[[squareName(first.from),squareName(first.to)],[squareName(reply.from),squareName(reply.to)]],answer:squareName(finish.to)};
  }
 }
 throw Error('No defense continuation for '+seed.from);
}
const forkSeeds=['b4','d4','a5','e7','a7','d8'].map((rook,i)=>({pieces:{b8:'k',h1:'K',[['e5','a5','d4','b4','d8','e7'][i]]:'N',[rook]:'r'},from:['e5','a5','d4','b4','d8','e7'][i],line:[[ ['e5','a5','d4','b4','d8','e7'][i],'c6'],['b8',rook==='a7'?'c8':'a8']],prize:rook}));
const ACADEMY=[
 {name:'Spot & escape',icon:'🛡️',piece:'Q',tasks:academyExpand(rescueSeeds,'safe')},
 {name:'Win pieces & trades',icon:'⭐',piece:'B',tasks:academyExpand(captureSeeds,'capture')},
 {name:'Fork & win',icon:'♞',piece:'N',tasks:academyExpand(forkSeeds,'fork')},
 {name:'Escape twice',icon:'🛡️ → 🛡️',piece:'R',tasks:academyExpand(rescueSeeds.map((seed,i)=>academyDefense({...seed,pieces:{...seed.pieces,...(i===2?{c2:'R'}:i===3?{e5:'q'}:{})}})),'defense')}
];
const academyState = { lesson: -1, step: 0, solved: false, phase: 'ready', attempts: 0, stage:0 };
function academyTask() { return ACADEMY[academyState.lesson].tasks[academyState.step]; }
function academyFrom(task) {
  return academyState.stage===1 ? academySq(task.line[0][1]) : academySq(task.from);
}
function openAcademy() {
  clearTimeout(hintTimer); resetTurnState(); G.mode='menu';
  academyState.lesson=-1; showScreen('academy');
  $('academyTitle').textContent='Detective School';
  $('academyContent').innerHTML='<div id="academyChoices" class="academy-choices"></div>';
  ACADEMY.forEach((lesson,i)=>{
    const b=document.createElement('button'); b.className='btn blue academy-choice';
    b.setAttribute('aria-label',lesson.name);
    b.innerHTML='<span>'+lesson.icon+'</span><img alt="" src="'+pieceImage(lesson.piece,'w',100)+'"><small>'+lesson.name+'</small>'+' '+Object.keys(SAVE.academyV2?.[i]||{}).length+'/'+lesson.tasks.length;
    b.onclick=()=>openAcademyTasks(i); $('academyChoices').append(b);
  });
  setTimeout(focusDefault,20);
}
function openAcademyTasks(lesson) {
 openAcademy(); $('academyTitle').textContent=ACADEMY[lesson].name;
 const root=$('academyChoices');root.className='academy-exercises';root.replaceChildren();
 ACADEMY[lesson].tasks.forEach((task,i)=>{
  const b=document.createElement('button');b.className='btn blue';
  b.innerHTML=(i+1)+' '+(SAVE.academyV2?.[lesson]?.[i]?'⭐':'◇');
  b.onclick=()=>academyStart(lesson,i);root.append(b);
 });
 const back=document.createElement('button');back.className='btn blue';back.textContent='↶';back.setAttribute('aria-label','All sections');back.onclick=openAcademy;root.append(back);
 setTimeout(focusDefault,20);
}
function academyStart(lesson, step=0) {
  Object.assign(academyState,{lesson,step,solved:false,phase:'ready',attempts:0,stage:0,demonstrating:false});
  G.mode='academy'; G.kind='practice'; G.li=0; G.stars=[]; G.autoSel=true;
  setTheme(lesson+2); academyReset(); G.locked=true; academyState.phase='watch'; showScreen(null);
  // Show the threat on the same animated board used by the original lessons.
  if(step<2 && (academyTask().type==='safe'||academyTask().type==='capture')) after(0.6,academyDemo);
  else if(step<2 && academyTask().line) {academyState.demonstrating=true;after(0.6,()=>{const t=academyTask();const m=legalMoves(G.pos).find(m=>m.from===academySq(t.line[0][0])&&m.to===academySq(t.line[0][1]));G.hintM=m;after(0.9,()=>academyTry(m,true));});}
  else {G.locked=false;academyState.phase='ready';}
}
function academyReset() {
  academyState.stage=0; academyState.trade=0; academyState.demonstrating=false; resetTurnState(); G.parts=[]; G.texts=[]; G.pos=academyPosition(academyTask()); buildSprites(false);
  G.stars=academyTask().type==='defense'?[academySq(academyTask().line[0][1])]:[];
  G.cursor=academyFrom(academyTask()); G.autoSel=academyState.step<4; if(G.autoSel)select(G.cursor,true);
  G.owl=''; academyState.phase='ready';
}
function academyDemo() {
  if(G.mode!=='academy') return;
  const task=academyTask(); G.locked=true; deselect(); academyState.phase='watch';
  if(task.type==='capture') {
    const to=academySq(task.proposed);
    const m=legalMoves(G.pos).find(m=>m.from===academyFrom(task)&&m.to===to);
    academyTry(m,true);
  } else {
    const m=captureThreats(G.pos,'b').find(m=>m.to===academyFrom(task));
    if(!m) {academyReset();return;}
    G.hintM=m;
    after(0.9,()=>{
      G.hintM=null; G.pos=makeMove({...G.pos,turn:'b'},m);
      animateMove(m,()=>academyRewind());
    });
  }
}
function academyRewind() {
  academyState.phase='rewind'; banner('↶');
  after(1.4,()=>{
    academyReset();
    // A safe example appears only on request or after repeated attempts.
    if(academyState.attempts>=2) academyHint();
  });
}
const ACADEMY_VALUE={P:1,N:3,B:3,R:5,Q:9};
function academyTradeGain(m) {
  return m.cap ? (ACADEMY_VALUE[m.cap.toUpperCase()]||0)-(ACADEMY_VALUE[m.piece]||0) : -Infinity;
}
function academyFinish(demo=false) {
  if(demo||academyState.demonstrating){academyRewind();return;}
  academyState.solved=true; academyState.phase='success';
  banner('★ ★ ★'); sfx.good(); confetti(70);
  SAVE.academyV2=SAVE.academyV2||{};
  SAVE.academyV2[academyState.lesson]=SAVE.academyV2[academyState.lesson]||{};
  SAVE.academyV2[academyState.lesson][academyState.step]=true;saveGame();
  after(2.2,()=>{
    const {lesson,step}=academyState;
    if(step+1<ACADEMY[lesson].tasks.length) academyStart(lesson,step+1);
    else if(lesson+1<ACADEMY.length) academyStart(lesson+1,0);
    else openAcademy();
  });
}
function academyTry(m, demo=false) {
  if(!m || (!demo && (G.locked || G.busy))) return;
  const task=academyTask(), from=academyFrom(task);
  if(m.from!==from) return;
  G.hintM=null; deselect(); G.locked=true;
  if(task.line && academyState.stage===0) {
    const expected=task.line[0];
    if(m.to!==academySq(expected[1])) {
      G.pos=makeMove(G.pos,m); animateMove(m,()=>{academyState.attempts++;academyRewind();});return;
    }
    G.stars=[]; G.pos=makeMove(G.pos,m);animateMove(m,()=>{
      academyState.phase='watch';
      after(0.7,()=>{
        const [f,t]=task.line[1];const reply=legalMoves(G.pos).find(r=>r.from===academySq(f)&&r.to===academySq(t));
        G.pos=makeMove(G.pos,reply);animateMove(reply,()=>{
          academyState.stage=1;G.locked=false;academyState.phase='ready';G.cursor=m.to;select(m.to,true);G.owl='';
          if(academyState.demonstrating){academyHint();const finish=G.hintM;G.locked=true;after(1,()=>academyTry(finish,true));}
        });
      });
    });return;
  }
  const next=makeMove(G.pos,m);
  const reply=captureThreats(next,'b').find(r=>r.to===m.to);
  G.pos=next; G.lastMove=m;
  animateMove(m,()=>{
    if(reply) {
      const winningTrade=academyTradeGain(m)>0;
      academyState.attempts+=demo||winningTrade?0:1; academyState.phase=winningTrade?'trade':'danger';
      G.hintM=reply;
      after(0.85,()=>{
        G.hintM=null; G.pos=makeMove(next,reply);
        animateMove(reply,()=>{if(winningTrade){academyState.trade=academyTradeGain(m);academyFinish(demo);}else academyRewind();});
      });
    } else if((task.type==='capture'||task.type==='fork')&&!m.cap) {
      academyState.phase='capture'; academyRewind();
    } else {
      academyFinish(demo);
    }
  });
}
function academyHint() {
  if(G.locked||G.busy) return;
  const task=academyTask();
  const move=legalMoves(G.pos).find(m=>m.from===academyFrom(task)
    && (!task.line||academyState.stage===1||m.to===academySq(task.line[0][1]))
    && (!(task.type==='capture'||task.type==='fork'&&academyState.stage===1)||m.cap)
    && (academyTradeGain(m)>0 || !captureThreats(makeMove(G.pos,m),'b').some(r=>r.to===m.to)));
  if(move){ G.hintM=move; G.cursor=move.from; select(move.from,true); G.owl=''; }
}
function drawAcademySide() {
  const a=academyState, x=873;
  panel(762,120,222,285);
  text(ACADEMY[a.lesson].icon,x,165,32,'#fff');
  drawPiece(academyTask().pieces[academyTask().from].toUpperCase(),'w',x,245,{scale:1.7});
  const symbol={ready:'☝ → ●',watch:'◉',danger:'!',rewind:'↶',success:'★ ★ ★',capture:'★',trade:'⇄'}[a.phase];
  text(symbol,x,340,36,a.phase==='danger'?'#ff5a4d':'#ffd23c');
  for(let i=0;i<(academyTask().line?2:1);i++) drawGem(x-23+i*46,382,14,i<a.stage||a.solved);
  text((a.step+1)+' / '+ACADEMY[a.lesson].tasks.length,x,435,24,'#fff');
  if(academyTask().type==='fork') {
    drawPiece('K','b',60,200,{scale:0.9}); drawPiece('R','b',185,200,{scale:0.9});
    text('↖  ♞  ↗',125,270,34,'#ffd23c');
  } else if(academyTask().type==='capture') {
    text(a.trade?'+'+a.trade+' ★':'★',125,225,50,'#ffd23c');
  } else { text('🛡',125,225,56,'#ffd23c'); }
  // The owl points to the board visually; no reading or audio needed.
  ctx.drawImage(owlSprite(false),66,390,120,150);
  if(a.phase==='ready' && (a.step<4 || a.attempts>=2)) {
    const sq=academyFrom(academyTask());
    ctx.save(); ctx.strokeStyle='#ffe14d';ctx.lineWidth=5;
    ctx.beginPath();ctx.arc(sqX(sq),sqY(sq),29+Math.sin(G.t*5)*3,0,TAU);ctx.stroke();ctx.restore();
  }
}
SCREENS.push('academy');
$('btnAcademy').onclick=()=>{ensureAudio();openAcademy();};
$('btnAcademyMap').onclick=openAcademy;
$('academyHome').onclick=goTitle;
window.CQ.academy={lessons:ACADEMY,state:academyState,open:openAcademy,start:academyStart,position:academyPosition,hint:academyHint};
