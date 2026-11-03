import assert from 'node:assert/strict';import fs from 'node:fs/promises';
import {launch} from '../helpers/cdp.mjs';import {startTestServer} from '../helpers/server.mjs';
const server=await startTestServer(),b=await launch({headed:true,args:['--headless=new','--ozone-platform=headless','--use-angle=gl-egl','--enable-gpu','--ignore-gpu-blocklist']});const report=[];
try{
 await b.addInit(await fs.readFile(new URL('../helpers/fakepad.js',import.meta.url),'utf8'));await b.signIn(server.base,'smooth-check');await b.send('Emulation.setDeviceMetricsOverride',{width:1920,height:1080,deviceScaleFactor:1,mobile:false});
 for(const city of (process.argv[2]||'venice,bengaluru,berlin').split(',')){
  const hook=city==='berlin'?'BerlinTest':'FlightTest';await b.goto(server.base+(city==='berlin'?'/games/city-flight/berlin/index.html?test':'/games/city-flight/game.html?city='+city+'&test'));
  for(let i=0;i<2400&&!await b.eval('!!window.'+hook);i++)await b.sleep(100);assert(await b.eval('!!window.'+hook));
  const before=await b.eval(`({g:${hook}.state.geometryCount,p:${hook}.state.shaderPrograms})`);
  const collision=await b.eval(`(()=>{const t=${hook},o=t.obstacles().find(o=>o.h>=32);t.start(false,true);t.set({x:o.x,y:o.h-20,z:o.z,heading:0,speed:0,stage:'air',mode:'flight',invincible:0});const y=t.motion().plane[1];t.step(1);t.render();return {physicsJump:t.state.y-(o.h-20),visualJump:t.motion().plane[1]-y};})()`);
  await b.eval(`${hook}.start(false,true);${hook}.set({y:100,stage:'air',invincible:30});__fake.set('A',true)`);
  const perf=await b.eval(`new Promise(resolve=>{const t=${hook},frames=[],steps=[];let last=performance.now(),start=last,prev=t.motion().plane;function tick(now){frames.push(now-last);last=now;const p=t.motion().plane;steps.push(Math.hypot(...p.map((v,i)=>v-prev[i])));prev=p;const seconds=(now-start)/1000;__fake.stick(seconds>2&&seconds<5?.65:seconds>7&&seconds<10?-.65:0,0);if(seconds<12)requestAnimationFrame(tick);else{__fake.set('A',false);__fake.stick(0,0);frames.shift();steps.shift();const sorted=[...frames].sort((a,b)=>a-b);resolve({fps:1000/(frames.reduce((a,b)=>a+b,0)/frames.length),p95:sorted[Math.floor(sorted.length*.95)],p99:sorted[Math.floor(sorted.length*.99)],over34:frames.filter(v=>v>34).length,maxFrame:Math.max(...frames),maxPlaneStep:Math.max(...steps)});}}requestAnimationFrame(tick);})`);
  assert.deepEqual(await b.eval(`({g:${hook}.state.geometryCount,p:${hook}.state.shaderPrograms})`),before,'no graphics allocations after loading');
  if(!process.env.BASELINE){assert(collision.visualJump<1,'no instant roof-height visual jump');assert(collision.physicsJump<1,'roof clearance must not teleport the aircraft');}
  if(!process.env.BASELINE){
   const steering=await b.eval(`(()=>{const t=${hook},rates=[];for(const axis of [.65,1]){t.set({x:0,y:100,z:0,heading:0,turn:0,speed:0,mode:'flight',stage:'air',invincible:30,free:true});__fake.stick(axis,0);t.step(120);rates.push(t.state.turn);}__fake.stick(0,0);return rates;})()`);assert(steering[0]>.1&&steering[0]<steering[1]*.7,'partial stick produces gentler steering');
   const cameraTurn=await b.eval(`(()=>{const t=${hook};t.set({x:0,y:100,z:0,heading:0,speed:0,mode:'flight',stage:'air',invincible:30,free:true});const q=t.motion().rotation;t.set({heading:Math.PI/2},false);t.render();const r=t.motion().rotation;return 2*Math.acos(Math.min(1,Math.abs(q.reduce((sum,v,i)=>sum+v*r[i],0))));})()`);assert(cameraTurn<.3,'camera eases instead of snapping to a new heading');
   const guideStable=await b.eval(`(()=>{const t=${hook};t.start(false,true);t.set({mode:'flight',speed:0,invincible:30});const node=document.querySelector('#guide').firstChild;t.step(120);return document.querySelector('#guide').firstChild===node;})()`);assert(guideStable,'unchanged guidance should not rebuild DOM');
   const hoops=await b.eval(`${hook}.hoops.map((p,i)=>{${hook}.set({...p,next:i,mode:'flight',stage:'air',speed:0,free:false,invincible:0});${hook}.step(1);return ${hook}.state.next===i+1;})`);assert(hoops.every(Boolean),'all checkpoints remain collectible');
   await b.eval(`${hook}.start(false,true);document.querySelector('#pause').click();ArcadeProfile.sync()`);assert(await b.eval(`${hook}.state.save.resume!==null`),'pause saves immediately');
  }
  report.push({city,collision,...perf});console.log(report.at(-1));
 }
 assert.deepEqual(b.logs.filter(x=>x.startsWith('EXC')),[]);
}finally{await fs.writeFile('/tmp/flight-smoothness-'+(process.env.BASELINE?'before':'after')+'.json',JSON.stringify(report,null,2));await b.close();await server.stop();}
