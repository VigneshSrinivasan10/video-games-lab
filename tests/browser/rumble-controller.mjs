import assert from 'node:assert/strict';
import {readFileSync,mkdirSync} from 'node:fs';
import {launch} from '../helpers/cdp.mjs';
import {startTestServer} from '../helpers/server.mjs';
const server=await startTestServer(), b=await launch();
const advance=ms=>b.eval(`__advance(${ms})`);
const state=()=>b.eval('rumbleState');
async function tap(name){await b.eval(`__fake.set(${JSON.stringify(name)},true,1);__advance(40);__fake.set(${JSON.stringify(name)},false,1);__advance(40)`)}
try{
 await b.signIn(server.base);b.logs.length=0;
 await b.addInit(readFileSync(new URL('../helpers/fakepad.js',import.meta.url),'utf8'));
 await b.addInit(`__fake.addPad();localStorage.setItem('rumble-star-sprint',JSON.stringify({unlocked:10}));(()=>{let now=performance.now(),q=[];requestAnimationFrame=fn=>(q.push(fn),q.length);window.__advance=ms=>{for(let i=0;i<Math.ceil(ms/20);i++){now+=20;const batch=q;q=[];batch.forEach(fn=>fn(now))}}})()`);
 await b.goto(server.base+'/games/rumble-riders/index.html');await advance(40);
 await tap('right');assert.equal((await state()).circuit,1,'D-input hat on second controller selects course');
 await tap('A');assert.equal((await state()).state,'countdown','A on second controller starts');
 await advance(2500);assert.equal((await state()).state,'race');await advance(100);assert.equal(await b.eval('document.querySelectorAll(".rival-marker").length'),6);assert.ok(await b.eval('Array.from(document.querySelectorAll(".rival-marker")).every((el,i)=>Math.abs(parseFloat(el.style.left)-Math.min(100,rumbleState.racers[i].distance/rumbleState.finishDistance*100))<.1)'));
 const x=(await state()).playerX;await b.eval("__fake.set('left',true,1);__advance(300);__fake.set('left',false,1);__advance(40)");assert.ok((await state()).playerX<x,'D-pad steers');
 await tap('A');assert.ok((await state()).jumpY>0,'A jumps');
 await tap('start');assert.equal((await state()).paused,true,'D-input Start pauses');await tap('A');assert.equal((await state()).paused,false,'A resumes');
 await b.eval('__fake.disconnect(1);__advance(40)');await b.eval("__fake.set('start',true,0);__advance(40);__fake.set('start',false,0);__advance(40)");assert.equal((await state()).paused,true,'Remaining controller takes over');
 await b.eval('__fake.pads[1].connected=true');await tap('start');assert.equal((await state()).paused,false,'Reconnected controller takes over');
 assert.deepEqual(b.errors(),[]);await b.fire("__fake.set('B',true,1);__advance(40)");await b.sleep(600);assert.equal(await b.eval('location.pathname'),'/index.html','B returns to Arcade during race');b.logs.length=0; // Arcade assets are outside this game test.

 await b.goto(server.base+'/games/rumble-riders/index.html');await advance(40);await tap('start');assert.equal((await state()).state,'countdown','Start also starts from intro');
 await b.goto(server.base+'/games/rumble-riders/index.html');await advance(40);
 mkdirSync('output/rumble-riders',{recursive:true});await b.screenshot('output/rumble-riders/controller-intro.png');
 assert.deepEqual(b.errors(),[]);await b.fire("__fake.set('B',true,1);__advance(40)");await b.sleep(600);assert.equal(await b.eval('location.pathname'),'/index.html','B returns from intro');b.logs.length=0;

 await b.goto(server.base+'/games/rumble-riders/index.html');await b.eval(`__fake.pads[1].mapping='standard';__fake.pads[1].axes=[0,0,0,0];__advance(40);__fake.pads[1].buttons[9].pressed=true;__advance(40);__fake.pads[1].buttons[9].pressed=false;__advance(40)`);assert.equal((await state()).state,'countdown','Standard Start starts race');
 await advance(2500);await b.eval('__fake.pads[1].buttons[9].pressed=true;__advance(40)');assert.equal((await state()).paused,true,'Standard Start pauses');
 assert.deepEqual(b.errors(),[]);console.log('PASS: second-controller A/Start, D-input and standard mapping, steering, jump, pause/resume, reconnect, B-to-Arcade from intro and race.');
}finally{await b.close();await server.stop()}
