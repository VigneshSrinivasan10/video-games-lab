import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {launch} from '../helpers/cdp.mjs';
import {startTestServer} from '../helpers/server.mjs';
const server=await startTestServer();
const b=await launch({headed:true,args:['--headless=new','--ozone-platform=headless','--use-angle=gl-egl','--enable-gpu','--ignore-gpu-blocklist']});
async function waitFor(expression){for(let i=0;i<2400;i++){if(await b.eval(expression))return;await b.sleep(100);}throw Error('Timed out: '+expression);}
async function layout(){return b.eval(`(()=>{const c=document.querySelector('#view').getBoundingClientRect(),style=getComputedStyle(document.querySelector('#view'));return {canvas:{x:c.x,y:c.y,w:c.width,h:c.height},viewport:{w:innerWidth,h:innerHeight},position:style.position,bodyOverflow:getComputedStyle(document.body).overflow,pageHeight:document.documentElement.scrollHeight,touch:getComputedStyle(document.querySelector('#touch')).display,loading:document.querySelector('#loading')?getComputedStyle(document.querySelector('#loading')).display:'none',overlay:getComputedStyle(document.querySelector('#overlay')).display};})()`);}
function fullScreen(s){assert.equal(s.position,'fixed');assert.equal(s.canvas.x,0);assert.equal(s.canvas.y,0);assert.equal(s.canvas.w,s.viewport.w);assert.equal(s.canvas.h,s.viewport.h);assert.equal(s.bodyOverflow,'hidden');assert(s.pageHeight<=s.viewport.h,'no extra strip below scene');assert.equal(s.loading,'none');}
try{
 await b.addInit(await fs.readFile(new URL('../helpers/fakepad.js',import.meta.url),'utf8'));
 await b.signIn(server.base,'layout-check');
 await b.send('Emulation.setDeviceMetricsOverride',{width:1280,height:720,deviceScaleFactor:1,mobile:false});
 await b.goto(server.base+'/games/city-flight/game.html?city=venice&test');await waitFor('!!window.FlightTest');
 await b.eval('FlightTest.start(false);FlightTest.set({speed:0})');await b.sleep(150);
 const desktop=await layout();console.log('desktop',desktop);await b.screenshot('/tmp/city-flight-layout-'+(process.env.EXPECT_BROKEN?'before':'after')+'.png');
 if(!process.env.EXPECT_BROKEN){
  fullScreen(desktop);assert.equal(await b.eval('getComputedStyle(document.querySelector("#arcade-profile-bar")).display'),'none');assert.equal(desktop.touch,'none');assert.equal(await b.eval('document.querySelector("#overlay").childElementCount'),0);assert.equal(await b.eval('getComputedStyle(document.querySelector("#overlay")).pointerEvents'),'none');
  await b.eval('document.querySelector("#pause").click()');assert.equal(await b.eval('getComputedStyle(document.querySelector("#overlay")).position'),'fixed');assert.equal(await b.eval('FlightTest.state.mode'),'pause');assert.equal(await b.eval('getComputedStyle(document.querySelector("#arcade-profile-bar")).display'),'flex');
  await b.eval('document.querySelector("#resume").click()');await b.send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});await b.eval('document.body.classList.add("touch")');await b.sleep(150);
  fullScreen(await layout());assert.equal(await b.eval('getComputedStyle(document.querySelector("#touch")).display'),'flex');await b.screenshot('/tmp/city-flight-layout-mobile.png');
  await b.goto(server.base+'/games/city-flight/index.html');await waitFor('document.querySelectorAll(".fly").length===7');assert.equal(await b.eval('getComputedStyle(document.querySelector("#cities")).display'),'grid');assert(await b.eval('document.documentElement.scrollWidth<=innerWidth'));
  await b.goto(server.base+'/games/city-flight/berlin/index.html?test');await waitFor('!!window.BerlinTest');await b.eval('BerlinTest.start(false)');fullScreen(await layout());assert.equal(await b.eval('getComputedStyle(document.querySelector("#arcade-profile-bar")).display'),'none');await b.eval('document.querySelector("#pause").click()');assert.equal(await b.eval('getComputedStyle(document.querySelector("#arcade-profile-bar")).display'),'flex');
  assert.deepEqual(b.logs.filter(x=>x.startsWith('EXC')),[]);console.log('PASS: full-screen flight, hidden loading/touch overlays, pause, mobile controls, separate city-list styling.');
 }
}finally{await b.close();await server.stop();}
