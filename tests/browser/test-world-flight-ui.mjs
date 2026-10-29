const TEST_URL = process.env.ARCADE_TEST_URL || 'http://127.0.0.1:8766';
import {launch} from '../helpers/cdp.mjs';import fs from 'node:fs';import assert from 'node:assert/strict';
const b=await launch({headed:true,args:['--headless=new','--ozone-platform=headless','--use-angle=gl-egl','--enable-gpu','--ignore-gpu-blocklist']});
await b.signIn(TEST_URL);
try{
 await b.addInit(fs.readFileSync(new URL('../helpers/fakepad.js',import.meta.url),'utf8'));
 await b.goto((TEST_URL + '/world-flight/index.html'));await b.sleep(500);
 assert.equal(await b.eval('document.querySelectorAll(".fly").length'),17);
 assert.equal(await b.eval('document.activeElement.dataset.city'),'paris');await b.eval('__fake.tap("right")');assert.equal(await b.eval('document.activeElement.dataset.city'),'london');await b.eval('__fake.tap("left")');await b.screenshot('/tmp/world-flight-atlas.png');
 await b.fire('__fake.tap("A")');for(let i=0;i<200&&!await b.eval('document.title.includes("Paris")');i++)await b.sleep(100);
 assert(await b.eval('location.search.includes("city=paris")')); // Navigate with test instrumentation for assertions.
 await b.goto((TEST_URL + '/world-flight/game.html?city=paris&test'));
 for(let i=0;i<200&&!await b.eval('!!window.FlightTest');i++)await b.sleep(100);
 await b.eval('__fake.tap("A")');assert.equal(await b.eval('FlightTest.state.mode'),'flight');
 await b.eval('__fake.tap("B")');assert.equal(await b.eval('FlightTest.state.mode'),'pause');
 await b.eval('document.querySelector("#places").click()');assert.equal(await b.eval('document.querySelectorAll("[id^=place]").length'),26);assert(!await b.eval('document.querySelector("#overlay").innerText.toLowerCase().includes("school")'));
 await b.eval('document.querySelector("#place0").click()');assert.equal(await b.eval('FlightTest.state.mode'),'landmark');await b.eval('document.querySelector("#look-here").click()');assert.equal(await b.eval('FlightTest.state.free'),true);await b.eval('__fake.tap("B")');
 const modes=[];for(let i=0;i<3;i++){await b.eval('document.querySelector("#graphics").click()');modes.push(await b.eval('FlightTest.state.quality'));}assert.deepEqual(modes,['High','Performance','Balanced']);
 await b.send('Emulation.setDeviceMetricsOverride',{width:2560,height:1440,deviceScaleFactor:2,mobile:false});await b.sleep(100);let size=await b.eval('FlightTest.state.canvasSize');assert(size[0]*size[1]<=1920*1080+2000);
 await b.eval('document.querySelector("#graphics").click();document.querySelector("#graphics").click()');size=await b.eval('FlightTest.state.canvasSize');assert(size[0]*size[1]<=1280*720+2000);
 await b.send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:2,mobile:true});await b.send('Emulation.setTouchEmulationEnabled',{enabled:true});await b.sleep(100);assert(await b.eval('document.documentElement.scrollWidth<=innerWidth'));
 await b.eval('document.querySelector("#resume").click()');await b.screenshot('/tmp/world-flight-mobile.png');await b.eval('document.querySelector("#pause").click()');
 await b.goto((TEST_URL + '/world-flight/game.html?city=paris&test'));for(let i=0;i<200&&!await b.eval('!!window.FlightTest');i++)await b.sleep(100);
 assert(await b.eval('document.querySelector("#play").textContent.includes("Continue")'));assert.equal(await b.eval('FlightTest.state.startup.warmViews'),28);
 await b.eval('__fake.tap("A");');assert.equal(await b.eval('FlightTest.state.free'),true);await b.eval('__fake.tap("B")');await b.fire('document.querySelector("#cities").click()');await b.sleep(500);assert(await b.eval('location.pathname.endsWith("world-flight/index.html")'));assert(await b.eval('document.documentElement.scrollWidth<=innerWidth'));await b.screenshot('/tmp/world-flight-atlas-mobile.png');
 assert.deepEqual(b.errors(),[]);console.log('PASS: 17-city selector, controller navigation/start/pause, landmarks without schools, quality budgets, mobile layout, save/resume, choose-city link');
}finally{await b.close().catch(()=>{})}
