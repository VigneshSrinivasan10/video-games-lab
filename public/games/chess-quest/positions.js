'use strict';
// Full games from ready-made positions. All start with Sunny to move.
function positionFromMoves(moves) {
  let pos=startPosition();
  for(const code of moves.split(' ')) {
    const sq=s=>(8-Number(s[1]))*8+'abcdefgh'.indexOf(s[0]);
    const move=legalMoves(pos).find(m=>m.from===sq(code.slice(0,2))&&m.to===sq(code.slice(2)));
    if(!move)throw Error('Invalid practice opening: '+code);
    pos=makeMove(pos,move);
  }
  return pos;
}
const PRACTICE_POSITIONS=[
 {name:'Open centre',icon:'⚔️',pos:positionFromMoves('e2e4 e7e5 g1f3 b8c6 f1c4 f8c5 d2d3 g8f6')},
 {name:'Castle & develop',icon:'🏰',pos:positionFromMoves('d2d4 d7d5 c2c4 e7e6 b1c3 g8f6 c1g5 f8e7')},
 {name:'Opposite wings',icon:'⚔️',pos:positionFromMoves('e2e4 c7c5 g1f3 d7d6 d2d4 c5d4 f3d4 g8f6 b1c3 a7a6')},
 {name:'Find your plan',icon:'🔎',pos:positionFromMoves('e2e4 e7e6 d2d4 d7d5 b1c3 g8f6 c1g5 f8e7 e4e5 f6d7')},
 {name:'Race to a queen',icon:'👑',pos:posFromRows(['........','......k.','........','...P....','........','.......p','..K.....','........']).pos},
 {name:'Rook & king',icon:'🏰',pos:posFromRows(['....k...','........','........','........','....K...','........','........','R.......']).pos},
 {name:'Queen & king',icon:'👑',pos:posFromRows(['....k...','........','........','........','....K...','........','........','Q.......']).pos},
 {name:'Pawn team',icon:'🛡️',pos:posFromRows(['........','........','....kpp.','...p....','...P....','....KPP.','........','........']).pos}
];
// Late-game practice: reduced material, with pawns and active pieces still on both sides.
function latePosition(name,icon,pieces) {
  const b=Array(64).fill('.');
  for(const [square,piece] of Object.entries(pieces)) b[(8-Number(square[1]))*8+'abcdefgh'.indexOf(square[0])]=piece;
  return {name,icon,stage:'late',pos:{b,turn:'w',castle:'',ep:-1}};
}
PRACTICE_POSITIONS.push(
 latePosition('Rooks & pawns','🏰',{g1:'K',c1:'R',a2:'P',c4:'P',f2:'P',g2:'P',h2:'P',g8:'k',c8:'r',a7:'p',c5:'p',f7:'p',g7:'p',h7:'p'}),
 latePosition('Bishop or knight','♞',{g1:'K',d3:'B',a3:'P',d4:'P',f2:'P',g2:'P',h2:'P',g8:'k',f6:'n',a6:'p',d5:'p',f7:'p',g7:'p',h7:'p'}),
 latePosition('Pass the pawn','👑',{g2:'K',a1:'R',d5:'P',f3:'P',h3:'P',g7:'k',b8:'r',a6:'p',f6:'p',h6:'p'}),
 latePosition('Hold the line','🛡️',{g1:'K',e1:'R',f2:'P',g2:'P',h2:'P',g8:'k',a8:'r',a5:'p',f7:'p',g7:'p',h7:'p'}),
 latePosition('Knight outposts','♞',{g1:'K',c3:'N',a2:'P',b3:'P',e4:'P',g2:'P',h2:'P',g8:'k',c6:'n',a7:'p',b6:'p',e5:'p',g7:'p',h7:'p'}),
 latePosition('Diagonal duel','♝',{g1:'K',e2:'B',a3:'P',c4:'P',f3:'P',g2:'P',h2:'P',g8:'k',e7:'b',a6:'p',c5:'p',f6:'p',g7:'p',h7:'p'}),
 latePosition('Queen patrol','👑',{g1:'K',d2:'Q',a2:'P',c3:'P',f2:'P',g2:'P',h2:'P',g8:'k',d7:'q',a7:'p',c6:'p',f7:'p',g7:'p',h7:'p'}),
 latePosition('Rook & helper','🤝',{g1:'K',c1:'R',d3:'B',a3:'P',e4:'P',g2:'P',h2:'P',g8:'k',c8:'r',f6:'n',a6:'p',e5:'p',g7:'p',h7:'p'})
);
let positionOpponent='free';
function openPositions() {
  clearTimeout(hintTimer);resetTurnState();G.mode='menu';showScreen('positions');
  $('positionComputer').setAttribute('aria-pressed',positionOpponent==='free');
  $('positionTogether').setAttribute('aria-pressed',positionOpponent==='two');
  const area=$('positionChoices');area.replaceChildren();
  for(const [stage,title] of [['middle','◐ Middle game'],['late','◕ ¾ — Late game'],['finish','● Endgame']]) {
  const heading=document.createElement('h3');heading.className='position-stage';heading.textContent=title;area.append(heading);
  PRACTICE_POSITIONS.forEach((entry,i)=>{
    if((entry.stage || (i<4?'middle':'finish'))!==stage)return;
    const button=document.createElement('button');button.className='position-card';button.setAttribute('aria-label',entry.name);
    const preview=document.createElement('canvas');preview.width=240;preview.height=240;
    const g=preview.getContext('2d');
    entry.pos.b.forEach((p,sq)=>{
      const x=(sq&7)*30,y=(sq>>3)*30;
      g.fillStyle=((sq&7)+(sq>>3))%2?'#6cc04a':'#fff4d6';g.fillRect(x,y,30,30);
      if(p!=='.') { const img=new Image(); img.onload=()=>g.drawImage(img,x,y,30,30);img.src=pieceImage(p.toUpperCase(),colorOf(p),60); }
    });
    button.append(preview);const label=document.createElement('span');label.textContent=entry.icon+' '+entry.name;button.append(label);
    button.onclick=()=>startPracticePosition(i,positionOpponent);area.append(button);
  });
  }
  setTimeout(focusDefault,20);
}
function startPracticePosition(index,opponent='free') {
  clearTimeout(hintTimer);G.mode=opponent;G.kind='game';G.gems=[false,false,false];
  startGame();G.positionIndex=index;
  const p=PRACTICE_POSITIONS[index].pos;
  G.pos={...p,b:p.b.slice()};G.initialBoard=p.b.slice();
  G.cursor=legalMoves(G.pos)[0].from;G.parts=[];G.texts=[];
  setTheme(index%THEMES.length);buildSprites(true);showScreen(null);
  say('');G.grumSay='';
}
function nextPracticePosition() {
  // Follow the displayed order: middle games, late games, then endgames.
  const order=['middle','late','finish'].flatMap(stage=>PRACTICE_POSITIONS.map((p,i)=>({p,i}))
    .filter(({p,i})=>(p.stage || (i<4?'middle':'finish'))===stage).map(({i})=>i));
  const next=order[order.indexOf(G.positionIndex)+1];
  if(next==null) openPositions();
  else startPracticePosition(next,G.mode);
}
SCREENS.push('positions');
$('btnPositions').onclick=openPositions;
$('btnPositionMenu').onclick=openPositions;
$('positionHome').onclick=goTitle;
$('positionComputer').onclick=()=>{positionOpponent='free';openPositions();};
$('positionTogether').onclick=()=>{positionOpponent='two';openPositions();};
window.CQ.positions={list:PRACTICE_POSITIONS,open:openPositions,start:startPracticePosition,next:nextPracticePosition};
