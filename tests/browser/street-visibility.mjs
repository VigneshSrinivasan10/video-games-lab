import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {launch} from '../helpers/cdp.mjs';
import {startTestServer} from '../helpers/server.mjs';
const ids=(process.argv[2]||'rome,dubai,berlin').split(','),label=process.argv[3]||'after';
const out=new URL('../../.local/street-visibility/',import.meta.url);await fs.mkdir(out,{recursive:true});
const server=await startTestServer(),b=await launch({headed:true,args:['--headless=new','--ozone-platform=headless','--use-angle=gl-egl','--enable-gpu','--ignore-gpu-blocklist']}),reports=[];
async function until(expr){const end=Date.now()+240000;while(Date.now()<end){if(await b.eval(expr))return;assert.deepEqual(b.logs.filter(x=>x.startsWith('EXC')),[]);await b.sleep(500);}throw Error('Timeout: '+expr);}
try{
 await b.addInit(`Object.defineProperty(window,'CityStreets',{configurable:true,set(api){Object.defineProperty(window,'CityStreets',{value:api,writable:true});const Renderer=THREE.WebGLRenderer;THREE.WebGLRenderer=function(...args){return window.__trafficRenderer=new Renderer(...args)};const build=api.build;api.build=args=>{const old=new Set(args.scene.children),life=build(args);window.__trafficScene=args.scene;window.__trafficLife=life;window.__trafficPools=args.scene.children.filter(o=>!old.has(o));const update=life.update;life.update=(camera,...args)=>{window.__trafficCamera=camera;return update(camera,...args)};return life;};}});`);
 await b.send('Emulation.setDeviceMetricsOverride',{width:1280,height:800,deviceScaleFactor:1,mobile:false});
 await b.signIn(server.base,'street-visibility');await b.goto(server.base+'/index.html');
 await b.eval(`ArcadeProfile.storage.setItem('world-flight.graphics','Performance');ArcadeProfile.storage.setItem('berlin-city-flight.graphics','Performance');ArcadeProfile.sync()`);
 for(const id of ids){
  const hook=id==='berlin'?'BerlinTest':'FlightTest';console.log('Loading',id);
  await b.goto(server.base+(id==='berlin'?'/berlin-city-flight.html?test':'/world-flight/game.html?city='+id+'&test'));await until(`window.${hook}?.state.startup.ready`);
  await b.eval('window.requestAnimationFrame=()=>0');await b.sleep(200);
  await b.eval(`${hook}.start(false);${hook}.set({speed:0});${hook}.render()`);
  const opening=await b.eval(`${hook}.state`);
  // Evaluate real chase-camera views: opening, the next stop, and mid-tour.
  const views=[['start',null],...(id==='venice'?[['first-hoop',0]]:[]),['stop-2',1],['stop-13',12],...(id==='berlin'?[['district','district']]:[])];
  for(const [view,index] of views){
   if(index==='district')await b.eval(`${hook}.startDistrict();${hook}.set({speed:0});${hook}.render()`);
   else if(index!==null)await b.eval(`${hook}.set({...${hook}.hoops[${index}],z:${hook}.hoops[${index}].z+90,heading:0,mode:'flight',stage:'air',speed:0});${hook}.render()`);
   const report=await b.eval(`(()=>{const T=THREE,c=__trafficCamera,rows=[];for(const [kind,pool] of [['cars',__trafficPools[0]],['people',__trafficPools[3]],['boats',__trafficPools[5]]]){let inFrame=0,large=0,maxPixels=0;for(let i=0;i<pool.count;i++){const m=new T.Matrix4();pool.getMatrixAt(i,m);const pos=new T.Vector3(),scale=new T.Vector3();m.decompose(pos,new T.Quaternion(),scale);if(!scale.x)continue;const ndc=pos.clone().project(c),pixels=Math.max(scale.x,scale.y,scale.z)*innerHeight/(2*Math.tan(c.fov*Math.PI/360)*pos.distanceTo(c.position));if(Math.abs(ndc.x)<1&&Math.abs(ndc.y)<1&&ndc.z>-1&&ndc.z<1){inFrame++;if(pixels>=3)large++;maxPixels=Math.max(maxPixels,pixels);}}rows.push({kind,total:pool.count,inFrame,large,maxPixels});}return {rows,stats:__trafficLife.stats,camera:c.position.toArray(),flight:${hook}.state};})()`);
   await b.eval('__trafficRenderer.render(__trafficScene,__trafficCamera)');await b.screenshot(new URL(`${label}-${id}-${view}.png`,out).pathname);
   await b.eval('__trafficPools.forEach(o=>o.visible=false);__trafficRenderer.render(__trafficScene,__trafficCamera)');await b.screenshot(new URL(`${label}-${id}-${view}-hidden.png`,out).pathname);
   await b.eval('__trafficPools.forEach(o=>o.visible=true);__trafficRenderer.render(__trafficScene,__trafficCamera)');
   // Render an occlusion-preserving mask: count actual visible actor pixels,
   // rather than treating objects behind buildings as visible traffic.
   const mask=await b.eval(`(()=>{const T=THREE,s=__trafficScene,r=__trafficRenderer,old=[],bg=s.background,fog=s.fog,tone=r.toneMapping;const black=new T.MeshBasicMaterial({color:0}),nonDepth=new T.MeshBasicMaterial({color:0,depthWrite:false}),materials=[0,1,2].map(channel=>new T.ShaderMaterial({vertexShader:'void main(){gl_Position=projectionMatrix*modelViewMatrix*instanceMatrix*vec4(position,1.);}',fragmentShader:'void main(){gl_FragColor=vec4('+[0,1,2].map(i=>i===channel?'1.':'0.').join(',')+',1.);}'}));s.traverse(o=>{if(!o.material)return;old.push([o,o.material,o.visible,o.onBeforeRender]);o.onBeforeRender=()=>{};const i=__trafficPools.indexOf(o);o.material=i<0?(old.at(-1)[1].depthWrite===false?nonDepth:black):materials[o.userData.streetKind==='person'?1:o.userData.streetKind==='boat'?2:i<3?0:i<5?1:i<7?2:0];if(i<0&&(o.isSprite||old.at(-1)[1].depthTest===false))o.visible=false;});s.background=new T.Color(0);s.fog=null;r.toneMapping=T.NoToneMapping;r.render(s,__trafficCamera);const gl=r.getContext(),pixels=new Uint8Array(gl.drawingBufferWidth*gl.drawingBufferHeight*4),counts=[0,0,0];gl.readPixels(0,0,gl.drawingBufferWidth,gl.drawingBufferHeight,gl.RGBA,gl.UNSIGNED_BYTE,pixels);for(let i=0;i<pixels.length;i+=4)for(let c=0;c<3;c++)if(pixels[i+c]>190&&pixels[i+(c+1)%3]<20&&pixels[i+(c+2)%3]<20)counts[c]++;const png=r.domElement.toDataURL();for(const [o,m,v,f]of old){o.material=m;o.visible=v;o.onBeforeRender=f;}s.background=bg;s.fog=fog;r.toneMapping=tone;black.dispose();nonDepth.dispose();materials.forEach(m=>m.dispose());return {counts,png};})()`);
   await fs.writeFile(new URL(`${label}-${id}-${view}-mask.png`,out),Buffer.from(mask.png.split(',')[1],'base64'));report.visiblePixels={vehicles:mask.counts[0],pedestrians:mask.counts[1],boats:mask.counts[2]};
   reports.push({id,view,...report});console.log(id,view,report.visiblePixels);
  }
  if(label==='after'){
   const shots=reports.filter(r=>r.id===id);
   if(id==='venice'){assert(shots.find(r=>r.view==='start').visiblePixels.boats>30,'boats visibly occupy the canal in the opening flight');assert(shots.some(r=>r.visiblePixels.pedestrians>50),'walking groups are visible beyond the rooftops');}
   else for(const shot of shots.filter(r=>id==='dubai'||r.view.startsWith('stop-'))){assert(shot.visiblePixels.vehicles>100,id+' vehicles reach the framebuffer');assert(shot.visiblePixels.pedestrians>20,id+' pedestrians reach the framebuffer');}
  }
  await b.eval(`${hook}.set({...${JSON.stringify({x:opening.x,y:opening.y,z:opening.z,heading:opening.heading})},mode:'flight',stage:'air',speed:0});${hook}.render()`);
  const before=await b.eval(`${hook}.streetSample()`),simulationTime=await b.eval(`${hook}.state.time`);await b.sleep(2000);await b.eval(`${hook}.render()`);const after=await b.eval(`${hook}.streetSample()`);
  if(label==='after'){assert.equal(await b.eval(`${hook}.state.time`),simulationTime,'render clock advances without simulation ticks');assert(after.some((a,i)=>Math.hypot(a.x-before[i].x,a.z-before[i].z)>.5),id+' street movement uses elapsed wall time');}
  await b.screenshot(new URL(`${label}-${id}-moving.png`,out).pathname);
  await b.eval(`${hook}.set({mode:'pause'});${hook}.render()`);const paused=await b.eval(`${hook}.streetSample()`);await b.sleep(700);await b.eval(`${hook}.render()`);assert.deepEqual(await b.eval(`${hook}.streetSample()`),paused,'pause freezes street activity');
  await fs.writeFile(new URL(label+'.json',out),JSON.stringify(reports,null,2));
 }
 assert.deepEqual(b.logs.filter(x=>x.startsWith('EXC')||/THREE.WebGLProgram.*Error/.test(x)),[]);
}finally{await b.close();await server.stop();}
