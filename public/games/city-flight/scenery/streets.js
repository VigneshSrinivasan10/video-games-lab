/* Street activity follows mapped roads and footways. Fixed instance pools keep
   animation inexpensive; Venice uses pedestrians and boats instead of cars. */
window.CityStreets={build({T,scene,environment,features,box,buildings,landmarks=[],cityId='berlin',waterLevel=-1.15,exclude=()=>false}){
 const lively=environment.aesthetic==='illustrated';
 const stats={crossings:0,parkedCars:0,shelters:0,movingCars:0,buses:0,pedestrians:0,boats:0,nearbyActors:0};
 const hash=(x,z)=>Math.abs(Math.sin(x*12.9898+z*78.233)*43758.5453)%1,clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
 const inside=(x,z,p)=>{let yes=false;for(let i=0,j=p.length-1;i<p.length;j=i++){const a=p[i],b=p[j];if((a[1]>z)!==(b[1]>z)&&x<(b[0]-a[0])*(z-a[1])/(b[1]-a[1])+a[0])yes=!yes;}return yes;};
 const buildingCells=new Map(),waterCells=new Map(),cell=(x,z)=>Math.floor(x/80)+':'+Math.floor(z/80);
 function index(map,item,x0,z0,x1,z1){for(let x=Math.floor(x0/80);x<=Math.floor(x1/80);x++)for(let z=Math.floor(z0/80);z<=Math.floor(z1/80);z++){const key=x+':'+z;if(!map.has(key))map.set(key,[]);map.get(key).push(item);}}
 for(const f of buildings)index(buildingCells,f,f.x-f.w-1,f.z-f.d-1,f.x+f.w+1,f.z+f.d+1);
 for(const f of features)if(f.k==='water'){const xs=f.p.map(p=>p[0]),zs=f.p.map(p=>p[1]);index(waterCells,f,Math.min(...xs),Math.min(...zs),Math.max(...xs),Math.max(...zs));}
 const wet=(x,z)=>(waterCells.get(cell(x,z))||[]).some(f=>inside(x,z,f.p)&&!(f.holes||[]).some(p=>inside(x,z,p)));
 const blocked=(x,z)=>(buildingCells.get(cell(x,z))||[]).some(f=>inside(x,z,f.p)&&!(f.holes||[]).some(p=>inside(x,z,p)));
 const clear=(x,z,r=.4,bridge=false)=>!exclude(x,z)&&[[0,0],[r,0],[-r,0],[0,r],[0,-r]].every(([dx,dz])=>!blocked(x+dx,z+dz)&&(bridge||!wet(x+dx,z+dz)));
 const near=(x,z,r=520)=>!landmarks.length||landmarks.some(l=>Math.hypot(x-l.x,z-l.z)<r);
 const motorRoad=f=>f.k==='road'&&[3.5,4.2,5,6,7].includes(f.w)&&cityId!=='venice';
 const streetSites=[],carRoutes=[],walkRoutes=[],boatRoutes=[];
 // Round mapped corners locally; keep endpoints inset so turning loops stay
 // within the road surface instead of jumping back to the start of a segment.
 function path(points,width,y,bridge=false){
  const smooth=[points[0]];
  for(let i=1;i<points.length-1;i++){
   const a=points[i-1],b=points[i],c=points[i+1],la=Math.hypot(b[0]-a[0],b[1]-a[1]),lc=Math.hypot(c[0]-b[0],c[1]-b[1]);if(la<.01||lc<.01)continue;
   const r=Math.min(width*.24,la*.23,lc*.23),u=[b[0]+(a[0]-b[0])*r/la,b[1]+(a[1]-b[1])*r/la],v=[b[0]+(c[0]-b[0])*r/lc,b[1]+(c[1]-b[1])*r/lc];
   for(let j=0;j<=4;j++){const t=j/4;smooth.push([(1-t)**2*u[0]+2*(1-t)*t*b[0]+t*t*v[0],(1-t)**2*u[1]+2*(1-t)*t*b[1]+t*t*v[1]]);}
  }
  smooth.push(points.at(-1));const segments=[];let length=0;
  for(let i=1;i<smooth.length;i++){const a=smooth[i-1],b=smooth[i],d=Math.hypot(b[0]-a[0],b[1]-a[1]);if(d<.01)continue;segments.push({x:a[0],z:a[1],dx:(b[0]-a[0])/d,dz:(b[1]-a[1])/d,start:length,end:length+d});length+=d;}
  if(length<12)return null;
  return {segments,length,width,y,bridge,x:(points[0][0]+points.at(-1)[0])/2,z:(points[0][1]+points.at(-1)[1])/2};
 }
 function at(p,d,out){const s=p.segments.find(s=>s.end>=d)||p.segments.at(-1),t=clamp(d-s.start,0,s.end-s.start);out.x=s.x+s.dx*t;out.z=s.z+s.dz*t;out.dx=s.dx;out.dz=s.dz;out.y=p.y;return out;}
 const scratch={};
 function loop(p,d,lane,out){
  const inset=Math.max(2.5,Math.abs(lane)+1.3),straight=p.length-inset*2,arc=Math.PI*Math.abs(lane),cycle=2*(straight+arc);d=((d%cycle)+cycle)%cycle;
  if(d<straight){at(p,inset+d,out);out.x-=out.dz*lane;out.z+=out.dx*lane;}
  else if(d<straight+arc){at(p,p.length-inset,out);const a=(d-straight)/Math.abs(lane),dx=out.dx,dz=out.dz;out.x+=-dz*lane*Math.cos(a)+dx*Math.abs(lane)*Math.sin(a);out.z+=dx*lane*Math.cos(a)+dz*Math.abs(lane)*Math.sin(a);out.dx=dx*Math.cos(a)+dz*Math.sign(lane)*Math.sin(a);out.dz=dz*Math.cos(a)-dx*Math.sign(lane)*Math.sin(a);}
  else if(d<straight*2+arc){at(p,p.length-inset-(d-straight-arc),out);out.x+=out.dz*lane;out.z-=out.dx*lane;out.dx*=-1;out.dz*=-1;}
  else {at(p,inset,out);const a=(d-straight*2-arc)/Math.abs(lane),dx=out.dx,dz=out.dz;out.x+=dz*lane*Math.cos(a)-dx*Math.abs(lane)*Math.sin(a);out.z+=-dx*lane*Math.cos(a)-dz*Math.abs(lane)*Math.sin(a);out.dx=-dx*Math.cos(a)-dz*Math.sign(lane)*Math.sin(a);out.dz=-dz*Math.cos(a)+dx*Math.sign(lane)*Math.sin(a);}
  return out;
 }
 const cycleLength=(p,lane)=>2*(p.length-Math.max(2.5,Math.abs(lane)+1.3)*2+Math.PI*Math.abs(lane));
 function validLoop(p,lane,water=false){const length=cycleLength(p,lane);for(let d=0;d<length;d+=.3){loop(p,d,lane,scratch);if(water?![[0,0],[.8,0],[-.8,0],[0,.8],[0,-.8]].every(([x,z])=>wet(scratch.x+x,scratch.z+z)):!clear(scratch.x,scratch.z,.45,p.bridge))return false;}return true;}
 for(const f of features){
  if(f.k!=='road'||f.p.length<2)continue;
  if(motorRoad(f)&&!f.bridge)for(let i=1;i<f.p.length;i++){
   const a=f.p[i-1],b=f.p[i],dx=b[0]-a[0],dz=b[1]-a[1],length=Math.hypot(dx,dz),x=(a[0]+b[0])/2,z=(a[1]+b[1])/2;
   if(length<18||length>90||!near(x,z)||!clear(x,z,.5))continue;
   streetSites.push({x,z,dx:dx/length,dz:dz/length,w:f.w,rank:hash(x,z)});
  }
  // Only inspect local route candidates. Long ways are split into manageable
  // stretches, so scenery is distributed across the tour instead of one road.
  let points=[f.p[0]],length=0;
  function consider(points,length){
   if(length<16)return;const mid=points[Math.floor(points.length/2)];if(!near(...mid)||exclude(...mid))return;
   if(motorRoad(f)&&length>35)carRoutes.push({points,width:f.w,y:f.bridge?2.3:.16,bridge:f.bridge,x:mid[0],z:mid[1],rank:hash(...mid)});
   if(!f.bridge&&f.w<=6&&length>16)walkRoutes.push({points,width:f.w,y:f.w<2?.1:.16,x:mid[0],z:mid[1],rank:hash(mid[1],mid[0]),foot:f.w<2||f.w===4});
  }
  for(let i=1;i<f.p.length;i++){const a=f.p[i-1],b=f.p[i],d=Math.hypot(b[0]-a[0],b[1]-a[1]);const steps=Math.max(1,Math.ceil(d/100));for(let j=1;j<=steps;j++){const q=[a[0]+(b[0]-a[0])*j/steps,a[1]+(b[1]-a[1])*j/steps];length+=Math.hypot(q[0]-points.at(-1)[0],q[1]-points.at(-1)[1]);points.push(q);if(length>150){consider(points,length);points=[q];length=0;}}}consider(points,length);
 }
 streetSites.sort((a,b)=>a.rank-b.rank);const used=[];
 for(const p of streetSites){if(used.length>=(lively?64:28))break;if(used.some(q=>Math.hypot(q.x-p.x,q.z-p.z)<(lively?60:85)))continue;used.push(p);
  const {x,z,dx,dz,w}=p,angle=-Math.atan2(dz,dx);
  for(let offset=-w/2+.4;offset<w/2-.2;offset+=.65)box(x-dz*offset,.19,z+dx*offset,2.5,.025,.3,lively?'#f3f4e9':'#d5d2bd',angle,false);stats.crossings++;
  for(const side of [-1,1])for(let j=0;j<2;j++){
   const px=x+dx*(5+j*3)-dz*side*(w/2+.4),pz=z+dz*(5+j*3)+dx*side*(w/2+.4);if(!clear(px,pz,.65))continue;
   const paint=(lively?['#f3f4e9','#e9bd43','#579bb6','#d56c53']:['#747f79','#af9b80','#6a8391','#ab7356'])[(used.length+j+(side===1?1:0))%4];box(px,.43,pz,1.65,.48,.72,paint,angle);box(px,.75,pz,.85,.25,.65,'#59686b',angle);stats.parkedCars++;
  }
  const sx=x-dx*5-dz*(w/2+1.1),sz=z-dz*5+dx*(w/2+1.1);
  if(used.length%3===0&&clear(sx,sz,1.1)){
   for(const t of [-1,1])box(sx+dx*t,.85,sz+dz*t,.06,1.5,.06,'#61706b',0,false);
   box(sx,1.65,sz,2.5,.12,1.2,'#a6b4aa',angle);box(sx,.44,sz,1.7,.12,.35,'#8b7860',angle,false);stats.shelters++;
  }
 }
 const actors=[],pools=[],cube=new T.BoxGeometry(1,1,1),head=new T.SphereGeometry(1,7,5),dummy=new T.Object3D();let clock=0,lastTime=null;
 function pool(geometry,material,count,colored=false){const mesh=new T.InstancedMesh(geometry,material,count);mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);mesh.frustumCulled=false;mesh.castShadow=false;mesh.receiveShadow=true;if(colored)for(let i=0;i<count;i++)mesh.setColorAt(i,new T.Color('#ffffff'));scene.add(mesh);pools.push(mesh);return mesh;}
 carRoutes.sort((a,b)=>a.rank-b.rank);walkRoutes.sort((a,b)=>a.rank-b.rank);
 if(cityId==='venice')for(const f of walkRoutes)f.open=[[6,0],[-6,0],[0,6],[0,-6]].filter(([x,z])=>!blocked(f.x+x,f.z+z)).length;
 // Prefer open quays and squares in Venice, where narrow alleys hide walkers.
 if(cityId==='venice')for(const f of walkRoutes)f.open=[[8,0],[-8,0],[0,8],[0,-8]].filter(([x,z])=>!blocked(f.x+x,f.z+z)).length;
 // Validate before reserving a district's quota. A rejected path must not
 // silently leave that entire stop empty. Include several nearby streets.
 function choose(candidates,cap,separation,make,quota=4){
  const chosen=[],sources=[],checked=new Map();
  function add(f){if(sources.some(q=>Math.hypot(q.x-f.x,q.z-f.z)<separation))return false;if(!checked.has(f))checked.set(f,make(f));const p=checked.get(f);if(!p)return false;sources.push(f);chosen.push(p);return true;}
  for(const l of landmarks){let count=0;const nearby=candidates.filter(f=>Math.hypot(f.x-l.x,f.z-l.z)<220).sort((a,b)=>Math.hypot(a.x-l.x,a.z-l.z)-(a.open||0)*20-Math.hypot(b.x-l.x,b.z-l.z)+(b.open||0)*20);for(const f of nearby){if(chosen.length>=cap)break;if(add(f)&&++count>=quota)break;}}
  for(const f of candidates){if(chosen.length>=cap)break;add(f);}return chosen;
 }
 const vehiclePaths=choose(carRoutes,144,16,f=>{const p=path(f.points,f.width,f.y,f.bridge),lane=f.width*.22*(cityId==='london'||cityId==='bengaluru'?-1:1);return p&&validLoop(p,lane)?{p,lane}:null;});
 const walkPaths=choose(walkRoutes,160,9,f=>{
  for(const side of f.foot?[0]:[-1,1]){const points=f.points.map((a,i)=>{const b=f.points[Math.min(i+1,f.points.length-1)],prev=f.points[Math.max(0,i-1)],dx=b[0]-prev[0],dz=b[1]-prev[1],d=Math.hypot(dx,dz)||1,offset=side*(f.width/2+.65);return [a[0]-dz/d*offset,a[1]+dx/d*offset];}),p=path(points,.6,f.y);if(p&&validLoop(p,.12))return p;}return null;
 });
 const boatCandidates=[];
 // Canal banks are the inner island boundaries of Venice's lagoon polygon.
 // Following only its outer contour puts every boat out on the lagoon.
 if(cityId==='venice')for(const f of features){if(f.k!=='water')continue;for(const contour of [f.p,...(f.holes||[])])for(let i=0;i<contour.length;i++){
  const a=contour[i],b=contour[(i+1)%contour.length],dx=b[0]-a[0],dz=b[1]-a[1],d=Math.hypot(dx,dz);if(d<24||d>160)continue;
  const x=(a[0]+b[0])/2,z=(a[1]+b[1])/2;if(near(x,z,340))boatCandidates.push({a,b,dx,dz,d,x,z});
 }}
 boatRoutes.push(...choose(boatCandidates,64,18,({a,b,dx,dz,d})=>{for(const offset of [4,-4,7,-7,2,-2]){const p=path([[a[0]-dz/d*offset,a[1]+dx/d*offset],[b[0]-dz/d*offset,b[1]+dx/d*offset]],4,waterLevel);if(p&&validLoop(p,.7,true))return p;}return null;},2));
 const vehiclesPerPath=6,walkersPerPath=5,carCount=vehiclePaths.length*vehiclesPerPath,walkerCount=walkPaths.length*walkersPerPath,boatCount=boatRoutes.length;
 const paint=environment.surface('#ffffff'),glass=environment.surface('#526c75',{roughness:.35}),dark=environment.surface('#343e3d');
 const carBody=pool(cube,paint,carCount,true),carCab=pool(cube,glass,carCount),carBase=pool(cube,dark,carCount);
 const people=pool(cube,paint,walkerCount,true),heads=pool(head,environment.surface('#c6ab88'),walkerCount);
 const boatBody=pool(new T.SphereGeometry(1,10,6),paint,boatCount,true),boatCab=pool(cube,glass,boatCount);
 const carRoof=pool(cube,paint,carCount,true),legs=pool(cube,dark,walkerCount*2);
 const wakeGeometry=new T.BufferGeometry();wakeGeometry.setAttribute('position',new T.Float32BufferAttribute([0,0,0,-1,0,.5,-.6,0,.14,0,0,0,-.6,0,-.14,-1,0,-.5],3));
 const wakes=pool(wakeGeometry,new T.MeshBasicMaterial({color:'#e2eade',transparent:true,opacity:.42,depthWrite:false,side:T.DoubleSide}),boatCount);
 const busRoofUnits=lively?pool(cube,environment.surface('#a5bac4'),carCount):null;if(busRoofUnits)busRoofUnits.userData.streetKind='vehicle';
 for(const mesh of [carBody,carCab,carBase,carRoof])mesh.userData.streetKind='vehicle';for(const mesh of [people,heads,legs])mesh.userData.streetKind='person';for(const mesh of [boatBody,boatCab,wakes])mesh.userData.streetKind='boat';
 for(const [i,{p,lane}] of vehiclePaths.entries())for(let j=0;j<vehiclesPerPath;j++){
  const index=i*vehiclesPerPath+j,bus=(j===0&&p.width>=5)||(lively&&j===3&&p.width>=6),color=bus?(cityId==='berlin'?'#e8b82f':cityId==='london'?'#c33b30':'#df6248'):['#fff1d9','#e7bd39','#b83e32','#4b94ad','#d5e0de','#436cba'][(i+j)%6];carBody.setColorAt(index,new T.Color(color));carRoof.setColorAt(index,new T.Color(bus?(cityId==='berlin'?'#f2c84c':'#fff2d6'):color));
  actors.push({kind:bus?'bus':'car',p,lane,index,phase:cycleLength(p,lane)*(j/vehiclesPerPath+hash(p.x,p.z)*.13),speed:3.2+hash(p.z,p.x)*1.3});stats[bus?'buses':'movingCars']++;
 }
 for(const [i,p] of walkPaths.entries())for(let j=0;j<walkersPerPath;j++){const index=i*walkersPerPath+j;people.setColorAt(index,new T.Color(['#ce4635','#f1d05b','#3b88c4','#70a45b','#b85c9a'][(i+j)%5]));actors.push({kind:'person',p,lane:.12,index,phase:cycleLength(p,.12)*((j<3?.18:.68)+hash(p.x,p.z)*.16)+(j%3)*.85,speed:.44+hash(p.z,p.x)*.14});stats.pedestrians++;}
 for(const [index,p] of boatRoutes.entries()){boatBody.setColorAt(index,new T.Color(index%3?'#ddc293':'#f5f1dc'));actors.push({kind:'boat',p,lane:.7,index,phase:hash(p.x,p.z)*cycleLength(p,.7),speed:1.5});stats.boats++;}
 const pose={};
 function put(mesh,index,x,y,z,sx,sy,sz,angle,visible){dummy.position.set(x,y,z);dummy.rotation.set(0,angle,0);dummy.scale.set(visible?sx:0,visible?sy:0,visible?sz:0);dummy.updateMatrix();mesh.setMatrixAt(index,dummy.matrix);}
 function update(camera,quality,time,moving=true){if(lastTime!==null&&moving)clock+=Math.max(0,time-lastTime);lastTime=time;const radius=quality==='High'?1200:quality==='Performance'?650:900;stats.nearbyActors=0;
  for(const a of actors){loop(a.p,a.phase+clock*a.speed,a.lane,pose);const {x,y,z,dx,dz}=pose,angle=-Math.atan2(dz,dx),visible=!camera||Math.hypot(x-camera.position.x,z-camera.position.z)<radius;if(visible)stats.nearbyActors++;
   if(a.kind==='person'){const stride=Math.sin(clock*6+a.index)*.12,bob=Math.abs(stride)*.15;put(people,a.index,x,y+.55+bob,z,.31,.55,.29,angle,visible);put(heads,a.index,x,y+.98+bob,z,.15,.16,.15,angle,visible);for(let j=0;j<2;j++){const side=j?1:-1;put(legs,a.index*2+j,x-dz*side*.09+dx*stride*side,y+.18,z+dx*side*.09+dz*stride*side,.11,.32,.12,angle,visible);}}
   else if(a.kind==='boat'){put(boatBody,a.index,x,y+.32,z,2.15,.36,.62,angle,visible);put(boatCab,a.index,x-.2*dx,y+.7,z-.2*dz,1.8,.5,.88,angle,visible);put(wakes,a.index,x-dx*1.5,y+.05,z-dz*1.5,6,1,2.8,angle,visible);}
   else {const bus=a.kind==='bus';if(busRoofUnits)put(busRoofUnits,a.index,x,y+1.44,z,1.35,.24,.75,angle,visible&&bus);put(carBody,a.index,x,y+(bus?.7:.4),z,bus?4.6:2.2,bus?1:.5,bus?1.12:.95,angle,visible);put(carCab,a.index,x,y+(bus?1.03:.77),z,bus?3.9:1.15,bus?.44:.31,bus?1.14:.85,angle,visible);put(carRoof,a.index,x,y+(bus?1.29:.96),z,bus?4:1.25,.08,bus?1.2:.91,angle,visible);put(carBase,a.index,x,y+.17,z,bus?4.65:2.25,.18,bus?1.16:1.02,angle,visible);}
  }
  for(const mesh of pools)mesh.instanceMatrix.needsUpdate=true;
 }
 update(null,'High',0,false);
 function audit(){const invalid=[];for(const a of actors){loop(a.p,a.phase+clock*a.speed,a.lane,pose);if(!Number.isFinite(pose.x+pose.y+pose.z))invalid.push('nonfinite '+a.kind);else if(a.kind==='boat'?!wet(pose.x,pose.z):!clear(pose.x,pose.z,.25,a.p.bridge))invalid.push({kind:a.kind,x:pose.x,z:pose.z});}return {actors:actors.length,invalid};}
 return {stats,update,audit,sample:()=>actors.filter((a,i)=>i<12||a.kind==='boat').map(a=>{const p=loop(a.p,a.phase+clock*a.speed,a.lane,{});return {kind:a.kind,x:p.x,y:p.y,z:p.z};}),views:[...vehiclePaths.map(({p})=>p),...walkPaths,...boatRoutes].slice(0,12).map(p=>({x:p.x,z:p.z}))};
}};
