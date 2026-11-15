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
 for(const circuit of [0,3,8,9]){
  await b.eval(`document.querySelectorAll('#circuit-picker button')[${circuit}].click();document.querySelector('#play').click()`);
  for(let i=0;i<16;i++){await b.eval('__advance(8000)');if(await b.eval('rumbleState.state==="finish"'))break}
  assert.equal(await b.eval('rumbleState.state'),'finish');assert.ok(await b.eval('rumbleState.place<=3'));
  assert.ok(await b.eval('document.querySelectorAll(".confetti").length>0'));
  await b.eval(`document.querySelector('#next').click()`);
  assert.equal(await b.eval('rumbleState.state'),'intro');assert.equal(await b.eval('rumbleState.circuit'),Math.min(9,circuit+1));
  assert.equal(await b.eval('document.querySelectorAll("#circuit-picker svg").length'),1);
  console.log('PASS: circuit '+(circuit+1)+' finishes, celebrates and returns to selectable world map.');
 }
 await b.eval('__skipDrawing=false;__advance(34)');await b.screenshot('output/rumble-riders/world-map-desktop.png');
 assert.ok(await b.eval('document.querySelector("#play").getBoundingClientRect().bottom<innerHeight'),'Play stays visible');
 await b.send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});await b.eval('__advance(34)');await b.screenshot('output/rumble-riders/world-map-mobile.png');
 assert.ok(await b.eval('document.querySelector("#play").getBoundingClientRect().bottom<innerHeight'),'Mobile Play stays visible');assert.deepEqual(b.errors(),[]);
}finally{await b.close();await server.stop()}
