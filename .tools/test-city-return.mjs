import {launch} from './cdp.mjs';import fs from 'node:fs';import assert from 'node:assert/strict';
const b=await launch({headed:true,args:['--headless=new','--ozone-platform=headless','--use-angle=gl-egl','--enable-gpu','--ignore-gpu-blocklist']});
const chosenCity=process.env.CITY_ID||'venice';const catalog=JSON.parse(fs.readFileSync(new URL('../world-flight/cities.json',import.meta.url)));const previousCity=catalog[catalog.findIndex(c=>c.id===chosenCity)-1].id;
const root='http://127.0.0.1:8777/world-flight/';
async function ready(){for(let i=0;i<250&&!await b.eval('!!window.FlightTest');i++)await b.sleep(350);assert(await b.eval('!!window.FlightTest'));}
try{
 await b.addInit(fs.readFileSync(new URL('fakepad.js',import.meta.url),'utf8'));
 // Model a physical button remaining held across document navigation.
 await b.addInit(`if(sessionStorage.getItem('test-held-a'))setTimeout(()=>__fake.set('A',true),${Number(process.env.PAD_DELAY||0)})`);
 await b.goto(root+'index.html');await b.sleep(300);await b.fire(`document.querySelector('[data-city="${chosenCity}"]').click()`);
 await b.sleep(400);await b.goto(root+'game.html?city='+chosenCity+'&test');await ready();
 await b.eval(`FlightTest.start(false);document.querySelector('#pause').click();sessionStorage.setItem('test-held-a','1')`);
 for(let i=0;i<7;i++)await b.eval(`__fake.tap('down')`);assert.equal(await b.eval('FlightTest.state.focus'),'cities');
 await b.fire(`__fake.set('A',true)`);await b.sleep(1300);
 assert.equal(await b.eval('location.pathname'),'/world-flight/index.html','held A must not reopen the current city');
 assert.equal(await b.eval('document.activeElement.tagName'),'H1');assert(await b.eval('document.querySelector("#city-selection-hint").textContent.includes("direction")'));
 await b.sleep(700);assert.equal(await b.eval('location.pathname'),'/world-flight/index.html');
 await b.eval(`sessionStorage.removeItem('test-held-a');__fake.set('A',false)`);await b.sleep(350);
 await b.eval(`__fake.tap('A')`);assert.equal(await b.eval('location.pathname'),'/world-flight/index.html','A without choosing must not reopen previous city');
 await b.eval(`__fake.tap('left')`);assert.equal(await b.eval('document.activeElement.dataset.city'),previousCity);
 await b.fire(`__fake.tap('A')`);await b.sleep(400);assert.equal(await b.eval('new URLSearchParams(location.search).get("city")'),previousCity);
 // A held on a browser-back return must also leave the restored selector open.
 await b.fire(`history.back()`);await b.sleep(500);assert.equal(await b.eval('location.pathname'),'/world-flight/index.html');
 await b.eval(`__fake.set('A',true);dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true}))`);await b.sleep(500);assert.equal(await b.eval('location.pathname'),'/world-flight/index.html');
 await b.eval(`__fake.set('A',false)`);await b.sleep(350);
 await b.fire(`document.querySelector('[data-city="rome"]').click()`);await b.sleep(400);assert.equal(await b.eval('new URLSearchParams(location.search).get("city")'),'rome');
 assert.deepEqual(b.errors(),[]);console.log('PASS: Choose a city with held A stays on selector; release, navigate and select another city; restored-page guard; mouse selection.');
}finally{await b.close().catch(()=>{})}
