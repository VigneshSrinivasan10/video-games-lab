import assert from 'node:assert/strict';
import {launch} from '../helpers/cdp.mjs';
import {startTestServer} from '../helpers/server.mjs';
const server=await startTestServer(),b=await launch();
const state=()=>b.eval('rumbleState');
const advance=ms=>b.eval(`__advance(${ms})`);
const key=(code,down)=>b.eval(`dispatchEvent(new KeyboardEvent(${JSON.stringify(down?'keydown':'keyup')},{code:${JSON.stringify(code)}}))`);
const steer=async x=>{const code=(await state()).playerX<x?'ArrowRight':'ArrowLeft';await key(code,true);for(let i=0;i<30;i++){await advance(34);const s=await state();if(code==='ArrowRight'?s.playerX>=x:s.playerX<=x)break}await key(code,false)};
const until=async d=>{for(let i=0;i<200;i++){const s=await state();if(s.position>=d)return;await advance(Math.min(400,Math.max(34,(d-s.position)/130*1000)))}throw Error('Course stalled')};
const shot=async name=>{await b.eval('__skipDrawing=false;__advance(34)');await b.screenshot(`output/rumble-riders/${name}.png`);await b.eval('__skipDrawing=true')};
try{
 await b.signIn(server.base);b.logs.length=0;
 await b.addInit(`localStorage.setItem('rumble-star-sprint',JSON.stringify({unlocked:10,circuit:3}));(()=>{let now=0,q=[];requestAnimationFrame=fn=>(q.push(fn),q.length);window.__advance=ms=>{for(let i=0;i<Math.ceil(ms/33.334);i++){now+=33.334;const batch=q;q=[];batch.forEach(f=>f(now))}};window.__skipDrawing=true;const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(...args){const c=original.apply(this,args);if(this.id!=='road'||!c)return c;return new Proxy(c,{get(t,k){const v=Reflect.get(t,k,t);if(typeof v!=='function')return v;return (...a)=>{if(__skipDrawing){if(k==='createLinearGradient'||k==='createRadialGradient')return {addColorStop(){}};return undefined}return v.apply(t,a)}},set(t,k,v){if(!__skipDrawing)Reflect.set(t,k,v,t);return true}})}})()`);
 await b.send('Emulation.setDeviceMetricsOverride',{width:1280,height:720,deviceScaleFactor:1,mobile:false});await b.goto(server.base+'/games/rumble-riders/index.html');
 await b.eval('document.querySelector("#play").click();document.querySelector("#sound").click()');await advance(2500);await steer(-.5);await until(590);await shot('half-road-ramp');await until(655);assert.equal((await state()).jumpMode,'flip');
 for(let i=0;i<40;i++){await advance(34);if((await state()).flipAngle>Math.PI*.8)break}
 let s=await state();assert.ok(s.flipAngle>Math.PI*.8&&s.flipAngle<Math.PI*1.3);assert.ok(s.jumpY>40);await shot('somersault');
 for(let i=0;i<70;i++){await advance(34);if((await state()).jumpY===0)break}
 s=await state();assert.equal(s.jumpY,0);assert.equal(s.flipAngle,0);assert.ok(s.landingAge<.2);await shot('soft-landing');
 await b.eval('document.querySelector("#again").click()');await advance(2500);await steer(.6);await until(660);assert.notEqual((await state()).jumpMode,'flip','Other half of road bypasses ramp');
 await b.eval('document.querySelector("#tour-map").click();document.querySelectorAll("#circuit-picker button")[2].click();document.querySelector("#play").click()');await advance(2500);await steer(.7);await until(1803);assert.ok((await state()).splash>0,'Stream is safely rideable');await shot('stream-crossing');
 await b.eval('document.querySelector("#tour-map").click();document.querySelectorAll("#circuit-picker button")[1].click();document.querySelector("#play").click()');await advance(2500);await until(1350);assert.ok((await state()).terrain.bank>8);await shot('banked-turn');
 await until(2900);assert.equal((await state()).terrain.surface,'dirt');await shot('dirt-road');
 assert.deepEqual(b.errors(),[]);console.log('PASS: half-road bypass, full forward flip, upright soft landing, safe stream, banked turn and dirt surface.');
}finally{await b.close();await server.stop()}
