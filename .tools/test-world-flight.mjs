// Hardware integration test. Run with a Chromium environment able to access the render node.
import {launch} from './cdp.mjs';import fs from 'node:fs';import assert from 'node:assert/strict';
const root=new URL('../',import.meta.url),cities=JSON.parse(fs.readFileSync(new URL('world-flight/cities.json',root),'utf8'));
const selected=process.argv[2]?cities.filter(c=>process.argv[2].split(',').includes(c.id)):cities;
const reportPath=process.argv[3]||'/tmp/world-flight-validation.json';
const b=await launch({headed:true,args:['--headless=new','--ozone-platform=headless','--use-angle=gl-egl','--enable-gpu','--ignore-gpu-blocklist']});const report={testedAt:new Date().toISOString(),viewport:'1920x1080',runs:[]};
try{
await b.addInit(fs.readFileSync(new URL('fakepad.js',import.meta.url),'utf8'));
await b.send('Emulation.setDeviceMetricsOverride',{width:1920,height:1080,deviceScaleFactor:1,mobile:false});
for(const c of selected){
 assert(c.diameterKm<5.5&&c.maxLegKm<2.2,c.id+' route cluster');
 await b.goto('http://127.0.0.1:8777/world-flight/game.html?city='+c.id+'&test');
 for(let i=0;i<200&&!await b.eval('!!window.FlightTest');i++){await b.sleep(100);assert(!(await b.eval('!document.querySelector("#error").classList.contains("hidden")')),c.id+' load error');}
 let s=await b.eval('FlightTest.state');assert(s.startup.ready);assert.equal(s.mode,'title');assert.equal(s.city,c.id);assert(s.mapBuildings>1000);assert.equal(await b.eval('FlightTest.hoops.length'),c.landmarks.length);
 const route=await b.eval('FlightTest.hoops');for(let i=1;i<route.length;i++){const a=route[i-1],p=route[i];assert(Math.hypot(a.x-p.x,a.z-p.z)>180,c.id+' hoop spacing');assert(p.y<225,c.id+' reachable altitude');}
 report.renderer=await b.eval(`(()=>{const gl=document.querySelector('#view').getContext('webgl2'),ext=gl.getExtension('WEBGL_debug_renderer_info');return gl.getParameter(ext.UNMASKED_RENDERER_WEBGL);})()`);
 await b.press('Enter','Enter');await b.sleep(200);assert.equal(await b.eval('FlightTest.state.mode'),'flight');assert.equal(await b.eval('FlightTest.state.stage'),'air');
 await b.eval(`FlightTest.set({speed:30,invincible:30,free:true})`);
 const perf=await b.eval(`new Promise(resolve=>{const frames=[];let last=performance.now(),start=last;function sample(now){frames.push(now-last);last=now;if(now-start<4000)requestAnimationFrame(sample);else{frames.shift();const sorted=[...frames].sort((a,b)=>a-b);resolve({fps:1000/(frames.reduce((a,b)=>a+b,0)/frames.length),p95:sorted[Math.floor(sorted.length*.95)],slowFrames:frames.filter(x=>x>34).length,frames:frames.length,drawCalls:FlightTest.state.drawCalls,triangles:FlightTest.state.triangles,meanRender:FlightTest.state.meanRender});}}requestAnimationFrame(sample);})`);
 await b.eval('FlightTest.start(false,true);FlightTest.set({speed:0})');await b.screenshot('/tmp/world-'+c.id+'.png');
 const before=await b.eval('({g:FlightTest.state.geometryCount,p:FlightTest.state.shaderPrograms})');
 await b.eval('FlightTest.start(false);FlightTest.set({mode:"pause",speed:0})');
 const checks=await b.eval(`FlightTest.hoops.map((p,i)=>{FlightTest.set({...p,mode:'flight',stage:'air',speed:0,next:i,free:false,invincible:0});FlightTest.step(1);FlightTest.render();const s=FlightTest.state;return {i,pass:s.next===i+1,y:s.y,target:p.y,mode:s.mode};})`);
 assert(checks.every(x=>x.pass),c.id+JSON.stringify(checks));assert.equal(await b.eval('FlightTest.state.mode'),'clear');assert.equal(await b.eval('FlightTest.state.save.best'),c.landmarks.length);
 const after=await b.eval('({g:FlightTest.state.geometryCount,p:FlightTest.state.shaderPrograms})');assert.deepEqual(after,before,c.id+' warmed graphics');
 const mid=await b.eval('FlightTest.hoops[Math.floor(FlightTest.hoops.length/2)]');await b.eval(`FlightTest.start(false,true);FlightTest.set(${JSON.stringify({...mid,z:mid.z+90,heading:0,speed:0,mode:'pause'})})`);await b.sleep(100);await b.screenshot('/tmp/world-'+c.id+'-mid.png');
 report.runs.push({city:c.id,buildings:s.mapBuildings,startupMs:s.startup.elapsedMs,geometry:after.g,programs:after.p,landmarks:checks.length,...perf});console.log(c.id,JSON.stringify(report.runs.at(-1)));
 fs.writeFileSync(reportPath,JSON.stringify(report,null,2));
}
assert.equal((await b.eval('Object.keys(localStorage).filter(k=>/^world-flight\\..+\\.v1$/.test(k))')).length,selected.length);
report.errors=b.errors();assert.deepEqual(report.errors,[]);fs.writeFileSync(reportPath,JSON.stringify(report,null,2));
}finally{await b.close().catch(()=>{})}
