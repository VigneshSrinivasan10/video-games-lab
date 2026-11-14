(() => {
const Base=window.RumbleScenery;
window.RumbleScenery=class extends Base {
 constructor(){super();this.worldIndex=0;this.props=new Map()}
 configure(index,w,h){this.worldIndex=index;this.resize(w,h)}
 resize(w,h){
  const e=RumbleWorld.environments[this.worldIndex||0];this.theme=e;
  [this.background,this.bg]=this.surface(w,h);const c=this.bg,rng=this.random(999+(this.worldIndex||0)*701);
  const gradient=c.createLinearGradient(0,0,0,h*.65);gradient.addColorStop(0,e.sky[0]);gradient.addColorStop(1,e.sky[1]);c.fillStyle=gradient;c.fillRect(0,0,w,h);
  const ridge=(pts,color,base=.63)=>{c.fillStyle=color;c.beginPath();c.moveTo(0,h*base);c.lineTo(pts[0][0]*w,pts[0][1]*h);for(let i=1;i<pts.length;i++){const a=pts[i-1],b=pts[i];c.bezierCurveTo((a[0]+b[0])*.5*w,a[1]*h,(a[0]+b[0])*.5*w,b[1]*h,b[0]*w,b[1]*h)}c.lineTo(w,h*base);c.fill()};
  if(e.prop==='stadium'){
   for(let i=0;i<75;i++)this.oval(c,rng()*w,rng()*h*.33,.7,.7,'#f9e9c9aa');this.oval(c,w*.8,h*.15,15,15,'#fbecd0');
  }else if(e.prop!=='reeds'){
   const g=c.createRadialGradient(w*.78,h*.18,5,w*.78,h*.18,h*.28);g.addColorStop(0,'#fff1ce88');g.addColorStop(1,'#fff1ce00');c.fillStyle=g;c.fillRect(0,0,w,h*.55);this.oval(c,w*.78,h*.18,h*.025,h*.025,'#fff0d0');
  }
  c.filter='blur(4px)';for(let i=0;i<18;i++)this.oval(c,rng()*w,h*(.07+rng()*.18),w*(.03+rng()*.08),h*(.004+rng()*.008),e.prop==='reeds'?'#dce5df65':'#ffefd62b');c.filter='none';
  for(let layer=0;layer<2;layer++){
   const points=[];for(let i=0;i<=10;i++)points.push([i/10,.25+layer*.08+Math.sin(i*1.5+this.worldIndex)*.055+rng()*.035]);
   ridge(points,e.hills[layer]);
  }
  if(e.water){const sea=c.createLinearGradient(0,h*.39,0,h);sea.addColorStop(0,e.prop==='bamboo'?'#7bb8aa':'#8cb7bb');sea.addColorStop(1,e.prop==='reeds'?'#426e77':'#367b90');c.fillStyle=sea;c.fillRect(0,h*.4,w,h*.6);for(let i=0;i<100;i++){const y=h*(.4+rng()*.6),x=rng()*w;c.fillStyle='#e1edcf44';c.fillRect(x,y,10+rng()*30,1)}}
  if(e.prop==='harbor'){
   // Working harbor: cranes, warehouses, breakwater and ships, not an empty coastline.
   c.fillStyle='#8caaa4';c.fillRect(w*.58,h*.385,w*.42,h*.027);
   for(let i=0;i<5;i++){const x=w*(.62+i*.075),y=h*.39;c.fillStyle=['#ba8e6f','#69999b','#b5b39b'][i%3];c.fillRect(x,y-20,w*.055,20);c.strokeStyle='#687d80';c.lineWidth=3;c.beginPath();c.moveTo(x+10,y-15);c.lineTo(x+10,y-95-i%2*20);c.lineTo(x+65,y-90-i%2*20);c.moveTo(x+55,y-90-i%2*20);c.lineTo(x+55,y-28);c.stroke()}
   for(let i=0;i<3;i++){const x=w*(.62+i*.13),y=h*(.46+i*.025);c.fillStyle='#435d70';c.beginPath();c.moveTo(x-35,y);c.lineTo(x+45,y);c.lineTo(x+28,y+13);c.lineTo(x-20,y+13);c.fill();c.fillStyle='#f4e4bf';c.fillRect(x,y-15,25,15);c.fillStyle='#ce8366';c.fillRect(x+10,y-25,6,10)}
  }
  if(e.prop==='vineyard'){
   ridge([[0,.33],[.2,.22],[.45,.34],[.7,.26],[1,.35]],'#7a975b');
   for(let i=0;i<15;i++){c.strokeStyle=i%2?'#c3ba72':'#537d4f';c.lineWidth=3;c.beginPath();c.moveTo(0,h*(.33+i*.009));c.bezierCurveTo(w*.2,h*(.25+i*.01),w*.32,h*(.4+i*.004),w*.5,h*(.37+i*.009));c.stroke()}
   this.house(c,w*.75,h*.35,1.2,'#e7d6ae');this.house(c,w*.83,h*.34,.8,'#d5c69a');
  }
  if(e.prop==='rock'){
   for(let i=0;i<6;i++){const x=i*w*.2,y=h*(.27+(i%2)*.07);c.fillStyle=i%2?'#af7f63':'#bd9676';c.beginPath();c.moveTo(x-60,h*.65);c.lineTo(x-40,y+30);c.quadraticCurveTo(x+10,y-30,x+70,y);c.lineTo(x+110,h*.65);c.fill();for(let j=0;j<5;j++){c.strokeStyle='#e3bd9166';c.lineWidth=3;c.beginPath();c.moveTo(x-25,y+40+j*17);c.lineTo(x+70,y+30+j*17);c.stroke()}}
   c.strokeStyle='#e8b354';c.lineWidth=8;c.beginPath();c.moveTo(w*.79,h*.37);c.lineTo(w*.76,h*.29);c.lineTo(w*.7,h*.34);c.stroke();c.fillStyle='#e8b354';c.fillRect(w*.78,h*.35,35,20);c.fillStyle='#45565b';c.fillRect(w*.79,h*.34,15,15);
  }
  if(e.prop==='turbine'){for(let i=0;i<8;i++)this.windmill(c,w*(.04+i*.135),h*(.35+(i%2)*.035),.35+(i%3)*.13)}
  if(e.prop==='city'){
   for(let layer=0;layer<2;layer++)for(let i=0;i<23;i++){const x=i*w/21,y=h*(.21+rng()*.17),bw=w*(.025+rng()*.035);c.fillStyle=layer?'#465a72':'#7a839b';c.fillRect(x,y,bw,h*.45-y);for(let yy=y+8;yy<h*.43;yy+=10)for(let xx=x+5;xx<x+bw-4;xx+=9){c.fillStyle=rng()>.6?'#f4d6a3':'#9babb844';c.fillRect(xx,yy,3,4)}}
  }
  if(e.prop==='bridge'){
   c.strokeStyle='#c6bca1';c.lineWidth=13;c.beginPath();c.moveTo(w*.05,h*.3);c.lineTo(w*.94,h*.34);c.stroke();
   for(let i=0;i<11;i++){const x=w*(.05+i*.085);c.fillStyle='#b2aa92';c.fillRect(x,h*.31,10,h*.16);c.strokeStyle='#ddd0ae';c.lineWidth=8;c.beginPath();c.arc(x+30,h*.37,26,Math.PI,0);c.stroke()}
   c.fillStyle='#9b6658';for(let i=0;i<4;i++)c.fillRect(w*(.56+i*.035),h*.306,w*.03,11);
  }
  if(e.prop==='bamboo'){for(let i=0;i<28;i++){const x=(i<14?i/40:.67+(i-14)/40)*w;c.strokeStyle=i%2?'#608b67':'#427862';c.lineWidth=4;c.beginPath();c.moveTo(x,h*.48);c.quadraticCurveTo(x+12,h*.24,x-5,h*.08+rng()*h*.15);c.stroke();for(let j=0;j<5;j++)this.oval(c,x+12,h*(.19+j*.035),19,3,'#4e88634d')}}
  if(e.prop==='redwood'){for(let i=0;i<27;i++){const x=i*w/25;c.fillStyle=i%2?'#526f60':'#6c8170';c.fillRect(x,h*.14+rng()*h*.09,8+rng()*14,h*.36);this.oval(c,x,h*.17,35,65,'#55776588')}c.fillStyle='#cfdbc029';c.beginPath();c.moveTo(w*.7,0);c.lineTo(w*.35,h*.5);c.lineTo(w*.56,h*.5);c.fill()}
  if(e.prop==='stadium'){
   for(const side of [-1,1]){const x=side<0?0:w*.66;c.fillStyle='#56617e';c.beginPath();c.moveTo(x,h*.25);c.lineTo(x+w*.34,h*.31);c.lineTo(x+w*.34,h*.55);c.lineTo(x,h*.55);c.fill();for(let row=0;row<7;row++)for(let i=0;i<42;i++){c.fillStyle=['#ffd97c','#a8d5df','#ec9b8f','#baafe0'][(i+row)%4];c.fillRect(x+i*w*.008,h*(.32+row*.025),3,3)}for(let i=0;i<4;i++){const xx=x+i*w*.095;c.fillStyle='#d4d2b9';c.fillRect(xx,h*.12,3,h*.2);c.fillStyle='#fff4c6';c.fillRect(xx-9,h*.12,22,7)}}
  }
  if(e.prop==='reeds'){for(let i=0;i<90;i++){const x=rng()*w,y=h*(.4+rng()*.09);c.strokeStyle='#62826b';c.lineWidth=2;c.beginPath();c.moveTo(x,y);c.lineTo(x+4,y-10-rng()*16);c.stroke()}this.house(c,w*.83,h*.4,.7,'#aaa887')}
 }
 house(c,x,y,s,color){c.save();c.translate(x,y);c.scale(s,s);c.fillStyle=color;c.fillRect(-25,-28,50,28);c.fillStyle='#986f5c';c.beginPath();c.moveTo(-30,-28);c.lineTo(0,-48);c.lineTo(30,-28);c.fill();c.fillStyle='#576d70';c.fillRect(-4,-18,8,18);c.fillRect(-18,-20,8,8);c.restore()}
 windmill(c,x,y,s){c.save();c.translate(x,y);c.scale(s,s);c.strokeStyle='#e2e4d2';c.lineWidth=6;c.beginPath();c.moveTo(0,0);c.lineTo(0,-140);c.stroke();for(let i=0;i<3;i++){const a=i*Math.PI*2/3-.4;c.lineWidth=7;c.beginPath();c.moveTo(0,-140);c.lineTo(Math.cos(a)*65,-140+Math.sin(a)*65);c.stroke()}this.oval(c,0,-140,7,7,'#a4b7b0');c.restore()}
 prop(kind,index=0){
  const key=kind+index%3;if(this.props.has(key))return this.props.get(key);
  const [canvas,c]=this.surface(440,520);const rng=this.random(123+index%3);
  c.lineCap='round';
  if(kind==='turbine')this.windmill(c,220,506,2.4);
  if(kind==='vineyard'){this.house(c,220,506,2.5,index%2?'#e1cba3':'#caba91');for(let i=0;i<28;i++)this.oval(c,80+rng()*290,450+rng()*45,10,7,'#74864d')}
  if(kind==='vines'){
   for(let row=0;row<3;row++){const y=430+row*25;for(let i=0;i<5;i++){const x=70+i*72;c.strokeStyle='#9a8865';c.lineWidth=5;c.beginPath();c.moveTo(x,y+35);c.lineTo(x,y-15);c.stroke();for(let j=0;j<14;j++)this.oval(c,x-25+rng()*55,y-20+rng()*20,8,5,['#537c48','#729452','#8ea65d'][j%3]);for(let j=0;j<4;j++)this.oval(c,x+rng()*15,y+rng()*12,3,4,'#746080')}c.strokeStyle='#a8ae7b';c.lineWidth=2;c.beginPath();c.moveTo(65,y);c.lineTo(380,y);c.stroke()}
  }
  if(kind==='harbor'){
   for(let i=0;i<3;i++){c.fillStyle=['#aa6652','#6a9195','#bfad79'][(i+index)%3];c.fillRect(80,440-i*75,280,72);for(let j=0;j<13;j++){c.fillStyle='#172f3626';c.fillRect(90+j*20,445-i*75,3,60)}}
  }
  if(kind==='rock'){
   const g=c.createLinearGradient(70,250,340,490);g.addColorStop(0,'#e4c39c');g.addColorStop(1,'#90705a');c.fillStyle=g;c.beginPath();c.moveTo(65,506);c.bezierCurveTo(40,380,120,270,210,300);c.bezierCurveTo(310,250,370,400,380,506);c.fill();for(let i=0;i<8;i++){c.strokeStyle='#eacb9a55';c.lineWidth=3;c.beginPath();c.moveTo(95,370+i*15);c.lineTo(320,350+i*16);c.stroke()}
  }
  if(kind==='reeds'||kind==='bamboo'){
   for(let i=0;i<25;i++){const x=90+rng()*260,top=kind==='bamboo'?70+rng()*160:320+rng()*100;c.strokeStyle=kind==='bamboo'?'#739b63':'#a1ae71';c.lineWidth=kind==='bamboo'?9:3;c.beginPath();c.moveTo(x,506);c.quadraticCurveTo(x-15,380,x+15,top);c.stroke();for(let y=top+25;y<470;y+=40){c.strokeStyle='#d0d19a';c.lineWidth=2;c.beginPath();c.moveTo(x-3,y);c.lineTo(x+8,y);c.stroke();this.oval(c,x+22,y-10,24,5,'#5a8b57')}if(kind==='reeds')this.oval(c,x+15,top,4,13,'#786b4c')}
  }
  if(kind==='city'){
   c.fillStyle=['#9c9e9a','#7d93a4','#b2a49c'][index%3];c.fillRect(80,110,280,396);c.fillStyle='#d6d9cc';c.fillRect(70,105,300,12);for(let y=140;y<470;y+=40)for(let x=110;x<335;x+=45){c.fillStyle=(x+y)%3?'#e9cc93':'#4d6e82';c.fillRect(x,y,22,26)}c.fillStyle='#425967';c.fillRect(195,440,50,66);
  }
  if(kind==='bridge'){
   c.strokeStyle='#d1c6ab';c.lineWidth=35;c.beginPath();c.moveTo(80,506);c.lineTo(80,270);c.bezierCurveTo(80,160,360,160,360,270);c.lineTo(360,506);c.stroke();c.fillStyle='#9c9c8a';c.fillRect(40,165,360,30);
  }
  if(kind==='redwood'){
   c.fillStyle='#906b50';c.beginPath();c.moveTo(170,506);c.lineTo(194,100);c.lineTo(244,100);c.lineTo(270,506);c.fill();for(let i=0;i<9;i++){c.strokeStyle=i%2?'#bd9266':'#6d5745';c.lineWidth=3;c.beginPath();c.moveTo(177+i*10,500);c.lineTo(198+i*5,120);c.stroke()}for(let i=0;i<50;i++)this.oval(c,100+rng()*240,30+rng()*190,26+rng()*30,18+rng()*25,['#426f53','#4f7e57','#678b5d'][i%3]);
  }
  if(kind==='stadium'){
   c.fillStyle='#606d87';c.beginPath();c.moveTo(40,506);c.lineTo(120,280);c.lineTo(380,330);c.lineTo(380,506);c.fill();for(let row=0;row<6;row++)for(let i=0;i<14;i++){this.oval(c,110+i*18,335+row*25,4,5,['#ffdf7d','#a7dfe1','#e7aaab'][i%3])}c.strokeStyle='#d5dacd';c.lineWidth=5;c.beginPath();c.moveTo(65,500);c.lineTo(65,90);c.stroke();c.fillStyle='#fff1be';c.fillRect(30,75,70,20);
  }
  this.props.set(key,canvas);return canvas;
 }
};
})();
