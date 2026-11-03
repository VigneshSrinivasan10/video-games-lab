import assert from 'node:assert/strict';
import fs from 'node:fs';import vm from 'node:vm';import zlib from 'node:zlib';
const root=new URL('../../',import.meta.url),context=vm.createContext({console:{warn(){},log:console.log},window:{}});
vm.runInContext(fs.readFileSync(new URL('public/shared/vendor/three/three.min.js',root),'utf8'),context);
vm.runInContext(fs.readFileSync(new URL('public/games/city-flight/scenery/streets.js',root),'utf8'),context);
const T=context.THREE,build=context.window.CityStreets.build,cities=JSON.parse(fs.readFileSync(new URL('public/games/city-flight/cities.json',root)));
const report=[],selected=process.argv[2]?.split(',');
for(const id of ['berlin',...cities.map(c=>c.id)].filter(id=>!selected||selected.includes(id))){
 const c=cities.find(c=>c.id===id),data=JSON.parse(zlib.gunzipSync(fs.readFileSync(new URL('public/games/city-flight/'+(id==='berlin'?'berlin/data/berlin.bin':'data/'+id+'.bin'),root))));
 const buildings=data.features.filter(f=>f.k==='building');for(const f of buildings){const xs=f.p.map(p=>p[0]),zs=f.p.map(p=>p[1]);f.x=(Math.min(...xs)+Math.max(...xs))/2;f.z=(Math.min(...zs)+Math.max(...zs))/2;f.w=(Math.max(...xs)-Math.min(...xs))/2;f.d=(Math.max(...zs)-Math.min(...zs))/2;}
 const origin=c?.origin||[13.38,52.52],landmarks=c?c.landmarks.map(l=>({x:(l.lon-origin[0])*111320*Math.cos(origin[1]*Math.PI/180)*.36,z:(origin[1]-l.lat)*111320*.36})):[];
 const scene=new T.Scene(),environment={aesthetic:'illustrated',surface:color=>new T.MeshStandardMaterial({color})};
 const life=build({T,scene,environment,cityId:id,features:data.features,buildings,landmarks,box(){}});
 assert(life.stats.pedestrians>=60,id+' walking groups');
 if(id==='venice'){assert.equal(life.stats.movingCars+life.stats.buses+life.stats.parkedCars,0);assert(life.stats.boats>=32);assert(life.sample().filter(a=>a.kind==='boat'&&Math.hypot(a.x-landmarks[0].x,a.z-landmarks[0].z)<120).length>=2,'boats reach the Grand Canal near Rialto, not only the outer lagoon');}
 else assert(life.stats.movingCars>=40,id+' mapped traffic');
 const cameras={position:{x:0,y:40,z:0}},before=JSON.stringify(life.sample()),meshes=scene.children.length;
 let previous=life.sample();
 for(let i=1;i<=1200;i++){
  life.update(cameras,'Performance',i*.1,true);
  if(i%100===0)assert.equal(life.audit().invalid.length,0,id+' actors remain on valid paths: '+JSON.stringify(life.audit()));
  const sample=life.sample();for(let j=0;j<sample.length;j++)assert(Math.hypot(sample[j].x-previous[j].x,sample[j].z-previous[j].z)<1.25,id+' no wrap teleport');previous=sample;
 }
 assert.notEqual(JSON.stringify(life.sample()),before,id+' moving activity');
 const paused=JSON.stringify(life.sample());life.update(cameras,'High',500,false);assert.equal(JSON.stringify(life.sample()),paused,id+' pause freezes activity');life.update(cameras,'High',500.1,true);assert.equal(scene.children.length,meshes,id+' fixed mesh pools');
 for(const mesh of scene.children)assert([...mesh.instanceMatrix.array].every(Number.isFinite),id+' finite transforms');
 report.push({id,...life.stats,drawMeshes:meshes});console.log(report.at(-1));
 for(const child of scene.children){child.geometry.dispose();child.material.dispose();}
}
for(const c of cities.filter(c=>['rome','dubai'].includes(c.id))){assert.equal(c.routeVersion,7);assert.equal(c.landmarks.at(-1).id,c.id==='rome'?'colosseum':'burj-khalifa');assert.deepEqual(c.landmarks.map(l=>l.id),[...c.previousRouteIds].reverse());assert(c.minLegKm>=.75&&c.maxLegKm<2.2);}
fs.mkdirSync(new URL('.local/street-life/',root),{recursive:true});fs.writeFileSync(new URL('.local/street-life/paths'+(selected?'-'+selected.join('-'):'')+'.json',root),JSON.stringify(report,null,2));
