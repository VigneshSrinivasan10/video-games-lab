/* Dense mapped groves. Pure planning keeps the runtime to fixed mesh instances. */
window.CityPlanting={plan({features,buildings,limit=14000,avenueLimit=1000,cityId='berlin',focuses=[],exclude=()=>false}){
 let seed=20261024;const rand=()=>((seed=Math.imul(seed,1664525)+1013904223>>>0)/4294967296);
 const inside=(p,ring)=>{let yes=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++){const a=ring[i],b=ring[j];if((a[1]>p[1])!==(b[1]>p[1])&&p[0]<(b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0])yes=!yes;}return yes;};
 const bounds=f=>{const xs=f.p.map(p=>p[0]),zs=f.p.map(p=>p[1]);return [Math.min(...xs),Math.min(...zs),Math.max(...xs),Math.max(...zs)];};
 const roads=new Map(),walls=new Map(),open=new Map(),key=(x,z)=>Math.floor(x/40)+':'+Math.floor(z/40);
 function index(map,b,item){for(let x=Math.floor(b[0]/40);x<=Math.floor(b[2]/40);x++)for(let z=Math.floor(b[1]/40);z<=Math.floor(b[3]/40);z++){const k=x+':'+z;if(!map.has(k))map.set(k,[]);map.get(k).push(item);}}
 for(const f of buildings){const b=bounds(f);index(walls,[b[0]-1.3,b[1]-1.3,b[2]+1.3,b[3]+1.3],b);}
 for(const f of features){
  // Sports pitches may overlap a larger parent park polygon.
  if(f.k==='water'||f.pitch)index(open,bounds(f),f);
  if(!['road','runway','rail'].includes(f.k))continue;
  for(let i=1;i<f.p.length;i++){const a=f.p[i-1],b=f.p[i],r=(f.w||1)/2+.9;index(roads,[Math.min(a[0],b[0])-r,Math.min(a[1],b[1])-r,Math.max(a[0],b[0])+r,Math.max(a[1],b[1])+r],{a,b,r});}
 }
 function clear(p){
  const k=key(...p);
  if((walls.get(k)||[]).some(b=>p[0]>b[0]-1.3&&p[0]<b[2]+1.3&&p[1]>b[1]-1.3&&p[1]<b[3]+1.3))return false;
  if((open.get(k)||[]).some(f=>inside(p,f.p)&&!(f.holes||[]).some(r=>inside(p,r))))return false;
  return !(roads.get(k)||[]).some(({a,b,r})=>{const dx=b[0]-a[0],dz=b[1]-a[1],t=Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dz)/(dx*dx+dz*dz||1)));return Math.hypot(p[0]-a[0]-t*dx,p[1]-a[1]-t*dz)<r;});
 }
 const berlin=cityId==='berlin',airfield=(x,z)=>berlin&&x>100&&x<1050&&z>1550;
 const candidates=[];
 for(const f of features){
  if(f.k!=='park'||f.pitch||(!berlin&&!f.trees))continue;
  const [x0,z0,x1,z1]=bounds(f),central=berlin?x0<140&&x1>-1100&&z0<650&&z1>-180:focuses.some(p=>p.x>x0-100&&p.x<x1+100&&p.z>z0-100&&p.z<z1+100);
  // Adapt the spacing to cover a whole large park. The old attempt cap stopped
  // midway across big parks, leaving the rest of the mapped grass empty.
  const spacing=Math.max(central?3.7:6,Math.sqrt((x1-x0)*(z1-z0)/18000));
  for(let x=x0+spacing/2;x<x1;x+=spacing)for(let z=z0+spacing/2;z<z1;z+=spacing){
   const p=[x+(rand()-.5)*spacing*.8,z+(rand()-.5)*spacing*.8];
   const density=(central?.79:.65)+.16*Math.sin(x*.027)*Math.cos(z*.033);
   if(rand()>density||!inside(p,f.p)||(f.holes||[]).some(r=>inside(p,r))||!clear(p))continue;
   // Retain the open former airfield and its sightseeing takeoff/landing route.
   if(airfield(...p)||exclude(...p))continue;
   candidates.push({x:p[0],z:p[1],h:6+rand()*5,variant:Math.floor(rand()*6),central,rank:rand()*(central?.42:1)});
  }
 }
 candidates.sort((a,b)=>a.rank-b.rank);
 const occupied=new Map(),trees=[];
 for(const p of candidates){
  const x=Math.floor(p.x/2.4),z=Math.floor(p.z/2.4);let close=false;
  for(let dx=-1;dx<=1;dx++)for(let dz=-1;dz<=1;dz++)if((occupied.get((x+dx)+':'+(z+dz))||[]).some(q=>Math.hypot(p.x-q.x,p.z-q.z)<2.4))close=true;
  if(close)continue;const k=x+':'+z;if(!occupied.has(k))occupied.set(k,[]);occupied.get(k).push(p);trees.push(p);if(trees.length===limit)break;
 }
 // Street trees sit beyond the pavement, with room for walking routes. Check
 // each bed's perimeter against every mapped road, building and water polygon.
 const streetCandidates=[],avenues=[];
 const district=(x,z)=>berlin&&x>-100&&x<160&&z>90&&z<230;
 for(const f of features){
  if(f.k!=='road'||f.bridge||![3.5,4.2,5,6,7].includes(f.w))continue;
  for(let i=1;i<f.p.length;i++){
   const a=f.p[i-1],b=f.p[i],length=Math.hypot(b[0]-a[0],b[1]-a[1]);if(length<27)continue;
   const dx=(b[0]-a[0])/length,dz=(b[1]-a[1])/length;
   for(let d=9;d<length-9;d+=12)for(const side of [-1,1]){
    const x=a[0]+dx*d-dz*side*(f.w/2+2.4),z=a[1]+dz*d+dx*side*(f.w/2+2.4);
    if(district(x,z)||airfield(x,z)||exclude(x,z))continue;
    const footprint=[[0,0],[1.8,.65],[-1.8,.65],[1.8,-.65],[-1.8,-.65]];
    if(!footprint.every(([u,v])=>clear([x+dx*u-dz*v,z+dz*u+dx*v])))continue;
    const central=berlin?x>-1100&&x<900&&z>-500&&z<650:focuses.some(p=>Math.hypot(x-p.x,z-p.z)<220);
    streetCandidates.push({x,z,dx,dz,side,h:4.4+rand()*1.8,variant:Math.floor(rand()*6),central,rank:rand()*(central?.2:1)});
   }
  }
 }
 streetCandidates.sort((a,b)=>a.rank-b.rank);
 for(const p of streetCandidates){
  if(avenues.length>=avenueLimit)break;
  const x=Math.floor(p.x/2.4),z=Math.floor(p.z/2.4);let close=false;
  for(let dx=-3;dx<=3;dx++)for(let dz=-3;dz<=3;dz++)if((occupied.get((x+dx)+':'+(z+dz))||[]).some(q=>Math.hypot(p.x-q.x,p.z-q.z)<(q.street?6:3.1)))close=true;
  if(close)continue;const k=x+':'+z;if(!occupied.has(k))occupied.set(k,[]);p.street=true;occupied.get(k).push(p);avenues.push(p);
 }
 return {trees,avenues,stats:{trees:trees.length,centralTrees:trees.filter(p=>p.central).length,candidates:candidates.length,limit,streetTrees:avenues.length,centralStreetTrees:avenues.filter(p=>p.central).length}};
}};
