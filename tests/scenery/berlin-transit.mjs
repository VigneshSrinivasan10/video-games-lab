import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import zlib from 'node:zlib';
const root=new URL('../../',import.meta.url),context=vm.createContext({window:{},console:{warn(){}}});
for(const path of ['public/shared/vendor/three/three.min.js','public/games/city-flight/scenery/transit.js'])vm.runInContext(fs.readFileSync(new URL(path,root),'utf8'),context);
const T=context.THREE,api=context.window.CityTransit,map=JSON.parse(zlib.gunzipSync(fs.readFileSync(new URL('public/games/city-flight/berlin/data/berlin.bin',root))));
const landmarks=[[-100,0],[500,-100],[740,-100],[-550,100],[1620,900],[-1800,0]].map(([x,z])=>({x,z}));
const surface=color=>new T.MeshStandardMaterial({color}),environment={surface,materials:{ivory:surface('#e5e6e4'),dark:surface('#303c3b')}},scene=new T.Scene();
const transit=api.build({T,scene,environment,features:map.features,landmarks,metro:{x:1600,z:730,y:12.03,angle:.91}});
assert(transit.stats.sbahn>=3,'surface trains serve several districts');assert.equal(transit.stats.ubahn,1,'the U-Bahn bridge shuttle is included');
const body=scene.children[0].children[0],color=new T.Color();body.getColorAt(0,color);assert.equal(color.getHexString(),'38965c','S-Bahn uses the requested green');body.getColorAt(body.count-1,color);assert.equal(color.getHexString(),'e9bd43','U-Bahn uses yellow');
const meshes=scene.children[0].children.length,camera={position:{x:0,z:0}},before=JSON.stringify(transit.sample());let previous=transit.sample();
for(let i=1;i<=1200;i++){
 transit.update(camera,'Performance',i*.1,true);const next=transit.sample();
 for(let j=0;j<next.length;j++)assert(Math.hypot(next[j].x-previous[j].x,next[j].z-previous[j].z,next[j].y-previous[j].y)<1.1,'carriages move continuously, including at route reversals');
 if(i%100===0)assert.equal(transit.audit().invalid.length,0,'carriages stay on their railway routes');previous=next;
}
assert.notEqual(JSON.stringify(transit.sample()),before,'trains move');
const paused=JSON.stringify(transit.sample());transit.update(camera,'High',500,false);assert.equal(JSON.stringify(transit.sample()),paused,'pause freezes rail traffic');
assert.equal(scene.children[0].children.length,meshes,'animation reuses fixed mesh pools');
for(const o of scene.children[0].children)if(o.isInstancedMesh)assert(o.instanceMatrix.array.every(Number.isFinite),'finite carriage transforms');
console.log('PASS Berlin transit: requested colours, connected rails, continuous travel, pause and fixed pools',transit.stats);
