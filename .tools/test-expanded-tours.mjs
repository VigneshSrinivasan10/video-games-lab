import {launch} from './cdp.mjs';import assert from 'node:assert/strict';import fs from 'node:fs';
const cities=JSON.parse(fs.readFileSync(new URL('../world-flight/cities.json',import.meta.url)));
for(const c of cities){assert.equal(c.landmarks.length,25);assert.equal(new Set(c.landmarks.map(l=>l.id)).size,25);assert(c.maxLegKm<2.2);assert(c.diameterKm<5.5);assert(!c.landmarks.some(l=>/gymnasium|school/i.test(l.name)));}
const b=await launch({headed:true,args:['--headless=new','--ozone-platform=headless','--use-angle=gl-egl','--enable-gpu','--ignore-gpu-blocklist']});
async function load(){await b.goto('http://127.0.0.1:8777/world-flight/game.html?city=rome&test');for(let i=0;i<250&&!await b.eval('!!window.FlightTest');i++)await b.sleep(100);assert(await b.eval('!!window.FlightTest'));}
try{
 await b.goto('http://127.0.0.1:8777/world-flight/index.html');
 const old={tourVersion:4,current:0,profiles:[{name:'TEST PILOT',best:8,music:false,resume:{x:20,y:150,z:30,heading:1,stage:'air',speed:0,next:4,free:false}}]};
 await b.eval(`localStorage.setItem('world-flight.rome.v1',${JSON.stringify(JSON.stringify(old))})`);await load();
 let saved=await b.eval(`JSON.parse(localStorage.getItem('world-flight.rome.v1'))`);assert.equal(saved.tourVersion,6);assert.equal(saved.profiles[0].best,0);assert.deepEqual(saved.profiles[0].previousTours['4'],{best:8,resume:old.profiles[0].resume});assert.equal(saved.profiles[0].resume.next,0);assert.equal(saved.profiles[0].name,'TEST PILOT');assert.equal(saved.profiles[0].music,false);assert(await b.eval('document.querySelector("#overlay").innerText.includes("reordered route")'));
 await b.eval('FlightTest.start(true);FlightTest.set({mode:"pause"})');let s=await b.eval('FlightTest.state');assert.equal(s.x,20);assert.equal(s.y,150);assert.equal(s.z,30);assert.equal(s.next,0);
 await b.eval('FlightTest.set({...FlightTest.hoops[0],mode:"flight",stage:"air",speed:0,next:0,free:false,invincible:0});FlightTest.step(1);document.querySelector("#pause").click()');assert.equal(await b.eval('FlightTest.state.next'),1);
 await load();await b.eval('FlightTest.start(true);FlightTest.set({mode:"pause"})');assert.equal(await b.eval('FlightTest.state.next'),1);
 saved=await b.eval(`JSON.parse(localStorage.getItem('world-flight.rome.v1'))`);assert.equal(saved.profiles[0].routeNotice,false);assert.equal(saved.profiles[0].previousTours['4'].best,8);
 for(const c of cities){await b.goto('http://127.0.0.1:8777/world-flight/game.html?city='+c.id+'&test');for(let i=0;i<250&&!await b.eval('!!window.FlightTest');i++)await b.sleep(100);const hoops=await b.eval('FlightTest.hoops');for(let i=1;i<hoops.length;i++){const a=hoops[i-1],p=hoops[i];assert(Math.hypot(a.x-p.x,a.y-p.y,a.z-p.z)>44,c.id+' consecutive hoops overlap '+i);assert(p.y<225,c.id+' hoop too high');}console.log(c.id,'25 spaced, reachable checkpoints');}
 assert.deepEqual(b.errors(),[]);console.log('PASS: all expanded catalogs, checkpoint spacing, v4 save migration and v6 reload');
}finally{await b.close().catch(()=>{})}
