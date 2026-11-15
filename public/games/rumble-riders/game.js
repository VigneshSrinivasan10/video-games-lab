(() => {
'use strict';
const canvas=document.querySelector('canvas'),ctx=canvas.getContext('2d');
const scenery=new window.RumbleScenery();
const keys=new Set();let w,h,time=0,position=0,playerX=-.25,lean=0,paused=false,last=0,occlusion=[];
function makeRacers(){return ['#e6b841','#6dbdbb','#b997d1','#e06350','#9fc681','#e3d4b4'].map((c,i)=>({c,distance:[20,36,58,83,112,148][i],finishedAt:null,airY:0,airV:0,airAge:0,airDuration:1,flip:false,grade:0,z:[20,36,58,83,112,148][i],start:[20,36,58,83,112,148][i],lane:[.45,-.5,.1,.6,-.65,-.1][i],x:[.45,-.5,.1,.6,-.65,-.1][i]}))}
const rivals=makeRacers();
function resize(){w=canvas.width=innerWidth;h=canvas.height=innerHeight;scenery.resize(w,h);if(paused||document.querySelector('#finish:not([hidden])'))draw()}addEventListener('resize',resize);resize();
function poly(points,color){ctx.fillStyle=color;ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(...p):ctx.moveTo(...p));ctx.closePath();ctx.fill()}
function ellipse(x,y,rx,ry,color){ctx.fillStyle=color;ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);ctx.fill()}
function line(points,color,width){ctx.strokeStyle=color;ctx.lineWidth=width;ctx.lineCap='round';ctx.lineJoin='round';ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(...p):ctx.moveTo(...p));ctx.stroke()}
function bend(z){const c=circuits[circuit];return (Math.sin((position+z)*c.curve+c.phase)-Math.sin(position*c.curve+c.phase))*c.amplitude}
function rawProject(z,x=0){
 const e=RumbleWorld.environments[circuit],s=1/(1+z*(.038-rush*.003));
 const grade=RumbleWorld.grade(circuit,position);
 const delta=RumbleWorld.height(circuit,position+z)-RumbleWorld.height(circuit,position)-grade*z*.22;
 const banking=RumbleRiding.bank(circuit,position+z)*Math.max(-1.16,Math.min(1.16,x));
 const lift=RumbleWorld.deck(circuit,position+z,x),cameraLift=RumbleWorld.deck(circuit,position,playerX);
 return {x:w*.5+bend(z)*w*s+w*.48*s*x*e.width-playerX*w*.16*s,
  y:h*(.365-rush*.012+Math.max(-.035,Math.min(.035,grade*.12)))+h*(.665+rush*.018)*s-delta*h*.016*s-(lift-cameraLift+banking)*h*.007*s,s};
}
function project(z,x=0){const p=rawProject(z,x),limit=occlusion[Math.max(0,Math.min(162,Math.floor(z/4)))];p.hidden=limit!==undefined&&p.y>limit+4;if(limit!==undefined)p.y=Math.min(p.y,limit);return p}
function updateOcclusion(){occlusion=[];let crest=Infinity;for(let i=0;i<=162;i++){crest=Math.min(crest,rawProject(i*4,0).y);occlusion[i]=crest}}

function shape(path,color){ctx.fillStyle=color;ctx.beginPath();path();ctx.closePath();ctx.fill()}
function bike(x,y,s,color,tilt=0,airborne=false){
ctx.save();ctx.translate(x,y);ctx.scale(s,s);
if(!airborne){ellipse(8,2,42,9,'#162c3035');ellipse(2,0,29,6,'#18282d45');}ctx.rotate(tilt);
// Rear wheel, swinging arm, suspension and twin exhausts.
const rubber=ctx.createLinearGradient(-13,0,13,0);rubber.addColorStop(0,'#15232b');rubber.addColorStop(.4,'#3d4546');rubber.addColorStop(.7,'#263139');rubber.addColorStop(1,'#101d26');
ellipse(0,-22,12,28,rubber);line([[0,-43],[0,-2]],'#757b7244',2);
for(let i=0;i<7;i++)line([[-7,-38+i*5],[0,-35+i*5],[7,-38+i*5]],'#17272e',1.4);
line([[-17,-41],[-13,-13]],'#b4b7a5',5);line([[17,-41],[13,-13]],'#b4b7a5',5);
line([[-21,-35],[-23,-8]],'#3d5155',8);line([[21,-35],[23,-8]],'#3d5155',8);
line([[-21,-33],[-23,-10]],'#d3d6c3',3);line([[21,-33],[23,-10]],'#d3d6c3',3);
ellipse(-23,-8,4,3,'#182b33');ellipse(23,-8,4,3,'#182b33');
// Bent riding legs, boots and rounded rear bodywork.
line([[-12,-65],[-25,-46],[-25,-24]],'#273d4b',14);line([[12,-65],[25,-46],[25,-24]],'#273d4b',14);
line([[-23,-50],[-25,-31]],'#5d6b71',4);line([[23,-50],[25,-31]],'#5d6b71',4);
line([[-25,-23],[-31,-20]],'#202e35',12);line([[25,-23],[31,-20]],'#202e35',12);
shape(()=>{ctx.moveTo(-21,-57);ctx.quadraticCurveTo(-22,-37,-14,-32);ctx.lineTo(14,-32);ctx.quadraticCurveTo(22,-37,21,-57)},color);
line([[-15,-37],[15,-37]],'#ffb28a',4);line([[-12,-36],[12,-36]],'#ef5044',3);
ctx.fillStyle='#ece0bd';ctx.fillRect(-9,-29,18,9);ctx.fillStyle='#5a6768';ctx.fillRect(-5,-26,10,2);
ellipse(0,-58,19,8,'#253940');
// Leather jacket with curved shoulders, seams and warm rim light.
const coat=ctx.createLinearGradient(-25,0,26,0);coat.addColorStop(0,'#283c43');coat.addColorStop(.25,color);coat.addColorStop(.76,color);coat.addColorStop(1,'#ffe4ae');
shape(()=>{ctx.moveTo(-12,-105);ctx.bezierCurveTo(-30,-105,-28,-83,-22,-62);ctx.quadraticCurveTo(0,-54,22,-62);ctx.bezierCurveTo(28,-83,30,-105,12,-105)},coat);
line([[-17,-98],[-17,-73]],'#fff0ce77',2);line([[17,-98],[17,-73]],'#fff0ce77',2);
shape(()=>{ctx.moveTo(-5,-101);ctx.lineTo(5,-101);ctx.lineTo(7,-67);ctx.quadraticCurveTo(0,-63,-7,-67)},'#f0dfb9');
line([[-22,-94],[-32,-78],[-33,-84]],color,12);
line([[22,-94],[32,-78],[33,-84]],color,12);
line([[-40,-86],[-28,-86]],'#acb7b1',3);line([[28,-86],[40,-86]],'#acb7b1',3);
ellipse(-34,-84,6,5,'#20343e');ellipse(34,-84,7,5,'#20343e');
line([[-39,-86],[-44,-95]],'#5b7377',2);line([[39,-86],[44,-95]],'#5b7377',2);
ellipse(-45,-97,6,3,'#b1d1ce');ellipse(45,-97,6,3,'#b1d1ce');
// Rounded helmet, rear vents, racing stripe and a small specular highlight.
ellipse(0,-114,21,24,'#1c303c');
const helmet=ctx.createRadialGradient(8,-132,2,-3,-115,29);helmet.addColorStop(0,'#fff0c7');helmet.addColorStop(.35,color);helmet.addColorStop(.75,color);helmet.addColorStop(1,'#293c48');
ellipse(0,-119,21,23,helmet);
shape(()=>{ctx.moveTo(-4,-141);ctx.quadraticCurveTo(-9,-122,-6,-105);ctx.lineTo(6,-105);ctx.quadraticCurveTo(7,-126,4,-141)},'#fff0d0');
line([[-18,-109],[-9,-105],[9,-105],[18,-109]],'#263945',4);
line([[-11,-116],[-7,-116]],'#3a4d52',2);line([[7,-116],[11,-116]],'#3a4d52',2);
ctx.restore();
}
function stuntBike(x,y,s,color,pitch){
 ctx.save();ctx.translate(x,y-70*s);ctx.scale(s*1.35,s*1.35);
 const point=(X,Y,Z)=>{const yy=(Y-43)*Math.cos(pitch)-Z*Math.sin(pitch),zz=(Y-43)*Math.sin(pitch)+Z*Math.cos(pitch);return [X*.85+zz*.44,-yy*.95+zz*.24]};
 const segment=(a,b,c,width)=>line([point(...a),point(...b)],c,width);
 // Wheel circles lie in the longitudinal/vertical plane, so this is a forward flip.
 for(const z of [-32,32]){
  const ring=[];for(let i=0;i<=28;i++){const a=i/28*Math.PI*2;ring.push(point(0,12+Math.sin(a)*12,z+Math.cos(a)*12))}
  line(ring,'#20333e',7);line(ring,'#a7b9b5',2);
  const hub=point(0,12,z);for(let i=0;i<6;i++){const a=i*Math.PI/3;line([hub,point(0,12+Math.sin(a)*10,z+Math.cos(a)*10)],'#bec8ba',1)}
 }
 segment([0,12,-32],[0,31,-10],'#c3cebe',5);segment([0,31,-10],[0,12,32],'#c3cebe',5);segment([0,12,-32],[0,12,32],'#667b80',3);
 segment([0,12,32],[0,43,22],'#c3cebe',4);segment([-13,43,23],[13,43,23],'#314952',4);
 segment([0,32,-23],[0,32,6],color,12);segment([0,37,-24],[0,37,-5],'#233b44',7);
 for(const side of [-1,1]){
  segment([side*7,40,-12],[side*12,26,2],'#304b5b',9);segment([side*12,26,2],[side*13,13,-5],'#304b5b',8);
  segment([side*13,13,-5],[side*13,12,4],'#1d323e',7);
  segment([side*9,64,-5],[side*14,48,14],color,8);segment([side*14,48,14],[side*13,43,23],color,7);
 }
 segment([0,42,-12],[0,66,-5],color,23);segment([0,43,-13],[0,66,-6],'#f2e2bd',5);
 const head=point(0,82,-1);ellipse(head[0],head[1],14,15,color);line([point(-12,78,-1),point(12,78,-1)],'#253e4b',4);line([point(0,94,-1),point(0,84,-1)],'#fff0ca',4);
 ctx.restore();
}
function rampRise(distance,x){
 let rise=0;for(const r of rampList){if(Math.abs(x-r.x)>.45)continue;const spec=RumbleRiding.ramps[r.style||'simple'];const t=(distance-(r.distance-spec.length))/spec.length;if(t>=0&&t<=1)rise=Math.max(rise,RumbleRiding.rampHeight(r.style,t))}return rise*4.9;
}
function startRamp(r){
 const launch=RumbleRiding.launch(r.style||'simple',speed);jumpMode=r.style==='flip'?'flip':'ramp';jumpY=launch.height;jumpV=launch.velocity+groundRate();jumpAge=0;flightDuration=launch.duration;flipAngle=0;boost=Math.max(boost,1.5);show(r.style==='flip'?'⤾':'⤴');sound(440,.15);sound(880,.18,.1);
}

function ribbon(zs,left,right,color){const points=zs.map(z=>{const p=project(z,left);return[p.x,p.y]});for(let i=zs.length-1;i>=0;i--){const p=project(zs[i],right);points.push([p.x,p.y])}poly(points,color)}
const depths=Array.from({length:162},(_,i)=>650-i*4).concat([0]);
function drawFeature(o,p){
 const unit=p.s*Math.min(w/900,1),roadWidth=w*.48*p.s;
 if(o.type==='apex'){
  const half=roadWidth*(o.width||.3),back=project(o.z+25,o.x);
  poly([[p.x-half,p.y],[p.x+half,p.y],[back.x+half*.7,back.y],[back.x-half*.7,back.y]],'#6bd9cd55');
  line([[p.x-half*.5,p.y-2*unit],[p.x,p.y-14*unit],[p.x+half*.5,p.y-2*unit]],'#b8fff0',Math.max(1,4*unit));
  for(const side of [-1,1]){const x=p.x+side*half;line([[x,p.y],[x,p.y-40*unit]],'#e7dcad',Math.max(1,3*unit));poly([[x,p.y-40*unit],[x+side*14*unit,p.y-33*unit],[x,p.y-26*unit]],'#67c8b6')}
  return;
 }
 if(o.type==='landing'){
  const far=project(o.z+o.span/2,o.x),near=project(Math.max(0,o.z-o.span/2),o.x);
  poly([[near.x-w*.48*near.s*.35,near.y],[near.x+w*.48*near.s*.35,near.y],[far.x+w*.48*far.s*.35,far.y],[far.x-w*.48*far.s*.35,far.y]],'#e7c26b55');
  for(let i=0;i<4;i++){const q=project(Math.max(0,o.z-o.span/2+i*o.span/3),o.x);line([[q.x-w*.48*q.s*.32,q.y],[q.x+w*.48*q.s*.32,q.y]],'#ffe8a3',Math.max(1,3*unit))}
  return;
 }
 if(o.type==='speed'){
  const half=roadWidth*.28;line([[p.x-half,p.y],[p.x+half,p.y]],'#ffe292',Math.max(1,5*unit));
  const x=p.x+half+14*unit;line([[x,p.y],[x,p.y-65*unit]],'#dcdabb',Math.max(1,3*unit));ctx.fillStyle='#274d57';ctx.fillRect(x-17*unit,p.y-90*unit,34*unit,29*unit);ctx.fillStyle='#ffdb65';ctx.font=`bold ${Math.max(4,23*unit)}px Arial`;ctx.textAlign='center';ctx.fillText('ϟ',x,p.y-67*unit);ctx.textAlign='start';return;
 }
 if(o.type==='star'){
  const radius=Math.max(3,23*unit),y=p.y-(o.air?115:54)*unit+Math.sin(time*4+o.distance)*4*unit;
  ellipse(p.x,p.y,17*unit,4*unit,'#344e4633');
  const glow=ctx.createRadialGradient(p.x,y,1,p.x,y,radius*1.7);glow.addColorStop(0,'#fff4a880');glow.addColorStop(1,'#ffdc4a00');ellipse(p.x,y,radius*1.7,radius*1.7,glow);
  const points=[];for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5,r=i%2?radius*.48:radius;points.push([p.x+Math.cos(a)*r,y+Math.sin(a)*r])}
  poly(points,'#ffd45f');ctx.strokeStyle='#fff2ac';ctx.lineWidth=Math.max(.5,2*unit);ctx.stroke();
  ellipse(p.x-radius*.22,y-radius*.28,radius*.12,radius*.12,'#fff9cf');return;
 }
 if(o.type==='stream'){
  const near=Math.max(0,o.z-o.span/2),far=o.z+o.span/2;
  ribbon([far,near],-1.02,1.02,'#4d9caa');ribbon([far-4,near+4],-1.02,1.02,'#83cbd0');
  for(let i=0;i<5;i++){const z=near+(far-near)*i/5;const a=project(z,-.9),b=project(z,.9);line([[a.x,a.y],[b.x,b.y]],'#e1eee077',Math.max(1,1.5*unit))}return;
 }
 if(o.type==='puddle'){
  ellipse(p.x,p.y,roadWidth*(o.wide?.68:.3),13*unit,'#3b899e');ellipse(p.x+6*unit,p.y-3*unit,roadWidth*(o.wide?.57:.24),7*unit,'#87cbd4');line([[p.x-roadWidth*.12,p.y-4*unit],[p.x+roadWidth*.12,p.y-4*unit]],'#daf4e8',Math.max(1,2*unit));return;
 }
 if(o.type==='roller'){
  const half=roadWidth*.36;ctx.fillStyle='#c6aa78';ctx.beginPath();ctx.moveTo(p.x-half,p.y);ctx.bezierCurveTo(p.x-half*.8,p.y-28*unit,p.x+half*.8,p.y-28*unit,p.x+half,p.y);ctx.fill();line([[p.x-half*.7,p.y-8*unit],[p.x+half*.7,p.y-8*unit]],'#f4dca0',Math.max(1,3*unit));return;
 }
 if(o.type==='ramp'){
  const spec=RumbleRiding.ramps[o.style||'simple'],half=.45;
  // Raised quarter-pipe profile, with visible steel cheeks and a clear takeoff lip.
  const point=(t,x,ground=false)=>{const z=Math.max(0,o.z-spec.length*(1-t)),q=project(z,x);return [q.x,q.y-(ground?0:RumbleRiding.rampHeight(o.style,t)*h*.007*q.s)]};
  const start=Math.max(0,1-o.z/spec.length),steps=16;
  const edge=(x,ground=false)=>Array.from({length:steps+1},(_,i)=>point(start+(1-start)*i/steps,x,ground));
  for(const side of [-1,1]){
   const x=o.x+side*half,top=edge(x),base=edge(x,true);
   poly([...top,...base.reverse()],side<0?'#193f4d':'#102c38');
   for(let i=3;i<16;i+=3){const t=i/16;if(t<start)continue;line([point(t,x),point(t,x,true)],'#e6a13e',Math.max(1,3*p.s));}
  }
  for(let i=steps-1;i>=0;i--){
   const t0=Math.max(start,i/steps),t1=(i+1)/steps;if(t1<=start)continue;
   poly([point(t0,o.x-half),point(t0,o.x+half),point(t1,o.x+half),point(t1,o.x-half)],i%2?'#287d8c':'#2c8492');
  }
  for(const side of [-1,1]){
   poly([...edge(o.x+side*half),...edge(o.x+side*(half-.035)).reverse()],'#ffc74e');
   line(edge(o.x+side*half),'#ffed9a',Math.max(1,2*p.s));
  }
  // Large perspective-painted chevrons remain readable from the approach.
  for(const t of [.22,.46,.70])if(t>start+.03){
   poly([point(t-.08,o.x-.29),point(t+.04,o.x),point(t-.08,o.x+.29),point(t-.015,o.x+.29),point(t+.105,o.x),point(t-.015,o.x-.29)],'#fff0ad');
  }
  const lip=point(1,o.x),lipL=point(1,o.x-half),lipR=point(1,o.x+half);
  line([lipL,lipR],'#ffcf51',Math.max(2,7*p.s));
  for(const side of [-1,1]){
   const q=point(1,o.x+side*(half-.025)),pole=43*p.s;
   line([q,[q[0],q[1]-pole]],'#e9e9cc',Math.max(1,3*p.s));
   poly([[q[0],q[1]-pole],[q[0]-side*20*p.s,q[1]-pole+8*p.s],[q[0],q[1]-pole+15*p.s]],'#ff764b');
  }
  return;
 }
 if(o.type==='tunnel'){
  const half=roadWidth*1.07,top=p.y-380*unit*Math.max(1,h/700);
  const back=project(o.z+35,0),bu=back.s*Math.min(w/900,1),bh=w*.48*back.s*1.07,bt=back.y-380*bu*Math.max(1,h/700);
  ribbon([o.z+35,o.z],-1,1,'#183b4228');
  poly([[p.x-half,top+38*unit],[p.x+half,top+38*unit],[back.x+bh,bt+38*bu],[back.x-bh,bt+38*bu]],'#788372');
  line([[p.x-half,top+38*unit],[back.x-bh,bt+38*bu]],'#d3c6a5',Math.max(1,5*unit));
  line([[p.x+half,top+38*unit],[back.x+bh,bt+38*bu]],'#d3c6a5',Math.max(1,5*unit));
  ctx.strokeStyle='#a29278';ctx.lineWidth=Math.max(2,22*unit);ctx.beginPath();ctx.moveTo(p.x-half,p.y);ctx.lineTo(p.x-half,top+60*unit);ctx.bezierCurveTo(p.x-half,top-28*unit,p.x+half,top-28*unit,p.x+half,top+60*unit);ctx.lineTo(p.x+half,p.y);ctx.stroke();
  ctx.strokeStyle='#d3c6a5';ctx.lineWidth=Math.max(1,5*unit);ctx.stroke();
  // Short covered coastal gallery with an open, readable road below.
  ellipse(p.x,top+8*unit,6*unit,4*unit,'#ffe7a3');return;
 }
 if(o.type==='finish'){
  const half=roadWidth*1.03,top=p.y-400*unit*Math.max(1,h/700);
  line([[p.x-half,p.y],[p.x-half,top]],'#f5e2b5',Math.max(2,10*unit));line([[p.x+half,p.y],[p.x+half,top]],'#f5e2b5',Math.max(2,10*unit));
  for(let row=0;row<3;row++)for(let col=0;col<16;col++){ctx.fillStyle=(row+col)%2?'#fff0cc':'#203943';ctx.fillRect(p.x-half+col*half/8,top+row*14*unit,half/8+.5,14*unit+.5)}
  for(let i=0;i<12;i++){const a=project(o.z, -1+i/6),b=project(o.z+6,-1+i/6);poly([[a.x,a.y],[a.x+roadWidth/6,a.y],[b.x+roadWidth/6,b.y],[b.x,b.y]],i%2?'#fff0cc':'#203943')}
 }
}

function draw(){
updateOcclusion();const theme=scenery.theme;
ctx.save();if(!reducedMotion&&state==='race'){ctx.translate(w/2,h/2);ctx.rotate(-lean*.009-RumbleRiding.bank(circuit,position)*.002);ctx.scale(1.015,1.015);ctx.translate(-w/2,-h/2);}
// Follow the rider gently at the top of a high jump; keep the sky filled.
const airCamera=reducedMotion?0:Math.max(0,jumpY-180)*Math.min(h/700,1.3)*.62;
ctx.translate(0,airCamera);
ctx.drawImage(scenery.background,0,-airCamera,w,h+airCamera);
// The verges and asphalt are continuous ribbons: no horizontal polygon seams.
const ground=ctx.createLinearGradient(0,h*.38,0,h);ground.addColorStop(0,theme.ground[0]);ground.addColorStop(1,theme.ground[1]);
ribbon(depths,-30,theme.water?1.85:30,ground);ctx.globalAlpha=.35;ribbon(depths,-30,theme.water?1.85:30,ctx.createPattern(scenery.grain,'repeat'));ctx.globalAlpha=1;
if(theme.water){ribbon(depths,1.85,2.12,'#ded2ae');ribbon(depths,2.12,2.20,'#e9e1c3');ribbon(depths,2.20,2.24,'#b6cfbb')}
ribbon(depths,-1.16,1.16,'#b1ad88');ribbon(depths,-1.06,1.06,'#8a9180');
const asphalt=ctx.createLinearGradient(0,h*.38,0,h);asphalt.addColorStop(0,theme.road[0]);asphalt.addColorStop(1,theme.road[1]);ribbon(depths,-1,1,asphalt);ctx.globalAlpha=.45;ribbon(depths,-1,1,ctx.createPattern(scenery.grain,'repeat'));ctx.globalAlpha=1;
for(const [start,end] of RumbleRiding.dirt[circuit]){
 const near=Math.max(0,start-position),far=Math.min(650,end-position);if(far<=near)continue;
 const samples=[far,...depths.filter(z=>z<far&&z>near),near];ribbon(samples,-1,1,'#a1855e');ctx.globalAlpha=.5;ribbon(samples,-1,1,ctx.createPattern(scenery.grain,'repeat'));ctx.globalAlpha=1;
}
ribbon(depths,-.963,-.952,'#e5debe');ribbon(depths,.952,.963,'#e5debe');
// Moving painted dashes and roadside texture, seeded in world coordinates.
for(let i=0;i<85;i++){
 const z=((i*15-position)%1275+1275)%1275;if(z>640)continue;
 if(theme.prop==='bamboo')ribbon([z+1.5,z],-.95,.95,'#d8c28b');else if(i%2===0)ribbon([z+9,z],-.009,.009,'#f5deb0');
 const a=project(z,-1.15-(Math.sin(i*31)*.5+.5)*3),b=project(z,1.3+(Math.sin(i*11)*.5+.5)*.35);
 for(const p of [a,b]){ellipse(p.x,p.y,12*p.s,2*p.s,'#66784a66');line([[p.x-4*p.s,p.y],[p.x-7*p.s,p.y-8*p.s],[p.x-2*p.s,p.y-4*p.s],[p.x+2*p.s,p.y-11*p.s]],'#d2c28b88',Math.max(.4,1.2*p.s))}
}
// Guardrail hugs the sea side. Posts and twin rails converge into the bend.
for(let z=630;z>4;z-=12){const p=project(z,1.12);line([[p.x,p.y],[p.x,p.y-27*p.s]],'#626e68',Math.max(.6,4*p.s))}
for(const height of [20,30]){const pts=depths.map(z=>{const p=project(z,1.12);return[p.x,p.y-height*p.s]});line(pts,'#607773',height===20?2:4);line(pts.map(p=>[p[0],p[1]-1]),'#d3d3b6',height===20?1:2)}
for(let z=630;z>4;z-=6){
 if(RumbleWorld.deck(circuit,position+z,-.5)<.2)continue;
 const a=project(z,-.9),b=project(z,-.12),c=project(z+6,-.12),d=project(z+6,-.9);if(a.hidden)continue;
 const lift=RumbleWorld.deck(circuit,position+z,-.5)*h*.007*a.s;
 if(z%30===0){line([[a.x,a.y],[a.x,a.y+lift]],'#736e58',Math.max(1,5*a.s));line([[b.x,b.y],[b.x,b.y+lift]],'#736e58',Math.max(1,5*b.s))}
 const farLift=RumbleWorld.deck(circuit,position+z+6,-.5)*h*.007*c.s;
 poly([[b.x,b.y],[c.x,c.y],[c.x,c.y+farLift],[b.x,b.y+lift]],theme.prop==='rock'?'#927050':'#766c55');
 poly([[a.x,a.y],[b.x,b.y],[c.x,c.y],[d.x,d.y]],theme.prop==='rock'?'#b28b61':'#a99570');
 if(z%30===0){const q=project(z,-.5);line([[q.x-10*q.s,q.y+3*q.s],[q.x,q.y-7*q.s],[q.x+10*q.s,q.y+3*q.s]],'#fff0b4',Math.max(1,3*q.s))}

 line([[a.x,a.y],[b.x,b.y]],'#e2d3a3',Math.max(.5,1.5*a.s));
 line([[a.x,a.y-10*a.s],[d.x,d.y-10*d.s]],'#e3d9b8',Math.max(1,3*a.s));
}
const objects=[];
for(let i=0;i<61;i++){
 const z=((i*23-position)%1403+1403)%1403;
 if(z>2&&z<630){
  const spacing={harbor:4,vineyard:2,reeds:2,rock:3,turbine:6,city:3,bridge:7,bamboo:2,redwood:2,stadium:4}[theme.prop];
  if(i%spacing===0){objects.push({z,type:'worldprop',side:-1.55-(Math.sin(i*17)*.5+.5)*1.8,index:i});if(!theme.water)objects.push({z:z+10,type:'worldprop',side:1.55+(Math.sin(i*11)*.5+.5)*1.5,index:i+1})}
  if(theme.prop==='vineyard'&&i%14===0)objects.push({z,type:'worldprop',side:1.7,index:i});
  if(['harbor','vineyard'].includes(theme.prop)&&i%9===0)objects.push({z:z+8,type:'tree',side:-2.3,index:i});
  if(i%3===0&&['vineyard','redwood','turbine'].includes(theme.prop))objects.push({z:z+4,type:'shrub',side:i%2?-1.22:1.58,index:i});
 }
}
features.forEach(f=>{const z=f.distance-position;if(!f.done&&z>0&&z<640)objects.push({...f,z})});
rivals.filter(r=>r.z>4).forEach(r=>objects.push({...r,type:'bike'}));objects.sort((a,b)=>b.z-a.z);
for(const o of objects){
 const p=project(o.z,o.x??o.side??0);if(p.hidden)continue;
 if(o.type==='worldprop'){const scale=p.s*Math.min(w/1000,1.25)*(theme.prop==='redwood'?1.55:1);ctx.drawImage(scenery.prop(theme.prop==='vineyard'&&o.index%14?'vines':theme.prop,o.index),p.x-220*scale,p.y-506*scale,440*scale,520*scale);continue}
 if(['star','puddle','ramp','tunnel','finish','apex','landing','speed','roller','stream'].includes(o.type)){drawFeature(o,p);continue}
 if(o.type==='bike'){if(circuits[circuit].kind==='draft'){for(let i=1;i<=3;i++){const q=project(Math.max(4,o.z-i*12),o.x);line([[q.x-12*q.s,q.y],[q.x,q.y-7*q.s],[q.x+12*q.s,q.y]],'#8de6e1',Math.max(1,3*q.s))}}const rivalScale=p.s*2*Math.min(w/900,1),lift=(o.airY>0?o.airY:rampRise(o.distance,o.x))*p.s*Math.min(w/900,1);if(o.flip&&o.airY>0)stuntBike(p.x,p.y-lift,rivalScale,o.c,RumbleRiding.rotation(o.airAge,o.airDuration,o.airY,o.airV));else bike(p.x,p.y-lift,rivalScale,o.c,Math.sin(time*2+o.z)*.035-RumbleRiding.bank(circuit,o.distance)*.015,(o.airY||0)>0);continue}
 if(o.type==='tree'){
  const scale=p.s*(1.0+(o.index%3)*.13)*Math.min(w/1000,1.3);
  if(p.x+220*scale<0||p.x-220*scale>w)continue;
  ellipse(p.x-20*scale,p.y,90*scale,12*scale,'#2f4c3b29');
  ctx.drawImage(scenery.trees[o.index%5],p.x-220*scale,p.y-506*scale,440*scale,520*scale);
 }else{const scale=p.s*.8;ctx.drawImage(scenery.shrubs[o.index%3],p.x-120*scale,p.y-115*scale,240*scale,140*scale)}
}
const p=project(4,playerX),scale=Math.min(h/470,w/480),heightScale=Math.min(h/700,1.3);
const rising=jumpY>0?jumpY:rampRise(position+4,playerX);
const compression=Math.sin(landingAge*24)*Math.exp(-landingAge*9)*landingForce;
const floorY=p.y-12,bodyY=floorY-rising*heightScale+compression*6;
if(jumpY>0)ellipse(p.x+6,floorY,35*scale/(1+jumpY/400),7*scale,'#18282d35');
if(boost>0)for(const side of [-1,1]){const x=p.x+side*24*scale;poly([[x-5*scale,bodyY],[x+5*scale,bodyY],[x+side*4*scale,bodyY+(18+Math.sin(time*35)*6)*scale]],'#ffce6688')}
if(jumpMode==='flip'&&jumpY>0)stuntBike(p.x,bodyY,scale,palette[colour],flipAngle);
else bike(p.x,bodyY,scale,palette[colour],lean*.22-RumbleRiding.bank(circuit,position)*.015-jumpV*.00012,jumpY>0);
const dirt=RumbleRiding.surface(circuit,position)==='dirt';
if((dirt&&state==='race')||splash>0||landingAge<.25){
 for(let i=0;i<10;i++){const t=(time*2+i*.113)%1;ellipse(p.x+(i%2?1:-1)*(12+t*45)*scale,floorY+6+t*20,2+t*7,1+t*3,splash>0?'#acdfe7aa':'#cbb88b55')}
}

ctx.restore();
if(theme.prop==='reeds'&&!reducedMotion){ctx.save();ctx.globalAlpha=.22;for(let i=0;i<36;i++){const x=(i*137+time*45)%w,y=(i*93+time*420)%h;line([[x,y],[x-6,y+17]],'#e4f3ee',1)}ctx.restore()}
if(!reducedMotion&&state==='race'&&(rush>.05||speed>60)){
 ctx.save();ctx.globalAlpha=.1+rush*.27;
 for(let i=0;i<18;i++){
  const t=(time*(.8+rush)+i*.173)%1,side=i%2?-1:1;
  const x=w*.5+side*w*(.34+t*.3),y=h*(.38+t*.7),length=(20+80*rush)*t;
  line([[x,y],[x+side*length*.6,y+length]],rush>.3?'#ffedb5':'#e6f4e7',1+t*2);
 }
 ctx.restore();
}
}
let finishDistance=6840;
const circuits=window.RumbleTour.circuits;
let circuit=0,resumeCircuit=0,unlocked=1,completed=Array(10).fill(false),medals=Array(10).fill(false),challenge=0,draft=0,draftCooldown=0,pairedHops={},passedRacers=new Set();
const palette=['#df704d','#45b9be','#a98bdb','#e5b73d'];
let state='intro',countdown=0,stars=0,jumpY=0,jumpV=0,jumpAge=0,slow=0,boost=0,flash=0,toast='',bank=0,colour=0,features=[],collected=0,speed=0,rush=0,chain=0,engine=null,engineGain=null,raceTime=0,place=7,passes=0,flightDuration=1,flipAngle=0,landingAge=10,landingForce=0,splash=0,rampList=[],previousGrade=0,jumpMode='none';
const reducedMotion=matchMedia("(prefers-reduced-motion: reduce)").matches;
let audio=null,muted=false,padJump=false,padDirection=0,padMenuDirection=0;
try{const save=JSON.parse(localStorage.getItem('rumble-star-sprint')||'{}');bank=Math.max(0,Math.min(100000,Number(save.bank)||0));colour=Math.max(0,Math.min(3,Math.floor(Number(save.colour))||0));if(colour>Math.floor(bank/8))colour=0;unlocked=Math.max(1,Math.min(10,Math.floor(Number(save.unlocked)||1)));circuit=Math.max(0,Math.min(unlocked-1,Math.floor(Number(save.circuit)||0)));resumeCircuit=circuit;completed=Array.from({length:10},(_,i)=>save.completed?.[i]===true);medals=Array.from({length:10},(_,i)=>save.medals?.[i]===true);finishDistance=circuits[circuit].length}catch{}
const ui={stars:document.querySelector('#stars'),speed:document.querySelector('#speed'),progress:document.querySelector('#progress'),rider:document.querySelector('#rider-progress'),message:document.querySelector('#message'),intro:document.querySelector('#intro'),finish:document.querySelector('#finish'),pause:document.querySelector('#pause')};
const rivalMarkers=rivals.map((r,i)=>{const el=document.createElement('div');el.className='rival-marker';el.style.background=r.c;el.style.top=`${3+i*5}px`;el.setAttribute('role','img');ui.progress.parentElement.append(el);return el});
function updateRaceMap(){
 const progress=Math.min(100,position/finishDistance*100);ui.progress.style.width=`${progress}%`;ui.rider.style.left=`${progress}%`;
 rivals.forEach((r,i)=>{const percentage=Math.max(0,Math.min(100,r.distance/finishDistance*100));const left=`${percentage.toFixed(1)}%`,label=`Racer ${i+1}: ${Math.round(percentage)}% of circuit`;if(rivalMarkers[i].style.left!==left)rivalMarkers[i].style.left=left;if(rivalMarkers[i].getAttribute('aria-label')!==label)rivalMarkers[i].setAttribute('aria-label',label)});
}
function sound(freq,duration=.1,delay=0,type='sine'){
 if(!audio||muted)return;const t=audio.currentTime+delay,osc=audio.createOscillator(),gain=audio.createGain();osc.type=type;osc.frequency.setValueAtTime(freq,t);gain.gain.setValueAtTime(.0001,t);gain.gain.exponentialRampToValueAtTime(.07,t+.015);gain.gain.exponentialRampToValueAtTime(.0001,t+duration);osc.connect(gain);gain.connect(audio.destination);osc.start(t);osc.stop(t+duration+.02);
}
function enableSound(){try{
 audio ||= new (window.AudioContext||window.webkitAudioContext)();audio.resume().catch(()=>{});
 if(!engine){engine=audio.createOscillator();engine.type='triangle';engineGain=audio.createGain();engineGain.gain.value=0;engine.connect(engineGain);engineGain.connect(audio.destination);engine.start()}
}catch{}}
function engineSound(){if(!engine)return;const running=state==='race'&&!paused&&!document.hidden&&!muted;
 engine.frequency.setTargetAtTime(48+speed*1.2+(jumpY>0?25:0),audio.currentTime,.1);
 engineGain.gain.setTargetAtTime(running?.035:0,audio.currentTime,.07);
}
function show(symbol){toast=symbol;flash=.8}
function buildCourse(){const result=window.RumbleTour.build(circuit);rampList=result.filter(f=>f.type==='ramp');return result}
function challengeProgress(){
 const c=circuits[circuit];
 document.querySelector('#circuit-label').textContent=`${circuit+1} / 10`;
 document.querySelector('#challenge-icon').textContent=c.icon;
 document.querySelector('#challenge-dots').textContent=Array.from({length:c.target},(_,i)=>i<challenge?'●':'○').join('');
 document.querySelector('#challenge-hud').setAttribute('aria-label',`${c.name}: ${challenge} of ${c.target}`);
 document.querySelector('#draft-meter').style.display=c.kind==='draft'?'block':'none';
 document.querySelector('#draft-meter i').style.width=`${Math.min(1,draft/1.1)*100}%`;
}
function award(kind){
 const c=circuits[circuit];
 if(c.kind===kind||(c.kind==='mix'&&['apex','hop','landing','speed','gallery','pass','draft'].includes(kind))){
  const before=challenge;challenge=Math.min(c.target,challenge+1);
  if(challenge===c.target&&before<c.target){show(`${c.icon} ✓`);sound(1046,.3);sound(1318,.3,.13)}
 }
}
function refreshTour(){
 const picker=document.querySelector('#circuit-picker');picker.replaceChildren();
 const stops=[[55,65],[150,85],[250,55],[350,85],[445,65],[445,205],[350,180],[250,210],[150,180],[55,205]];
 const route=stops.map(p=>p.join(',')).join(' ');
 picker.insertAdjacentHTML('beforeend',`<svg viewBox="0 0 500 270" aria-hidden="true"><rect width="500" height="270" rx="24" fill="#75b9c2"/><path d="M15 45Q70 5 145 30T275 22T475 37L487 209Q453 258 369 237T235 246T35 244Q5 217 25 167T15 45" fill="#e3cf94"/><path d="M30 53Q90 20 155 45T280 40T460 50L470 202Q422 236 355 219T240 229T45 227Q22 207 42 164T30 53" fill="#88a979"/><path d="M190 0Q170 95 220 135T280 270" fill="none" stroke="#75b9c2" stroke-width="22"/><path d="M310 105l27-50 28 50zM365 145l28-48 25 48z" fill="#668b71"/><path d="M55 112l15-30 15 30zM85 137l15-30 15 30zM315 245l15-30 15 30z" fill="#3e7763"/><polyline points="${route}" fill="none" stroke="#5d725f" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/><polyline points="${route}" fill="none" stroke="#fff1bb" stroke-width="3" stroke-dasharray="5 8" stroke-linecap="round"/></svg>`);
 circuits.forEach((c,i)=>{const b=document.createElement('button');b.disabled=i>=unlocked;b.setAttribute('aria-label',`${i+1}. ${c.name}${completed[i]?' completed':''}`);b.setAttribute('aria-pressed',String(i===circuit));b.title=c.name;b.style.left=`${stops[i][0]/5}%`;b.style.top=`${stops[i][1]/2.7}%`;
  b.innerHTML=`${b.disabled?'🔒':c.icon}<small>${i+1}</small>`;b.classList.toggle('complete',completed[i]);b.onclick=()=>selectCircuit(i);picker.append(b)
 });
 document.querySelector('#challenge-demo').textContent=circuits[circuit].demo;
 challengeProgress();
}
function selectCircuit(index){
 if(index<0||index>=unlocked)return;
 circuit=index;resumeCircuit=index;scenery.configure(circuit,w,h);finishDistance=circuits[index].length;challenge=0;draft=0;position=0;time=0;speed=0;rush=0;jumpY=0;jumpV=0;playerX=-.25;lean=0;features=buildCourse();stars=0;place=7;ui.stars.textContent='0';ui.speed.textContent='0';ui.progress.style.width='0%';ui.rider.style.left='0%';document.querySelector('#place').textContent='7 / 7';rivals.splice(0,rivals.length,...makeRacers());save();refreshTour();draw();
}
function navigateMap(dx,dy){
 const row=circuit<5?0:1,col=circuit<5?circuit:9-circuit;
 const nextRow=Math.max(0,Math.min(1,row+dy)),nextCol=Math.max(0,Math.min(4,col+dx));
 selectCircuit(nextRow===0?nextCol:9-nextCol);
}
function openTour(){
 state='intro';paused=false;keys.clear();document.querySelectorAll('.confetti').forEach(n=>n.remove());ui.finish.hidden=true;ui.intro.hidden=false;ui.message.textContent='';document.querySelector('main').classList.remove('boosting');engineSound();selectCircuit(circuit);
}
function nextCircuit(){
 if(state!=='finish')return;
 circuit=Math.min(9,circuit+1);openTour();document.querySelector('#play').focus({preventScroll:true});
}
function primaryAction(){if(state==='finish')nextCircuit();else reset()}

function reset(){
 enableSound();resumeCircuit=circuit;save();challenge=0;draft=0;draftCooldown=0;pairedHops={};passedRacers=new Set();challengeProgress();state='countdown';countdown=2.4;position=0;time=0;playerX=-.25;lean=0;paused=false;stars=0;collected=0;jumpY=0;jumpV=0;jumpAge=0;flipAngle=0;flightDuration=1;landingAge=10;landingForce=0;splash=0;jumpMode='none';slow=0;boost=0;flash=0;speed=0;rush=0;chain=0;raceTime=0;place=7;passes=0;previousGrade=RumbleWorld.grade(circuit,0);keys.clear();features=buildCourse();
 rivals.splice(0,rivals.length,...makeRacers());ui.intro.hidden=true;ui.finish.hidden=true;ui.pause.textContent='Ⅱ';document.querySelectorAll('.confetti').forEach(n=>n.remove());ui.stars.textContent='0';document.querySelector('#place').textContent='7 / 7';ui.speed.textContent='0';document.querySelector('#turbo').textContent='☆☆☆';document.querySelector('main').classList.remove('boosting');ui.progress.style.width='0%';ui.rider.style.left='0%';draw();
}
function save(){try{localStorage.setItem('rumble-star-sprint',JSON.stringify({bank,colour,circuit:resumeCircuit,unlocked,completed,medals}))}catch{}}
function chooseColours(){
 const target=document.querySelector('#colours');target.replaceChildren();palette.forEach((c,i)=>{const b=document.createElement('button');b.style.background=c;b.disabled=bank<i*8;b.textContent=b.disabled?'🔒':'🏍';b.setAttribute('aria-label',b.disabled?`Unlock at ${i*8} stars`:`Choose bike colour ${i+1}`);b.setAttribute('aria-pressed',String(i===colour));b.onclick=()=>{colour=i;save();chooseColours();draw()};target.append(b)});
}
function finish(){
 state='finish';keys.clear();bank+=stars;completed[circuit]=true;medals[circuit] ||= challenge>=circuits[circuit].target;unlocked=Math.max(unlocked,Math.min(10,circuit+2));resumeCircuit=Math.min(9,circuit+1);save();ui.finish.hidden=false;ui.message.textContent='';document.querySelector('#finish-place').textContent=`🏁 ${place} / 7`;document.querySelector('main').classList.remove('boosting');
 document.querySelector('#result-stars').textContent=`★ ${stars} / ${features.filter(f=>f.type==='star').length}`;
 document.querySelector('#bank').textContent=String(bank);document.querySelector('#jar-fill').style.width=`${Math.min(bank/24,1)*100}%`;chooseColours();
 document.querySelector('#clear-badge').textContent=circuit===9&&completed.every(Boolean)?'🏆 10 / 10 🏆':`${circuits[circuit].icon} ✓`;
 const stamps=document.querySelector('#tour-stamps');stamps.replaceChildren();circuits.forEach((c,i)=>{const stamp=document.createElement('span');stamp.textContent=medals[i]?'🏅':c.icon;stamp.className=(completed[i]?'earned ':'')+(i===circuit?'new':'');stamp.setAttribute('aria-label',`${c.name}: ${completed[i]?'complete':'not complete'}`);stamps.append(stamp)});
 document.querySelector('#next').textContent='Ⓐ 🗺';document.querySelector('#next').setAttribute('aria-label','Continue to the world map');document.querySelector('#finish .trophy').textContent=place===1?'🏆':'🏅';
 [523,659,784,1046,1318,1568].forEach((f,i)=>sound(f,.3,i*.14));
 for(let i=0;i<(circuit===9?80:48);i++){const el=document.createElement('i');el.className='confetti';el.style.left=`${(i*37)%100}%`;el.style.background=['#ffd16b','#f48a63','#7dd7cf','#c3a2f0'][i%4];el.style.animationDelay=`${i%8*.1}s`;el.style.setProperty('--drift',`${(i%7-3)*25}px`);document.querySelector('main').append(el);el.addEventListener('animationend',()=>el.remove())}
 document.querySelector('#next').focus({preventScroll:true});
}
function groundRate(){return speed*4.9*(RumbleWorld.grade(circuit,position)+(RumbleWorld.deck(circuit,position+5,playerX)-RumbleWorld.deck(circuit,position-5,playerX))/10)}
function jump(){if(paused||state!=='race'||(jumpY>0&&jumpMode!=='crest'))return;enableSound();jumpMode='manual';jumpY=Math.max(1,jumpY);jumpV=230+groundRate();jumpAge=0;sound(330,.12);sound(510,.1,.08)}
function toggle(){if(state!=='race'&&state!=='countdown')return;paused=!paused;keys.clear();ui.pause.textContent=paused?'▶':'Ⅱ';ui.pause.setAttribute('aria-label',paused?'Resume race':'Pause race');ui.message.textContent=paused?'Ⅱ':'';engineSound();draw()}
function inputDown(code){if(keys.has(code))return;keys.add(code);if(code==='Space')jump()}
function inputUp(code){keys.delete(code)}
addEventListener('keydown',e=>{
 if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Space','KeyA','KeyD','KeyM','KeyP','Escape','Enter'].includes(e.code))return;
 // Native buttons retain Enter; Space starts the picture-based intro/replay.
 if(e.code==='Enter'){if((state==='intro'||state==='finish')&&!e.repeat){e.preventDefault();primaryAction()}return}
 e.preventDefault();if(e.repeat)return;
 if(e.code==='Space'&&(state==='intro'||state==='finish')){primaryAction();return}
 if(e.code==='KeyM'){openTour();return}
 if(state==='intro'&&e.code.startsWith('Arrow')){navigateMap(e.code==='ArrowLeft'?-1:e.code==='ArrowRight'?1:0,e.code==='ArrowUp'?-1:e.code==='ArrowDown'?1:0);return}
 if(e.code==='KeyP'||e.code==='Escape'){toggle();return}inputDown(e.code);
});
addEventListener('keyup',e=>inputUp(e.code));
addEventListener('blur',()=>{if(!paused)toggle();keys.clear()});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&!paused)toggle()});
document.querySelector('#map').onclick=openTour;ui.pause.onclick=toggle;document.querySelector('#play').onclick=reset;document.querySelector('#again').onclick=reset;document.querySelector('#next').onclick=nextCircuit;document.querySelector('#tour-map').onclick=openTour;
document.querySelector('#sound').onclick=()=>{enableSound();muted=!muted;document.querySelector('#sound').textContent=muted?'♪̸':'♫';document.querySelector('#sound').setAttribute('aria-label',muted?'Enable sound':'Mute sound')};
document.querySelectorAll('[data-key]').forEach(b=>{b.onpointerdown=e=>{e.preventDefault();b.setPointerCapture(e.pointerId);inputDown(b.dataset.key)};b.onpointerup=b.onpointercancel=b.onlostpointercapture=()=>inputUp(b.dataset.key)});
function pollPad(){
 const pad=GamepadStd.readActive('rumble-riders');
 if(!pad){padDirection=0;padMenuDirection=0;if(padJump)inputUp('Space');padJump=false;return}
 if(pad.just.B){save();GamepadStd.exitToArcade();return}
 padDirection=pad.left?-1:pad.right?1:pad.ax;
 if(pad.just.X){openTour();return}
 if(state==='intro'){
  const nav=GamepadStd.navRepeat(pad,'rumble-map');
  if(nav.left||nav.right||nav.up||nav.down)navigateMap(nav.left?-1:nav.right?1:0,nav.up?-1:nav.down?1:0);
 }
 if(state==='intro'||state==='finish'){
  if(pad.just.A||pad.just.start)primaryAction();
 }else if(pad.just.start)toggle();
 else if(pad.just.A){if(paused)toggle();else inputDown('Space')}
 if(!pad.A&&padJump)inputUp('Space');padJump=pad.A;
}
function update(dt){
 time+=dt;
 if(state==='countdown'){countdown-=dt;ui.message.textContent=countdown>1.6?'🔴':countdown>.8?'🟡':'🟢';if(countdown<=0){state='race';ui.message.textContent='';sound(740,.2)}return}
 if(state!=='race')return;
 const direction=Math.max(-1,Math.min(1,(keys.has('ArrowRight')||keys.has('KeyD')?1:0)-(keys.has('ArrowLeft')||keys.has('KeyA')?1:0)+padDirection));
 lean+=(direction-lean)*Math.min(1,dt*9);playerX=Math.max(-.87,Math.min(.87,playerX+direction*dt*(RumbleRiding.surface(circuit,position)==='dirt'?1.25:1.35)));
 slow=Math.max(0,slow-dt);boost=Math.max(0,boost-dt);flash=Math.max(0,flash-dt);
 const grade=RumbleWorld.grade(circuit,position)+(RumbleWorld.deck(circuit,position+5,playerX)-RumbleWorld.deck(circuit,position-5,playerX))/10;
 const terrainSpeed=Math.max(-12,Math.min(14,-grade*60));
 const help=place>4&&raceTime>10?2.5:0;
 const desired=(slow>0?64:boost>0?112:76)+terrainSpeed+help;
 if(previousGrade>0&&grade<=0&&speed>70&&jumpY===0&&RumbleWorld.environments[circuit].hill>=25){jumpMode='crest';jumpY=1;jumpV=125;jumpAge=.4;sound(280,.06)}previousGrade=grade;
 document.querySelector('#slope').textContent=grade>.055?'↗':grade<-.055?'↘':'';
 speed+=(desired-speed)*Math.min(1,dt*3.5);
 rush+=((boost>0?1:0)-rush)*Math.min(1,dt*5);
 raceTime+=dt;
 const old=position,oldGround=RumbleWorld.height(circuit,position)+RumbleWorld.deck(circuit,position,playerX);position=Math.min(finishDistance,position+speed*dt);
 landingAge+=dt;splash=Math.max(0,splash-dt);
 if(jumpY>0){
  jumpAge+=dt;const ground=RumbleWorld.height(circuit,position)+RumbleWorld.deck(circuit,position,playerX);
  const gravity=jumpMode==='manual'&&keys.has('Space')&&jumpAge<.35?220:600;
  const flight=RumbleRiding.step(jumpY,jumpV,dt,gravity,(ground-oldGround)*4.9);jumpY=flight.height;jumpV=flight.velocity;
  if(jumpMode==='flip')flipAngle=RumbleRiding.rotation(jumpAge,flightDuration,jumpY,jumpV);
  if(flight.landed){landingAge=0;landingForce=Math.min(1,flight.impact/500);flipAngle=0;jumpMode='none';sound(120,.12);
   for(const f of features)if(f.type==='landing'&&!f.done&&Math.abs(position-f.distance)<f.span/2+35&&Math.abs(playerX-f.x)<.5){f.done=true;award('landing');show('⤴ ✓');sound(880,.16)}
  }
 }
 for(const f of features){
  if(f.done||f.distance>position+4||f.distance<old+4)continue;
  if(['finish','tunnel','landing'].includes(f.type))continue;
  f.done=true;const close=f.type==='stream'||Math.abs(f.x-playerX)<(f.type==='ramp'?.45:f.type==='puddle'?(f.wide?.68:.3):f.type==='apex'?f.width:.4);
  if(!close){if(f.type==='star')chain=0;continue;}
  if(f.type==='star'&&(!f.air||jumpY>12)){if(f.gallery)award('gallery');stars++;collected++;chain++;show('★');sound(650+(stars%4)*110,.13);if(chain===3){award('turbo');chain=0;boost=Math.max(boost,2.6);show('⚡');sound(440,.2);sound(880,.3,.08)}}
  if(f.type==='puddle'){if(jumpY>18){award('hop');if(f.pair!==undefined){pairedHops[f.pair]=(pairedHops[f.pair]||0)+1;if(pairedHops[f.pair]===2)award('double')}show('✨');sound(880,.12)}else{slow=.4;show('💦');sound(180,.12,0,'triangle')}}
  if(f.type==='apex'&&jumpY<15){award('apex');show('◇ ✓');sound(880,.1)}
  if(f.type==='speed'&&speed>=f.minimum){award('speed');show('⚡ ✓');sound(1100,.12)}
  if(f.type==='roller'&&jumpY===0){jumpMode='crest';jumpY=1;jumpV=165;jumpAge=.4;sound(250,.08)}
  if(f.type==='ramp')startRamp(f);
  if(f.type==='stream'){if(jumpY>18){show('✨');sound(880,.12)}else{slow=.25;splash=.6;show('💦');sound(160,.15)}}
 }
 // Rivals travel their own distance; boosts and clean riding change the actual gaps.
 rivals.forEach((r,i)=>{
  const priorGap=r.z-4,gap=r.distance-position;
  const catchup=Math.max(-1.5,Math.min(2,-gap*.012));
  const aiSpeed=74.5+i*1.4+circuit*.18+(circuit===4?2:0)+Math.sin(raceTime*.55+i*1.4)*3+catchup+Math.max(-12,Math.min(14,-RumbleWorld.grade(circuit,r.distance)*60));
  const localGrade=RumbleWorld.grade(circuit,r.distance)+(RumbleWorld.deck(circuit,r.distance+5,r.x)-RumbleWorld.deck(circuit,r.distance-5,r.x))/10;if(r.grade>0&&localGrade<=0&&RumbleWorld.environments[circuit].hill>=25){r.airY=1;r.airV=125}r.grade=localGrade;if(r.airY>0){r.airAge+=dt;const flight=RumbleRiding.step(r.airY,r.airV,dt);r.airY=flight.height;r.airV=flight.velocity;if(flight.landed)r.flip=false}
  const previous=r.distance;r.distance+=aiSpeed*dt;for(const f of features){if(['ramp','roller'].includes(f.type)&&f.distance>previous&&f.distance<=r.distance&&Math.abs(f.x-r.x)<.4&&r.airY===0){const launch=RumbleRiding.launch(f.style||'simple',aiSpeed);r.airY=f.type==='ramp'?launch.height:1;r.airV=f.type==='ramp'?launch.velocity:165;r.airAge=0;r.airDuration=launch.duration;r.flip=f.style==='flip'}}r.z=r.distance-position+4;if(priorGap>0&&r.z<=4&&!passedRacers.has(i)){passedRacers.add(i);award('pass')}
  if(r.finishedAt===null&&r.distance>=finishDistance)r.finishedAt=raceTime-dt+(finishDistance-previous)/aiSpeed;
  let lane=r.lane+Math.sin(time*.6+i*1.7)*.14;
  if(Math.abs(r.z-4)<24&&Math.abs(lane-playerX)<.28)lane=playerX+(lane>=playerX?.34:-.34);
  r.x+=(Math.max(-.8,Math.min(.8,lane))-r.x)*Math.min(1,dt*3);
 });
 if(circuits[circuit].kind==='draft'){
  draftCooldown=Math.max(0,draftCooldown-dt);
  const following=rivals.some(r=>r.z>18&&r.z<130&&Math.abs(r.x-playerX)<.25);
  draft=following&&draftCooldown===0?draft+dt:Math.max(0,draft-dt*1.5);
  if(draft>=1.1){draft=0;draftCooldown=3;boost=Math.max(boost,2);award('draft');show('💨 ⚡');sound(780,.25)}
 }
 challengeProgress();
 const nextPlace=1+rivals.filter(r=>r.distance>position).length;
 if(nextPlace<place){passes+=place-nextPlace;show('🏍 ↑');sound(980,.12)}
 place=nextPlace;
 document.querySelector('#place').textContent=`${place} / ${rivals.length+1}`;
 document.querySelector('#turbo').textContent=boost>0?'⚡⚡⚡':'★'.repeat(chain)+'☆'.repeat(3-chain);
 document.querySelector('#turbo').classList.toggle('active',boost>0);
 document.querySelector('main').classList.toggle('boosting',boost>0);
 ui.stars.textContent=String(stars);ui.speed.textContent=String(Math.round(speed*1.45));ui.message.textContent=flash>0?toast:'';
 updateRaceMap();
 if(position>=finishDistance)finish();
}
// Read-only state for browser QA; gameplay uses normal keyboard, touch and gamepad input.
Object.defineProperty(window,'rumbleState',{get:()=>({state,paused,position,playerX,stars,jumpY,jumpV,jumpMode,flipAngle,flightDuration,landingAge,splash,slow,boost,bank,colour,finishDistance,circuit,unlocked,completed:[...completed],medals:[...medals],challenge,challengeTarget:circuits[circuit].target,challengeKind:circuits[circuit].kind,terrain:{elevation:RumbleWorld.height(circuit,position),grade:RumbleWorld.grade(circuit,position),deck:RumbleWorld.deck(circuit,position,playerX),environment:scenery.theme.prop,bank:RumbleRiding.bank(circuit,position),surface:RumbleRiding.surface(circuit,position)},draft,speed,chain,place,passes,raceTime,racers:rivals.map(r=>({z:r.z,x:r.x,c:r.c,distance:r.distance,airY:r.airY})),remaining:features.filter(f=>f.type==='star'&&!f.done).length})});
function frame(now){const dt=Math.min((now-last)/1000,.04);last=now;pollPad();engineSound();if(!paused&&!document.hidden){update(dt);if(state!=='finish')draw()}requestAnimationFrame(frame)}
scenery.configure(circuit,w,h);features=buildCourse();refreshTour();updateRaceMap();draw();requestAnimationFrame(frame);
})();
