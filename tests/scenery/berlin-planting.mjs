import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import zlib from 'node:zlib';

const root=new URL('../../',import.meta.url),context=vm.createContext({window:{}});
vm.runInContext(fs.readFileSync(new URL('public/games/city-flight/scenery/planting.js',root),'utf8'),context);
const {plan}=context.window.CityPlanting;
const ring=(x0,z0,x1,z1)=>[[x0,z0],[x1,z0],[x1,z1],[x0,z1]];
const inBox=(p,x0,z0,x1,z1)=>p.x>x0&&p.x<x1&&p.z>z0&&p.z<z1;
const features=[
 {k:'park',p:ring(-200,-200,200,200),holes:[ring(-180,-180,-100,-100)]},
 {k:'water',p:ring(30,30,100,100)},
 {k:'park',pitch:true,p:ring(-180,100,-100,180)},
 {k:'road',w:10,p:[[-200,0],[200,0]]}
];
const buildings=[{p:ring(100,100,180,180)}];
const planned=plan({features,buildings});
assert(planned.trees.length>3000,'large parks contain substantial groves');
assert.equal(JSON.stringify(planned),JSON.stringify(plan({features,buildings})),'placement is stable across reloads');
for(const p of planned.trees){
 assert(inBox(p,-200,-200,200,200),'trees stay inside the park');
 assert(!inBox(p,-180,-180,-100,-100),'park holes remain clear');
 assert(!inBox(p,30,30,100,100),'trees stay out of water');
 assert(!inBox(p,-180,100,-100,180),'overlapping sports pitches remain clear');
 assert(!inBox(p,98.7,98.7,181.3,181.3),'building footprints retain clearance');
 assert(Math.abs(p.z)>=5.9,'roads retain clearance');
}
const limited=plan({features,buildings,limit:400});
assert.equal(limited.trees.length,400,'mesh population is bounded');
for(const sx of [-1,1])for(const sz of [-1,1])assert(limited.trees.filter(p=>p.x*sx>0&&p.z*sz>0).length>40,'the count cap still covers every quarter of a park');
const map=JSON.parse(zlib.gunzipSync(fs.readFileSync(new URL('public/games/city-flight/berlin/data/berlin.bin',root))));
const avenue=plan({features:[{k:'road',w:5,p:[[-120,0],[120,0]]},{k:'water',p:ring(40,3,100,9)}],buildings:[{p:ring(-55,3,-35,9)}],avenueLimit:40});
assert(avenue.avenues.length>12,'avenues add a substantial row of street trees');
assert(avenue.avenues.some(p=>p.z<0)&&avenue.avenues.some(p=>p.z>0),'both sides can be planted');
for(const p of avenue.avenues){assert(Math.abs(p.z)>4,'pavements and walking routes remain clear');assert(!inBox(p,38.2,2.35,101.8,9.65),'beds avoid the river');assert(!inBox(p,-58.1,1.05,-31.9,10.95),'beds avoid buildings');}
assert.equal(plan({features:[{k:'road',w:5,p:[[-120,0],[120,0]]}],buildings:[],avenueLimit:8}).avenues.length,8,'street trees have a separate bounded budget');
const actual=plan({features:map.features,buildings:map.features.filter(f=>f.k==='building'),limit:24000,avenueLimit:1500});
assert.equal(actual.trees.length,24000,'Berlin uses the bounded dense planting');
assert(actual.stats.centralTrees>6000,'central parks receive continuous groves');
assert(actual.trees.every(p=>!(p.x>100&&p.x<1050&&p.z>1550)),'the former airfield remains open');
assert(actual.avenues.length>=500&&actual.avenues.length<=1500,'Berlin streets receive bounded planting');
assert(actual.avenues.every(p=>!(p.x>-100&&p.x<160&&p.z>90&&p.z<230)),'the detailed district keeps its authored pavement layout');
console.log('PASS Berlin planting: density, full park coverage, exclusions, determinism and bounded population',actual.stats);
