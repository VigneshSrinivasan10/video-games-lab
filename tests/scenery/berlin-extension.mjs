import assert from 'node:assert/strict';
import fs from 'node:fs';
import zlib from 'node:zlib';
const root=new URL('../../',import.meta.url),map=JSON.parse(zlib.gunzipSync(fs.readFileSync(new URL('public/games/city-flight/berlin/data/berlin.bin',root))));
const inside=(p,ring)=>{let yes=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++){const a=ring[i],b=ring[j];if((a[1]>p[1])!==(b[1]>p[1])&&p[0]<(b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0])yes=!yes;}return yes;};
const geo=(lon,lat)=>[(lon-13.38)*111320*Math.cos(52.52*Math.PI/180)*.36,(52.52-lat)*111320*.36];
assert(Date.parse(map.dataTimestamp)>=Date.parse('2026-11-01'),'map has a verifiable recent extract timestamp');
assert.deepEqual(map.origin,[13.38,52.52],'existing geographic/save coordinates remain unchanged');
const buildings=map.features.filter(f=>f.k==='building'),district=buildings.filter(f=>f.district==='parkstadt'),apartments=district.filter(f=>f.setbacks);
assert.equal(apartments.length,14,'all mapped apartment footprints are included');
assert(apartments.filter(f=>f.holes?.length).length>=5,'mapped courtyards stay open');
for(const f of apartments){assert(f.id>0);assert(f.floors===5||f.floors===6);assert(f.h<8,'new apartment blocks use local storey scale, not random tall slabs');assert(['levels','height','estimated'].includes(f.heightSource));for(const inset of f.setbacks)for(const p of inset.p)assert(inside(p,f.p)&&!(f.holes||[]).some(h=>inside(p,h)),'recessed top floors stay within the mapped building');}
const trees=map.parkstadt.nodes.filter(n=>n.kind==='tree');assert.equal(trees.length,211,'mapped district trees are retained');
for(const n of trees)assert(inside([n.x,n.z],map.parkstadt.p),'trees stay within the mapped neighbourhood');
for(const [name,lon,lat] of [['Parkstadt',13.5097,52.482],['Köpenick',13.5744,52.4451],['Karlshorst station',13.5257,52.4805]]){
 assert(inside([lon,lat],map.coverage),name+' is inside the actual map coverage');const [x,z]=geo(lon,lat);assert(buildings.filter(f=>f.p.some(p=>Math.hypot(p[0]-x,p[1]-z)<180)).length>20,name+' has a real surrounding district');
}
const source=fs.readFileSync(new URL('public/games/city-flight/berlin/game.js',root),'utf8'),hoops=JSON.parse(source.match(/const hoopData=(\[.*?\])\.map/)[1]);assert.equal(hoops.length,25);assert(hoops.every(h=>h.lon<13.48),'the eastern extension adds no hoops');
console.log('PASS recent Berlin map, district footprints, courtyard clearances, 211 mapped trees and unchanged tour');
