import assert from 'node:assert/strict';
import {readFileSync,mkdirSync} from 'node:fs';
import {launch} from '../helpers/cdp.mjs';
import {startTestServer} from '../helpers/server.mjs';
const server=await startTestServer(),b=await launch();
async function tap(name){await b.eval(`__fake.set(${JSON.stringify(name)},true);__advance(40);__fake.set(${JSON.stringify(name)},false);__advance(40)`)}
try{
 await b.signIn(server.base);b.logs.length=0;
 await b.addInit(readFileSync(new URL('../helpers/fakepad.js',import.meta.url),'utf8'));
 await b.addInit(`localStorage.setItem('rumble-star-sprint',JSON.stringify({unlocked:10,circuit:9,completed:Array(10).fill(true)}));(()=>{let now=performance.now(),q=[];requestAnimationFrame=fn=>(q.push(fn),q.length);window.__advance=ms=>{for(let i=0;i<Math.ceil(ms/20);i++){now+=20;const batch=q;q=[];batch.forEach(fn=>fn(now))}}})()`);
 await b.goto(server.base+'/games/rumble-riders/index.html');await b.eval('__advance(40)');
 assert.equal(await b.eval('rumbleState.circuit'),9);
 for(const [button,index] of [['right',8],['right',7],['right',6],['right',5],['up',4],['left',3],['left',2],['left',1],['left',0],['down',9]]){
  await tap(button);assert.equal(await b.eval('rumbleState.circuit'),index,`Map ${button} selects circuit ${index+1}`);
 }
 await tap('right');await tap('A');assert.equal(await b.eval('rumbleState.circuit'),8);assert.equal(await b.eval('rumbleState.state'),'countdown');await b.eval('__advance(2500)');
 await tap('X');assert.equal(await b.eval('rumbleState.state'),'intro');await tap('up');assert.equal(await b.eval('rumbleState.circuit'),1);await tap('A');assert.equal(await b.eval('rumbleState.state'),'countdown');
 await b.eval('document.querySelector("#map").click()');assert.equal(await b.eval('rumbleState.state'),'intro');
 await b.press('ArrowDown','ArrowDown');assert.equal(await b.eval('rumbleState.circuit'),8);
 await b.eval('document.querySelectorAll("#circuit-picker button")[3].click()');assert.equal(await b.eval('rumbleState.circuit'),3);
 assert.equal(await b.eval('rumbleState.completed.every(Boolean)'),true);
 await b.send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});await b.eval('__advance(40)');mkdirSync('output/rumble-riders',{recursive:true});await b.screenshot('output/rumble-riders/level-select-mobile.png');
 assert.ok(await b.eval('document.querySelector("#play").getBoundingClientRect().bottom<innerHeight'));
 await tap('A');await b.eval('__advance(2500)');await b.screenshot('output/rumble-riders/level-select-race-mobile.png');
 assert.deepEqual(b.errors(),[]);console.log('PASS: completed tour, all ten levels navigable spatially, A replays selection, X and map button reopen selector, keyboard/touch, completion preserved.');
}finally{await b.close();await server.stop()}
