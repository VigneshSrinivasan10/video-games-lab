import test from 'node:test';
import assert from 'node:assert/strict';
await import('../../public/games/rumble-riders/riding.js');
await import('../../public/games/rumble-riders/environments.js');
await import('../../public/games/rumble-riders/circuits.js');
const R=globalThis.RumbleRiding;
test('free flight is ballistic and independent of frame rate',()=>{
 for(const kind of ['simple','flip']){
  const launch=R.launch(kind,100),results=[];
  for(const dt of [1/30,1/60,1/120]){let y=launch.height,v=launch.velocity;for(let i=0;i<Math.round(.5/dt);i++){const n=R.step(y,v,dt);y=n.height;v=n.velocity}results.push(y)}
  assert.ok(Math.max(...results)-Math.min(...results)<1e-8);
  assert.ok(results[0]>launch.height);
  const end=R.step(launch.height,launch.velocity,launch.duration+.01);assert.equal(end.height,0);assert.ok(end.landed);assert.ok(end.impact>0);
 }
});
test('somersault ends upright and both ramps leave half a road free',()=>{
 const l=R.launch('flip',100);assert.equal(R.rotation(0,l.duration,l.height,l.velocity),0);assert.equal(R.rotation(l.duration,l.duration,0,-400),Math.PI*2);
 assert.ok(R.ramps.flip.rise>R.ramps.simple.rise);assert.ok(R.ramps.flip.length>R.ramps.simple.length);
});
test('banking fades at section edges and dirt is localized',()=>{
 assert.equal(R.bank(1,800),0);assert.ok(Math.abs(R.bank(1,1350))>8);assert.equal(R.bank(1,1900),0);
 assert.equal(R.surface(8,1000),'dirt');assert.equal(R.surface(8,3000),'road');
});

test('all launch ramps leave the other half of the road clear',()=>{for(let i=0;i<10;i++)for(const r of RumbleTour.build(i).filter(f=>f.type==='ramp')){assert.equal(Math.abs(r.x),.5);assert.equal(r.width,.45);assert.ok(r.x-r.width>=-1&&r.x+r.width<=1);assert.ok(r.x-r.width>0||r.x+r.width<0)}});
