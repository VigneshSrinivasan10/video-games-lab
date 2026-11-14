/* Ten distinct places with shared simple controls and separate riding challenges. */
(() => {
const definitions = [
 ['Star Sprint','⚡','★★★ → ⚡','turbo',4,.0026,.88],
 ['Corner Lines','↝','🏍 → ◇','apex',6,.0031,1.0],
 ['Puddle Hop','💧','💧 ⤴ ✓','hop',6,.0025,.85],
 ['Landing Lines','⤴','⤴ → ▧','landing',4,.0023,.8],
 ['Draft Dash','💨','🏍 ⋯ 🏍 → ⚡','draft',2,.0022,.8],
 ['Speed Timing','⏱','★★★ → ⚡ → ⏱','speed',5,.0024,.85],
 ['Gallery Run','▥','▥ → ★★★','gallery',12,.0028,.9],
 ['Double Hop','〰','💧 ⤴ 💧 ⤴','double',2,.0025,.9],
 ['Passing Lines','🏍','🏍 ↑ 🏍','pass',4,.0023,.8],
 ['Coast Cup','🏆','↝ ⤴ ⚡ 🏁','mix',8,.0029,.95]
];
const circuits=definitions.map(([name,icon,demo,kind,target,curve,amplitude],i)=>Object.freeze({id:i,name:RumbleWorld.environments[i].name,icon:RumbleWorld.environments[i].icon,demo,kind,target,curve:RumbleWorld.environments[i].curve,amplitude,phase:.65+i*.31,length:6840}));
function build(index){
 const c=circuits[index],out=[];
 const add=(type,distance,x=0,extra={})=>out.push({type,distance,x,done:false,...extra});
 const trail=(start,x,extra={})=>{for(let i=0;i<4;i++)add('star',start+i*32,x,extra)};
 const gallery=(d,x=0)=>{for(const offset of [0,70,140])add('tunnel',d+offset,0);trail(d+15,x,{gallery:true})};
 const ramp=(d,x)=>{add('ramp',d,x);trail(d+40,x,{air:true});add('landing',d+140,x,{span:110})};
 if(index===0){
  for(const offset of [0,3320]){
   const side=offset?-1:1;
   for(const [d,x,air] of [[180,-.25,false],[500,.48,false],[980,-.5,true],[1360,.35,false],[1940,-.35,false],[2440,.5,false],[2970,0,true]])trail(d+offset,x*side,{air});
   for(const [d,x] of [[650,.48],[1270,-.35],[2220,.1],[2720,.5]])add('puddle',d+offset,x*side);
   add('ramp',940+offset,-.5*side);add('ramp',2920+offset,0);
   for(const d of [1580,1650,1720])add('tunnel',d+offset);
  }
 }else{
  // Similar length and rhythm across all courses; generous recovery space between sections.
  const side=index%2?-1:1;
  for(let i=0;i<7;i++)trail(180+i*900,(i%2?.45:-.35)*side);
  if(c.kind==='apex'){
   for(let i=0;i<8;i++){const d=600+i*720,x=(i%2?.56:-.56);trail(d-150,x);add('apex',d,x,{width:.28})}
   ramp(3150,.25);gallery(4700);
  }
  if(c.kind==='hop'){
   for(let i=0;i<8;i++){const d=600+i*730,x=i%2?.35:-.35;trail(d-180,x);add('puddle',d,x,{wide:true})}
   gallery(3350);
  }
  if(c.kind==='landing'){
   for(let i=0;i<6;i++)ramp(650+i*950,i%2?.45:-.45);
   gallery(3650);
  }
  if(c.kind==='draft'){
   for(let i=0;i<5;i++)gallery(850+i*1050,i%2?.3:-.3);
   ramp(2800,0);ramp(5600,0);
  }
  if(c.kind==='speed'){
   for(let i=0;i<7;i++){const d=650+i*820,x=i%2?.4:-.4;trail(d-150,x);add('speed',d,x,{minimum:96})}
   gallery(3000);
  }
  if(c.kind==='gallery'){
   for(let i=0;i<6;i++)gallery(650+i*950,i%2?.45:-.45);
   ramp(2700,0);
  }
  if(c.kind==='double'){
   for(let i=0;i<4;i++){const d=750+i*1450,x=i%2?.35:-.35;trail(d-180,x);add('puddle',d,x,{wide:true,pair:i});add('puddle',d+180,x,{wide:true,pair:i})}
   gallery(3400);
  }
  if(c.kind==='pass'){
   for(let i=0;i<6;i++)trail(550+i*950,i%2?.4:-.4);
   ramp(1700,0);ramp(4900,0);gallery(3100);
  }
  if(c.kind==='mix'){
   add('apex',600,-.35,{width:.28});add('puddle',1100,.35,{wide:true});ramp(1600,-.4);
   trail(2400,.4);add('speed',2550,.4,{minimum:96});gallery(3000,-.4);
   add('apex',3700,.45,{width:.28});add('puddle',4100,-.35,{wide:true});ramp(4550,.4);
   trail(5500,-.4);add('speed',5650,-.4,{minimum:96});add('apex',6100,0,{width:.28});
  }
 }
 for(const [start,end] of RumbleWorld.environments[index].decks||[])trail(start+(end-start)*.4,-.5);
 if([1,2,4,6,8,9].includes(index)){
  const d=[0,2350,2850,0,3950,0,4250,0,3650,5150][index];
  add('ramp',d,.5,{long:true});trail(d+40,.5,{air:true});add('landing',d+145,.5,{span:130});
 }
 if([3,7,8,9].includes(index))for(const d of [2050,2180,2310])add('roller',d,index%2?-.45:.45);
 // Every launch ramp occupies exactly one half of the road, with a clear bypass.
 const launches=out.filter(f=>f.type==='ramp');
 launches.forEach((r,i)=>{
  const oldX=r.x;r.x=oldX<0?-.5:oldX>0?.5:i%2?.5:-.5;r.width=.45;
  r.style=[3,5,8,9].includes(index)&&i%2===0?'flip':'simple';
  for(const f of out)if(f!==r&&f.distance>r.distance&&f.distance<r.distance+220&&Math.abs(f.x-oldX)<.1&&(f.air||f.type==='landing'))f.x=r.x;
 });
 if([2,7,8].includes(index))for(const d of index===2?[1800,4700]:index===7?[2500,5000]:[3100]){
  add('stream',d,0,{span:65});add('ramp',d-55,-.5,{style:'simple',width:.45});trail(d-15,-.5,{air:true});
 }
 add('finish',c.length);
 return out.sort((a,b)=>a.distance-b.distance);
}
globalThis.RumbleTour={circuits,build};
})();
