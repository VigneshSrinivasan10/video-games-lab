import assert from 'node:assert/strict';
import {launch} from '../helpers/cdp.mjs';
import {startTestServer} from '../helpers/server.mjs';
const server=await startTestServer(),b=await launch();
try{
 await b.signIn(server.base);b.logs.length=0;
 await b.addInit(`navigator.getGamepads=()=>[];(()=>{
 let now=0,queue=[];window.requestAnimationFrame=fn=>(queue.push(fn),queue.length);window.__advance=ms=>{for(let i=0;i<Math.ceil(ms/33.334);i++){now+=33.334;const batch=queue;queue=[];batch.forEach(fn=>fn(now))}};
 window.__skipDrawing=true;const original=HTMLCanvasElement.prototype.getContext;
 HTMLCanvasElement.prototype.getContext=function(...args){const c=original.apply(this,args);if(this.id!=='road'||!c)return c;return new Proxy(c,{get(t,k){const v=Reflect.get(t,k,t);if(typeof v!=='function')return v;return (...a)=>{if(__skipDrawing){if(k==='createLinearGradient'||k==='createRadialGradient')return {addColorStop(){}};return undefined}return v.apply(t,a)}},set(t,k,v){if(!__skipDrawing)Reflect.set(t,k,v,t);return true}})};
 })()`);
 await b.send('Emulation.setDeviceMetricsOverride',{width:1280,height:720,deviceScaleFactor:1,mobile:false});
 await b.addInit(`localStorage.setItem('rumble-star-sprint',JSON.stringify({unlocked:10}))`);await b.goto(server.base+'/games/rumble-riders/index.html');
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
 for(const i of [3,9]){
  await b.eval(`__skipDrawing=true;document.querySelector('#tour-map').click();document.querySelectorAll('#circuit-picker button')[${i}].click();document.querySelector('#play').click();window.__held={}`);
  for(let step=0;step<18;step++){await b.eval('__rideChallenge(100)');if(step===3&&[1,3,4,6].includes(i)){await b.eval('__skipDrawing=false;__advance(34)');await b.screenshot(`output/rumble-riders/circuit-${i+1}.png`);await b.eval('__skipDrawing=true')}if(await b.eval('rumbleState.state==="finish"'))break}
  const goal=await b.eval('rumbleState');assert.equal(goal.state,'finish');assert.equal(goal.challenge,goal.challengeTarget,`Circuit ${i+1} ${goal.challengeKind}: target is achievable`);
  console.log(`Challenge ${i+1} (${goal.challengeKind}): ${goal.challenge}/${goal.challengeTarget}`);
 }
 assert.deepEqual(b.errors(),[]);console.log('PASS: landing and mixed challenges remain achievable with higher ramps.');
}finally{await b.close();await server.stop()}
