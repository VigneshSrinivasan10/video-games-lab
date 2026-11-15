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

 await b.addInit(`localStorage.setItem('rumble-star-sprint',JSON.stringify({unlocked:10}))`);
 await b.send('Emulation.setDeviceMetricsOverride',{width:1280,height:720,deviceScaleFactor:1,mobile:false});
 await b.goto(server.base+'/games/rumble-riders/index.html');

 await b.eval(`window.__drive=active=>{
  const held={};const key=(code,on)=>{if(!!held[code]===on)return;held[code]=on;dispatchEvent(new KeyboardEvent(on?'keydown':'keyup',{code}))};
  const course=RumbleTour.build(rumbleState.circuit);const stars=course.filter(f=>f.type==='star').filter((f,i)=>i%5!==0);
  for(let frame=0;frame<3400;frame++){
   const s=rumbleState;if(s.state==='finish')break;
   if(active&&s.state==='race'){
    const star=stars.find(f=>f.distance>s.position+5);
    const x=star?.x??0;key('ArrowLeft',s.playerX>x+.04);key('ArrowRight',s.playerX<x-.04);
    const puddle=course.find(f=>f.type==='puddle'&&f.distance>s.position&&f.distance<s.position+35&&Math.abs(f.x-s.playerX)<.4);key('Space',!!puddle);
   }
   __advance(34);
  }
  for(const code of Object.keys(held))key(code,false);
 }`);
 const results=[];
 for(const circuit of [0,4,9])for(const active of [false,true]){
  await b.eval(`document.querySelector('#tour-map').click();document.querySelectorAll('#circuit-picker button')[${circuit}].click();document.querySelector('#play').click();__drive(${active})`);
  const s=await b.eval('rumbleState');assert.equal(s.state,'finish');results.push({circuit:circuit+1,active,place:s.place,stars:s.stars});console.log(results.at(-1));
 }
 assert.ok(results.filter(r=>!r.active).every(r=>r.place>1),'Idle runs should no longer win automatically');
 assert.ok(results.filter(r=>r.active).every(r=>r.place===1),'Following stars and jumping should still win');
 assert.deepEqual(b.errors(),[]);
 console.log('PASS: active riding beats passive riding; opening, middle and final circuits remain winnable.');
}finally{await b.close();await server.stop()}
