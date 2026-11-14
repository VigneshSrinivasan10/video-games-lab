import assert from 'node:assert/strict';
import {launch} from '../helpers/cdp.mjs';
import {startTestServer} from '../helpers/server.mjs';
const server=await startTestServer(),b=await launch();
try{
 await b.signIn(server.base);b.logs.length=0;
 await b.addInit(`localStorage.setItem('rumble-star-sprint',JSON.stringify({unlocked:10,circuit:3}));(()=>{let now=0,q=[];requestAnimationFrame=fn=>(q.push(fn),q.length);window.__advance=ms=>{for(let i=0;i<Math.ceil(ms/33.334);i++){now+=33.334;const batch=q;q=[];batch.forEach(f=>f(now))}}})()`);
 await b.send('Emulation.setDeviceMetricsOverride',{width:1280,height:720,deviceScaleFactor:1,mobile:false});
 await b.goto(server.base+'/games/rumble-riders/index.html');
 const profiles=await b.eval('RumbleWorld.environments.map((e,i)=>({prop:e.prop,up:Math.max(...Array.from({length:100},(_,j)=>RumbleWorld.grade(i,j*68))),down:Math.min(...Array.from({length:100},(_,j)=>RumbleWorld.grade(i,j*68)))}))');
 assert.equal(new Set(profiles.map(e=>e.prop)).size,10);profiles.forEach(e=>{assert.ok(e.up>0);assert.ok(e.down<0)});
 await b.eval('document.querySelector("#play").click();document.querySelector("#sound").click();__advance(2500);dispatchEvent(new KeyboardEvent("keydown",{code:"ArrowLeft"}));__advance(200);dispatchEvent(new KeyboardEvent("keyup",{code:"ArrowLeft"}))');
 let sawAir=false,sawSlope=false;
 for(let i=0;i<80;i++){await b.eval('__advance(250)');const s=await b.eval('rumbleState');sawAir ||= s.racers.some(r=>r.airY>0);sawSlope ||= Math.abs(s.terrain.grade)>.08;if(s.position>1280)break}
 const deck=await b.eval('rumbleState');assert.ok(deck.terrain.deck>10,'Player climbs raised lane');assert.ok(sawSlope,'Climbs and descents are physical');assert.ok(sawAir,'Rivals hop over terrain/ramps');
 await b.screenshot('output/rumble-riders/raised-ramp.png');
 await b.send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});await b.eval('__advance(34)');await b.screenshot('output/rumble-riders/raised-ramp-mobile.png');
 assert.deepEqual(b.errors(),[]);console.log('PASS: 10 scenery profiles, uphill/downhill terrain, player on raised ramp, rival hops, desktop and mobile rendering.');
}finally{await b.close();await server.stop()}
