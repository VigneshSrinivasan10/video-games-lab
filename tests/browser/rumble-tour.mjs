import assert from 'node:assert/strict';
import {launch} from '../helpers/cdp.mjs';
import {startTestServer} from '../helpers/server.mjs';
const server=await startTestServer(),b=await launch();
try{
 await b.signIn(server.base);b.logs.length=0;
 await b.addInit(`(()=>{
 let now=0,queue=[];window.requestAnimationFrame=fn=>(queue.push(fn),queue.length);window.__advance=ms=>{for(let i=0;i<Math.ceil(ms/33.334);i++){now+=33.334;const batch=queue;queue=[];batch.forEach(fn=>fn(now))}};
 window.__skipDrawing=true;const original=HTMLCanvasElement.prototype.getContext;
 HTMLCanvasElement.prototype.getContext=function(...args){const c=original.apply(this,args);if(this.id!=='road'||!c)return c;return new Proxy(c,{get(t,k){const v=Reflect.get(t,k,t);if(typeof v!=='function')return v;return (...a)=>{if(__skipDrawing){if(k==='createLinearGradient'||k==='createRadialGradient')return {addColorStop(){}};return undefined}return v.apply(t,a)}},set(t,k,v){if(!__skipDrawing)Reflect.set(t,k,v,t);return true}})};
 })()`);
 await b.send('Emulation.setDeviceMetricsOverride',{width:1280,height:720,deviceScaleFactor:1,mobile:false});
 await b.goto(server.base+'/games/rumble-riders/index.html');
 assert.equal(await b.eval('RumbleTour.circuits.length'),10);
 assert.equal(await b.eval('document.querySelectorAll("#circuit-picker button:not(:disabled)").length'),1);
 const layouts=await b.eval('RumbleTour.circuits.map((c,i)=>JSON.stringify(RumbleTour.build(i)))');assert.equal(new Set(layouts).size,10);
 const kinds=await b.eval('RumbleTour.circuits.map(c=>c.kind)');assert.equal(new Set(kinds).size,10);
 await b.eval('__skipDrawing=false;__advance(34)');await b.screenshot('output/rumble-riders/tour-start.png');await b.eval('__skipDrawing=true;document.querySelector("#play").click();document.querySelector("#sound").click()');
 for(let i=0;i<10;i++){
  assert.equal(await b.eval('rumbleState.circuit'),i);await b.eval('__advance(4500);__skipDrawing=false;__advance(34)');await b.screenshot(`output/rumble-riders/world-${i+1}.png`);await b.eval('__skipDrawing=true');
  for(let j=0;j<15;j++){await b.eval('__advance(8000)');if(await b.eval('rumbleState.state==="finish"'))break}
  const s=await b.eval('rumbleState');assert.equal(s.state,'finish',`Circuit ${i+1} finishes`);assert.ok(s.place<=3,`Forgiving default run places in top three on circuit ${i+1}: ${s.place}`);assert.equal(s.completed[i],true);assert.equal(s.unlocked,Math.min(10,i+2));
  assert.equal(await b.eval('document.querySelectorAll("#tour-stamps .earned").length'),i+1);
  if(i===0){await b.eval('__skipDrawing=false;document.querySelectorAll("#colours button")[0].click()');await b.screenshot('output/rumble-riders/tour-celebration.png');await b.eval('__skipDrawing=true')}
  console.log(`Circuit ${i+1}: place ${s.place}/7, finish, stamp, unlock passed`);
  if(i<9)await b.eval('document.querySelector("#next").click()');
 }
 assert.equal(await b.eval('document.querySelector("#clear-badge").textContent'),'🏆 10 / 10 🏆');
 await b.eval('__skipDrawing=false;document.querySelectorAll("#colours button")[0].click()');await b.screenshot('output/rumble-riders/tour-complete.png');
 await b.eval('document.querySelector("#next").click()');assert.equal(await b.eval('rumbleState.state'),'intro');assert.equal(await b.eval('rumbleState.circuit'),9);
 assert.equal(await b.eval('document.querySelectorAll("#circuit-picker button:not(:disabled)").length'),10);
 await b.send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});await b.eval('__advance(34)');await b.screenshot('output/rumble-riders/tour-mobile.png');assert.equal(await b.eval('document.documentElement.scrollWidth>innerWidth'),false);
 await b.goto(server.base+'/games/rumble-riders/index.html');assert.equal(await b.eval('rumbleState.unlocked'),10);assert.equal(await b.eval('rumbleState.completed.every(Boolean)'),true);

 await b.eval(`window.__rideChallenge=steps=>{
  const control=(code,on)=>{window.__held ||= {};if(!!__held[code]===on)return;__held[code]=on;dispatchEvent(new KeyboardEvent(on?'keydown':'keyup',{code,bubbles:true}))};
  for(let frame=0;frame<steps;frame++){
   const s=rumbleState;if(s.state==='finish')return;
   if(s.state!=='race'){__advance(34);continue}
   const kind=s.challengeKind,course=RumbleTour.build(s.circuit);
   let x=0,obstacle=null;
   if(kind==='draft'){
    const racer=s.racers.filter(r=>r.z>18).sort((a,b)=>a.z-b.z)[0];x=racer?.x??0;
   }else{
    const wanted=kind==='apex'?['apex']:['hop','double'].includes(kind)?['puddle']:kind==='landing'?['landing']:kind==='speed'?['speed']:kind==='mix'?['apex','puddle','landing','speed','star']:['star'];
    const target=course.find(f=>wanted.includes(f.type)&&f.distance+(f.type==='landing'?70:-4)>s.position&&(kind!=='gallery'||f.gallery)&&(kind!=='mix'||f.type!=='star'||f.gallery));
    x=target?.x??0;obstacle=target;
   }
   control('ArrowRight',x-s.playerX>.025);control('ArrowLeft',s.playerX-x>.025);
   control('Space',!!obstacle&&obstacle.type==='puddle'&&obstacle.distance-s.position<50);
   __advance(34);
  }
 }`);
 await b.send('Emulation.setDeviceMetricsOverride',{width:1280,height:720,deviceScaleFactor:1,mobile:false});
 for(let i=0;i<10;i++){
  await b.eval(`__skipDrawing=true;document.querySelector('#tour-map').click();document.querySelectorAll('#circuit-picker button')[${i}].click();document.querySelector('#play').click();window.__held={}`);
  for(let step=0;step<18;step++){await b.eval('__rideChallenge(100)');if(step===3&&[1,3,4,6].includes(i)){await b.eval('__skipDrawing=false;__advance(34)');await b.screenshot(`output/rumble-riders/circuit-${i+1}.png`);await b.eval('__skipDrawing=true')}if(await b.eval('rumbleState.state==="finish"'))break}
  const goal=await b.eval('rumbleState');assert.equal(goal.state,'finish');assert.equal(goal.challenge,goal.challengeTarget,`Circuit ${i+1} ${goal.challengeKind}: target is achievable`);
  console.log(`Challenge ${i+1} (${goal.challengeKind}): ${goal.challenge}/${goal.challengeTarget}`);
 }
 assert.deepEqual(b.errors(),[]);console.log('PASS: ten distinct circuits, finish celebrations, next, finale, mobile map and saved progression.');
}finally{await b.close();await server.stop()}
