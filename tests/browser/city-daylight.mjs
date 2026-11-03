import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {launch} from '../helpers/cdp.mjs';
import {startTestServer} from '../helpers/server.mjs';
const ids=(process.argv[2]||'berlin,venice,dubai').split(','),label=process.argv[3]||'after',out=new URL('../../.local/daylight/',import.meta.url);
await fs.mkdir(out,{recursive:true});
const server=await startTestServer(),b=await launch({headed:true,args:['--headless=new','--ozone-platform=headless','--use-angle=gl-egl','--enable-gpu','--ignore-gpu-blocklist']}),reports=[];
async function until(expression){const end=Date.now()+240000;while(Date.now()<end){if(await b.eval(expression))return;assert.deepEqual(b.logs.filter(s=>s.startsWith('EXC')||s.startsWith('ERROR')),[]);await b.sleep(300);}throw Error('Timed out: '+expression);}
try{
 await b.addInit(`Object.defineProperty(window,'CityEnvironment',{configurable:true,set(api){Object.defineProperty(window,'CityEnvironment',{value:api,writable:true});const create=api.create;api.create=args=>{window.__lightRenderer=args.renderer;return create(args)};}});Object.defineProperty(window,'CityStreets',{configurable:true,set(api){Object.defineProperty(window,'CityStreets',{value:api,writable:true});const build=api.build;api.build=args=>{window.__lightScene=args.scene;window.__lightEnvironment=args.environment;return build(args)};}});`);
 await b.send('Emulation.setDeviceMetricsOverride',{width:1280,height:800,deviceScaleFactor:1,mobile:false});await b.signIn(server.base,'daylight-check');await b.goto(server.base+'/index.html');
 await b.eval(`ArcadeProfile.storage.setItem('world-flight.graphics','Performance');ArcadeProfile.storage.setItem('berlin-city-flight.graphics','Performance');ArcadeProfile.sync()`);
 for(const id of ids){
  const berlin=id==='berlin'||id==='district',hook=id==='district'?'BerlinDistrictTest':berlin?'BerlinTest':'FlightTest';
  await b.goto(server.base+(id==='district'?'/games/berlin-district/index.html?test':berlin?'/berlin-city-flight.html?test':'/world-flight/game.html?city='+id+'&test'));await until(`window.${hook}?.state.startup.ready`);
  await b.eval('window.requestAnimationFrame=()=>0');await b.sleep(200);
  if(berlin&&label.startsWith('city')){await b.eval(`document.querySelector('#east-look').click();document.querySelector('#place0').click()`);const state=await b.eval(`${hook}.state`);assert(state.free&&state.mode==='flight');assert(Math.abs(state.x-state.easternPlaces[0].x)<2,'menu opens a hoop-free Parkstadt flight');}
  await b.eval(`${hook}.start(false,true);${hook}.set({speed:0});${hook}.render()`);
  const season=await b.eval(`({aesthetic:__lightEnvironment.aesthetic,facetedLeaves:__lightEnvironment.materials.leaves.every(m=>m.flatShading),solar:__lightEnvironment.daylight.solar,urban:__lightEnvironment.daylight.urban?.stats,leaves:__lightEnvironment.materials.leaves.map(m=>m.color.getHexString()),planting:${hook}.state.planting,streetscape:${hook}.state.streetscape,transit:${hook}.state.transit,parkstadt:${hook}.state.parkstadt,startup:${hook}.state.startup,sun:__lightEnvironment.daylight.sunColor.toArray(),water:__lightScene.children.find(o=>o.material?.uniforms?.waterColor).material.uniforms.waterColor.value.getHexString()})`);
  if(!label.startsWith('before')){
   if(berlin){assert(season.solar.elevation>19&&season.solar.elevation<21,'Berlin uses the October afternoon sun');assert(season.urban.buildings>500&&season.urban.materials>10,'central Berlin uses the baked sky visibility');assert.equal(new Set(season.leaves).size,6,'autumn palette retains six tree colours');assert(season.leaves.some(c=>{const n=parseInt(c,16);return ((n>>8)&255)>((n>>16)&255)&&((n>>8)&255)>(n&255)}),'some foliage remains green');}
   else{assert(season.solar.elevation>10&&season.solar.elevation<65,'each city has a geographic afternoon sun');assert.equal(season.leaves.length,6,'regional green planting has six shades');}
  }
  if((label.startsWith('neutral')||label.startsWith('illustrated')||label.startsWith('restored')||label.startsWith('lively'))&&berlin){assert.equal(season.planting.trees,14000,'dense groves reach the scene');assert(season.planting.centralTrees>6000,'central parks have dense groves');assert.deepEqual(season.sun,[1,1,1],'sunlight is neutral');assert.equal(season.water,season.aesthetic==='illustrated'?'079ec5':'258ba7','the river uses the blue-green style colour');}
  if(label.startsWith('illustrated')){assert.equal(season.aesthetic,berlin?'illustrated':null,'the art direction is confined to Berlin');assert.equal(season.facetedLeaves,berlin,'Berlin uses the faceted tree style');}
  if(label.startsWith('restored')||label.startsWith('lively')){
   assert.equal(season.facetedLeaves,false,'rounded canopy shading is restored');
   assert.equal(await b.eval(`!!__lightScene.getObjectByName('Illustrated cloud banks')`),false,'the angular cloud geometry is removed');
   if(berlin){assert.equal(season.aesthetic,'illustrated','the approved palette remains');assert.equal(await b.eval(`__lightScene.children.find(o=>o.material?.uniforms?.waterColor).material.fragmentShader.includes('cityWaterCell')`),false,'water uses the original smooth wave normals');}
  }
  if(label.startsWith('lively')&&berlin){
   assert(season.streetscape.streetTrees>=500&&season.streetscape.flowerBeds>100,'street planting is built');assert(season.streetscape.laneDashes>100&&season.streetscape.cycleLanes>10,'road markings are built');assert(season.transit.sbahn>=3&&season.transit.ubahn===1,'both rail types are present');
   const before=await b.eval(`${hook}.transitSample()`);await b.sleep(1200);await b.eval(`${hook}.render()`);const after=await b.eval(`${hook}.transitSample()`);assert(after.some((p,i)=>Math.hypot(p.x-before[i].x,p.z-before[i].z)>.5),'trains move on the render clock');assert.deepEqual((await b.eval(`${hook}.transitAudit()`)).invalid,[]);
  }
  if(label.startsWith('city')){assert.equal(season.aesthetic,'illustrated');assert.equal(season.facetedLeaves,false);assert.deepEqual(season.sun,[1,1,1]);assert(season.planting.trees>100);assert.deepEqual((await b.eval(`${hook}.transitAudit()`)).invalid,[]);if(berlin){const state=await b.eval(`${hook}.state`);assert(state.parkstadt.buildings>=14);assert(state.parkstadt.mappedTrees>190);assert(state.mapTimestamp.startsWith('2026-11-01'));}}
  const views=berlin?[['flight',null],['spree','spree'],['aerial',8],['tower',5],['dome',9],['street',1],['trees',7],['river',6],...(label.startsWith('city')?[['parkstadt','parkstadt'],['kopenick','kopenick'],['wuhlheide','wuhlheide']]:[]),...(label.startsWith('lively')?[['sbahn','sbahn'],['ubahn','ubahn']]:[])]:[['flight',null],['landmark',id==='dubai'?24:0]];
  for(const [view,index]of views){if(['parkstadt','kopenick','wuhlheide'].includes(index))await b.eval(`(()=>{const p=${hook}.state.easternPlaces.find(p=>p.id==='${index}');${hook}.start(false,true);${hook}.set({x:p.x,y:p.altitude,z:p.z+p.approach,heading:p.heading,stage:'air',mode:'flight',speed:0,free:true});${hook}.render();})()`);else if(index==='sbahn'||index==='ubahn')await b.eval(`(()=>{const samples=${hook}.transitSample(),p=samples.find(p=>p.kind==='${index}'&&!p.covered)||samples.find(p=>p.kind==='${index}');${hook}.start(false,true);${hook}.set({x:p.x-Math.cos(p.angle)*32+Math.sin(p.angle)*38,y:p.y+18,z:p.z+Math.sin(p.angle)*32+Math.cos(p.angle)*38,heading:Math.PI/2-p.angle,stage:'air',mode:'flight',speed:0,free:true});${hook}.render();})()`);else if(index==='spree')await b.eval(`${hook}.start(false,true);${hook}.set({x:-180,y:25,z:-47,heading:Math.PI/2,stage:'air',mode:'flight',speed:0,free:true});${hook}.render()`);else if(berlin&&index!==null)await b.eval(`${hook}.showDistrict(${index});${hook}.render()`);else if(index!==null)await b.eval(`${hook}.look(${index});${hook}.render()`);
   // Shadows and water refresh on separate frame cadences. Let both settle
   // after a camera jump before comparing their lighting with the visible sky.
   await b.eval(`for(let i=0;i<4;i++)${hook}.render()`);
   await b.screenshot(new URL(`${label}-${id}-${view}.png`,out).pathname);
   const light=await b.eval(`(()=>{const s=__lightScene,sun=s.children.find(o=>o.isDirectionalLight),sky=s.children.find(o=>o.material?.uniforms?.top),water=s.children.find(o=>o.material?.uniforms?.waterColor),direction=sun.position.clone().sub(sun.target.position).normalize();return{sun:direction.toArray(),sky:sky?.material.uniforms.sunDirection?.value.toArray(),water:water.material.uniforms.sunDirection.value.toArray(),exposure:__lightRenderer.toneMappingExposure,fog:s.fog.density,shaderPrograms:${hook}.state.shaderPrograms,geometries:${hook}.state.geometryCount};})()`);
   if(!label.startsWith('before')){assert(light.sky,'sky shares daylight direction');for(const target of [light.sky,light.water])assert(light.sun.reduce((v,n,i)=>v+n*target[i],0)>.9999,id+' sky, water and shadows agree');}
   reports.push({id,view,...light,season});
  }
  const allocations=await b.eval(`({g:${hook}.state.geometryCount,p:${hook}.state.shaderPrograms})`);
  await b.eval(`${hook}.start(false,true);document.querySelector('#pause').click()`);
  for(let i=0;i<3;i++)await b.eval(`document.querySelector('#graphics').click();${hook}.render()`);
  assert.deepEqual(await b.eval(`({g:${hook}.state.geometryCount,p:${hook}.state.shaderPrograms})`),allocations,'quality changes reuse prepared lighting');
  const hoops=await b.eval(`${hook}.hoops.map((p,i)=>{${hook}.set({...p,next:i,mode:'flight',stage:'air',speed:0,free:false,invincible:0});${hook}.step(1);return ${hook}.state.next===i+1;})`);assert(hoops.every(Boolean),'all 25 stops remain reachable');
  assert.deepEqual((await b.eval(`${hook}.auditGeometry()`)).invalid,[]);await fs.writeFile(new URL(`${label}.json`,out),JSON.stringify(reports,null,2));console.log('PASS daylight views, quality settings and checkpoints:',id);
 }
 assert.deepEqual(b.logs.filter(s=>s.startsWith('EXC')||s.startsWith('ERROR')||/THREE.WebGLProgram.*Error|VALIDATE_STATUS.*false/.test(s)),[]);
}finally{await b.close();await server.stop();}
