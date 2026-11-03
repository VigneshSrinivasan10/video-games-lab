import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {launch} from '../helpers/cdp.mjs';
import {startTestServer} from '../helpers/server.mjs';
const root=new URL('../../',import.meta.url),out=new URL('.local/full-city/',root);
await fs.mkdir(out,{recursive:true});
const cities=JSON.parse(await fs.readFile(new URL('public/games/city-flight/cities.json',root))),selected=process.argv[2]?.split(',');
const cases=[...cities.map(c=>[c.id,`world-flight/game.html?city=${c.id}&test`,'FlightTest']),['berlin','berlin-city-flight.html?test','BerlinTest']].filter(([id])=>!selected||selected.includes(id));
const server=await startTestServer(),b=await launch({headed:true,args:['--headless=new','--ozone-platform=headless','--use-angle=gl-egl','--enable-gpu','--ignore-gpu-blocklist']}),report=[];
async function until(expr,timeout=240000){const end=Date.now()+timeout;let log=Date.now();while(Date.now()<end){if(await b.eval(expr))return;const errors=b.logs.filter(x=>x.startsWith('EXC')||x.startsWith('ERROR'));assert.deepEqual(errors,[]);await b.sleep(300);if(Date.now()-log>20000){console.log(await b.eval('document.querySelector("#loading-status")?.textContent'));log=Date.now();}}throw Error('Timed out: '+expr);}
try{
 await b.addInit(await fs.readFile(new URL('../helpers/fakepad.js',import.meta.url),'utf8'));
 await b.send('Emulation.setDeviceMetricsOverride',{width:960,height:640,deviceScaleFactor:1,mobile:false});
 await b.signIn(server.base,'scenery-check');await b.goto(server.base+'/index.html');
 await b.eval('ArcadeProfile.storage.setItem("world-flight.graphics","Performance");ArcadeProfile.storage.setItem("berlin-city-flight.graphics","Performance");ArcadeProfile.sync()');
 await b.goto(server.base+'/world-flight/index.html');await until('document.querySelectorAll(".fly").length>0');
 const ids=await b.eval('[...document.querySelectorAll(".fly")].map(a=>a.dataset.city)');assert.deepEqual(ids.sort(),[...cities.map(c=>c.id),'berlin'].sort());if(!selected)assert.equal(ids.length,7);
 for(const [id,page,hook] of cases){
  const revised=['rome','dubai'].includes(id),city=cities.find(c=>c.id===id);
  const old={tourVersion:6,current:0,profiles:[{name:'scenery-check',best:17,music:false,resume:{x:20,y:150,z:30,heading:1,stage:'air',speed:0,next:8,free:false}}]};
  if(revised)await b.eval(`ArcadeProfile.storage.setItem('world-flight.${id}.v1',${JSON.stringify(JSON.stringify(old))});ArcadeProfile.sync()`);
  console.log('Checking scenery:',id);await b.goto(server.base+'/'+page);await until(`!!window.${hook}&&${hook}.state.startup.ready`);
  const state=await b.eval(`${hook}.state`),scenery=state.scenery||state.district;
  if(revised){
   assert.equal(state.save.best,17);assert.equal(state.save.music,false);assert.deepEqual(state.save.previousTours['6'],{best:17,resume:old.profiles[0].resume});assert.equal(state.save.resume.next,0);
   assert.equal(await b.eval(`JSON.parse(ArcadeProfile.storage.getItem('world-flight.${id}.v1')).tourVersion`),7);
   assert.equal(await b.eval('document.querySelector("#fresh-tour").textContent'),'Start at '+city.landmarks[0].name);
   for(const [width,height] of [[390,844],[844,390]]){
    await b.send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:true});
    const layout=await b.eval('(()=>{const b=document.querySelector("#fresh-tour");b.scrollIntoView({block:"center"});const r=b.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:innerWidth,height:innerHeight};})()');
    assert(layout.left>=0&&layout.right<=layout.width&&layout.top>=0&&layout.bottom<=layout.height,id+' fresh start reachable on phone');
   }
   await b.send('Emulation.setDeviceMetricsOverride',{width:960,height:640,deviceScaleFactor:1,mobile:false});
   await b.screenshot(new URL(id+'-new-route.png',out).pathname);
   const fresh=await b.eval(`(()=>{document.querySelector('#fresh-tour').click();${hook}.set({mode:'pause'});return ${hook}.state;})()`);
   const first=await b.eval(`${hook}.hoops[0]`);assert.equal(first.name,city.landmarks[0].name);assert.equal(fresh.next,0);assert(Math.hypot(fresh.x-first.x,fresh.z-first.z)<200,id+' quiet opening');
   // The public Continue action must preserve the old location as well as the score.
   await b.eval(`${hook}.state.save.resume=${JSON.stringify({...old.profiles[0].resume,next:0})};${hook}.start(true);${hook}.set({mode:'pause'})`);
   const resumed=await b.eval(`${hook}.state`);assert.equal(resumed.x,20);assert.equal(resumed.y,150);assert.equal(resumed.z,30);assert.equal(resumed.next,0);assert.equal(resumed.save.best,17);
  }
  const streets=scenery.streetDetails||state.streetDetails;assert(streets.pedestrians>=60,id+' walking groups');
  if(id==='venice'){assert.equal(streets.movingCars+streets.buses+streets.parkedCars,0);assert(streets.boats>=6);}else assert(streets.movingCars>=40,id+' visible traffic');
  await b.eval(`${hook}.start(false,true);${hook}.set({speed:0});${hook}.render()`);
  const actors=await b.eval(`${hook}.streetSample()`);await b.eval(`${hook}.step(480);${hook}.render()`);assert.notDeepEqual(await b.eval(`${hook}.streetSample()`),actors,id+' activity moves');
  assert.deepEqual((await b.eval(`${hook}.streetAudit()`)).invalid,[],id+' actors clear of buildings and water');
  const paused=await b.eval(`${hook}.set({mode:'pause'});${hook}.render();${hook}.streetSample()`);await b.eval(`${hook}.step(480);${hook}.render()`);assert.deepEqual(await b.eval(`${hook}.streetSample()`),paused,id+' pause freezes street activity');
  assert(scenery.aerial.roofs>state.mapBuildings*.65,id+' roofs across map');
  const audit=await b.eval(`${hook}.auditGeometry()`);assert.deepEqual(audit.invalid,[],id+' finite aligned geometry attributes');
  assert.equal(await b.eval(`${hook}.hoops.length`),25);
  assert(await b.eval(`${hook}.hoops.every(p=>Number.isFinite(p.y)&&p.y<225)`),id+' reachable route');
  const collect=await b.eval(`${hook}.hoops.map((p,i)=>{${hook}.set({...p,next:i,mode:'flight',stage:'air',speed:0,free:false,invincible:0});${hook}.step(1);return ${hook}.state.next===i+1;})`);assert(collect.every(Boolean),id+' all checkpoints collectible');
  await b.eval(`${hook}.start(false,true)`);const heading=await b.eval(`${hook}.state.heading`);await b.eval(`__fake.stick(.8,0);${hook}.step(120);__fake.stick(0,0)`);assert.notEqual(await b.eval(`${hook}.state.heading`),heading);
  if(id==='berlin')await b.eval('BerlinTest.showDistrict(8)');else await b.eval('FlightTest.look(0)');
  await b.screenshot(new URL(id+'.png',out).pathname);
  await b.eval(`${hook}.start(false,true);${hook}.set({...${hook}.streetViews[0],z:${hook}.streetViews[0].z+25,y:28,heading:0,speed:0,free:true,invincible:999});${hook}.render()`);
  await b.screenshot(new URL(id+'-street.png',out).pathname);
  if(id==='dubai')for(const [kind,file] of [['futuremuseum','dubai-museum.png'],['dubaiopera','dubai-opera.png']]){await b.eval(`FlightTest.look(FlightTest.landmarks.findIndex(l=>l.kind===${JSON.stringify(kind)}))`);await b.screenshot(new URL(file,out).pathname);}
  const allocations=await b.eval(`({g:${hook}.state.geometryCount,p:${hook}.state.shaderPrograms})`);
  await b.eval(`${hook}.start(false,true);${hook}.set({speed:0});${hook}.step(120);${hook}.render()`);
  assert.deepEqual(await b.eval(`({g:${hook}.state.geometryCount,p:${hook}.state.shaderPrograms})`),allocations,id+' no new graphics allocations while flying');
  await b.eval('document.querySelector("#pause").click();ArcadeProfile.sync()');assert(await b.eval(`${hook}.state.save.resume!==null`));
  await b.fire('__fake.hold("B",4000)');await until('location.pathname==="/index.html"',20000);
  assert(await b.eval(`Object.keys(ArcadeBootstrap.saves).some(k=>k.includes(${JSON.stringify(id)}))`),id+' independent saved progress');
  if(revised){
   const persisted=await b.eval(`JSON.parse(ArcadeBootstrap.saves['world-flight.${id}.v1'].value)`);
   assert.equal(persisted.tourVersion,7);assert.deepEqual(persisted.profiles[0].previousTours['6'],{best:17,resume:old.profiles[0].resume});
  }
  report.push({id,startupMs:Math.round(state.startup.elapsedMs),mapBuildings:state.mapBuildings,scenery,streets,geometryCount:state.geometryCount,shaderPrograms:state.shaderPrograms,route:'25 collectible stops',migration:revised?'v6 scores and positions kept; quiet first stop; mobile start button passed':undefined,status:'passed'});
  await fs.writeFile(new URL('validation-'+(selected?.join('-')||'all')+'.json',out),JSON.stringify(report,null,2));console.log('PASS',id);
 }
 assert.deepEqual(b.logs.filter(x=>x.startsWith('EXC')||/THREE.WebGLProgram.*Error|VALIDATE_STATUS.*false/.test(x)),[]);
}finally{await b.close();await server.stop();}
