/* Scenic rail shuttles. S-Bahn follows mapped surface rails; the U-Bahn preview
   uses the existing Oberbaum upper deck. Colours follow the user's art direction. */
window.CityTransit={
 plan({features,landmarks=[],metro,limit=12,cityId='berlin'}){
  const nodes=new Map(),edges=[],used=new Set(),routes=[];
  function node(p,y){const key=p[0].toFixed(1)+':'+p[1].toFixed(1);if(!nodes.has(key))nodes.set(key,{x:p[0],z:p[1],y,edges:[]});const n=nodes.get(key);n.y=Math.max(n.y,y);return n;}
  for(const f of features){if(f.k!=='rail'||f.service||f.usage==='industrial')continue;for(let i=1;i<f.p.length;i++){
   const a=node(f.p[i-1],f.bridge?2.34:.24),b=node(f.p[i],f.bridge?2.34:.24),length=Math.hypot(b.x-a.x,b.z-a.z);if(length<.1)continue;
   const e={a,b,length};a.edges.push(e);b.edges.push(e);edges.push(e);
  }}
  function route(seed){
   if(used.has(seed))return null;
   const points=[seed.a,seed.b],taken=new Set([seed]);
   function extend(front){let length=0;while(length<260){
    const a=front?points[1]:points.at(-2),b=front?points[0]:points.at(-1),dx=b.x-a.x,dz=b.z-a.z,dist=Math.hypot(dx,dz);let best=null,score=.35;
    for(const e of b.edges){if(taken.has(e)||used.has(e))continue;const c=e.a===b?e.b:e.a,dot=(dx*(c.x-b.x)+dz*(c.z-b.z))/(dist*e.length);if(dot>score){best={e,c};score=dot;}}
    if(!best)break;taken.add(best.e);length+=best.e.length;if(front)points.unshift(best.c);else points.push(best.c);
   }}
   extend(false);extend(true);
   const result=make(points,cityId==='berlin'?'sbahn':'rail',3);if(result.length<110)return null;
   for(const e of taken)used.add(e);return result;
  }
  const anchors=landmarks.length?landmarks:[{x:0,z:0}];
  for(const l of anchors){
   if(routes.length>=limit)break;
   const nearby=edges.filter(e=>!used.has(e)&&Math.hypot((e.a.x+e.b.x)/2-l.x,(e.a.z+e.b.z)/2-l.z)<270).sort((a,b)=>Math.hypot(a.a.x-l.x,a.a.z-l.z)-Math.hypot(b.a.x-l.x,b.a.z-l.z));
   for(const seed of nearby){if(routes.some(r=>Math.hypot(r.anchor.x-seed.a.x,r.anchor.z-seed.a.z)<95))continue;const r=route(seed);if(r){r.anchor={x:seed.a.x,z:seed.a.z};routes.push(r);break;}}
  }
  if(metro){
   const {x,z,y,angle}=metro,c=Math.cos(angle),s=Math.sin(angle);
   routes.push(make([-26,26].map(u=>({x:x+c*u-s*2.8,z:z-s*u-c*2.8,y})),'ubahn',2));
  }
  function make(points,kind,cars){let length=0;const segments=[];for(let i=1;i<points.length;i++){const a=points[i-1],b=points[i],d=Math.hypot(b.x-a.x,b.z-a.z);segments.push({a,b,start:length,length:d});length+=d;}return {kind,cars,length,segments,anchor:points[Math.floor(points.length/2)]};}
  return routes;
 },
 sample(route,d){d=Math.max(0,Math.min(route.length,d));const s=route.segments.find(s=>s.start+s.length>=d)||route.segments.at(-1),t=(d-s.start)/s.length;return {x:s.a.x+(s.b.x-s.a.x)*t,y:s.a.y+(s.b.y-s.a.y)*t,z:s.a.z+(s.b.z-s.a.z)*t,angle:-Math.atan2(s.b.z-s.a.z,s.b.x-s.a.x)};},
 build({T,scene,environment,features,landmarks,metro,cityId='berlin',limit=12}){
  const api=window.CityTransit,routes=api.plan({features,landmarks,metro,cityId,limit}),stats={trains:routes.length,sbahn:routes.filter(r=>r.kind==='sbahn').length,ubahn:routes.filter(r=>r.kind==='ubahn').length,carriages:routes.reduce((n,r)=>n+r.cars,0),visibleTrains:0};
  const root=new T.Group();root.name=cityId+' rail transit';scene.add(root);
  const cube=new T.BoxGeometry(1,1,1),dummy=new T.Object3D(),pools=[];
  function pool(material,count=stats.carriages,colored=false){const mesh=new T.InstancedMesh(cube,material,count);mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);mesh.castShadow=false;mesh.receiveShadow=true;mesh.frustumCulled=false;mesh.userData.transit=true;if(colored)for(let i=0;i<count;i++)mesh.setColorAt(i,new T.Color(0xffffff));root.add(mesh);pools.push(mesh);return mesh;}
  const body=pool(environment.surface('#ffffff'),stats.carriages,true),lower=pool(environment.materials.ivory),glass=pool(environment.surface('#315f79')),roof=pool(environment.surface('#ffffff'),stats.carriages,true),bogies=pool(environment.materials.dark,stats.carriages*2),doors=pool(environment.surface('#ffffff'),stats.carriages*2,true);
  let index=0;for(const r of routes){r.first=index;r.margin=r.cars===2?9:12;r.span=r.length-r.margin*2;r.period=Math.max(12,2*r.span/5);r.phase=(index*.73+1.2)%(Math.PI*2);for(let j=0;j<r.cars;j++,index++){const c=new T.Color(r.kind==='sbahn'?'#38965c':r.kind==='ubahn'?'#e9bd43':({paris:'#5bafc8',london:'#da5547',rome:'#87b1be',venice:'#87b1be',bengaluru:'#70ae90',dubai:'#80becd'})[cityId]||'#75a6be');body.setColorAt(index,c);roof.setColorAt(index,c.clone().lerp(new T.Color('#f3f4e9'),.18));doors.setColorAt(index*2,c);doors.setColorAt(index*2+1,c);}}
  // Render the selected tracks at the same continuous height as their carriages.
  const deck=[],rails=[];
  function quad(out,a,b,width,offset=0,lift=0){const dx=b.x-a.x,dz=b.z-a.z,d=Math.hypot(dx,dz),nx=-dz/d,nz=dx/d;const points=[[-width/2,a],[width/2,a],[-width/2,b],[width/2,b]].map(([side,p])=>[p.x+nx*(side+offset),p.y+lift,p.z+nz*(side+offset)]);for(const i of [0,2,1,1,2,3])out.push(...points[i]);}
  for(const r of routes){for(const s of r.segments){quad(deck,s.a,s.b,r.kind==='ubahn'?2.3:2.7);for(const side of [-1,1])quad(rails,s.a,s.b,.1,side*.68,.04);}for(let d=1;d<r.length-1;d+=2.5){const a=api.sample(r,d),b=api.sample(r,d+.15);quad(rails,a,b,1.75,0,.025);}}
  for(const [positions,material] of [[deck,environment.surface('#75878a')],[rails,environment.surface('#aebcc2')]]){const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.computeVertexNormals();const mesh=new T.Mesh(g,material);mesh.receiveShadow=true;root.add(mesh);}
  let clock=0,lastTime=null;
  const put=(mesh,i,p,y,sx,sy,sz,visible)=>{dummy.position.set(p.x,p.y+y,p.z);dummy.rotation.set(0,p.angle,0);dummy.scale.set(visible?sx:0,visible?sy:0,visible?sz:0);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);};
  function poses(r){const center=r.margin+r.span*(.5-.5*Math.cos(r.phase+clock*Math.PI*2/r.period));return Array.from({length:r.cars},(_,j)=>api.sample(r,center+(j-(r.cars-1)/2)*7.3));}
  function update(camera,quality,time,moving=true){if(lastTime!==null&&moving)clock+=Math.max(0,time-lastTime);lastTime=time;stats.visibleTrains=0;const radius=quality==='High'?1400:quality==='Performance'?850:1100;
   for(const r of routes){const cars=poses(r),visible=!camera||cars.some(p=>Math.hypot(p.x-camera.position.x,p.z-camera.position.z)<radius);if(visible)stats.visibleTrains++;
    for(const [j,p] of cars.entries()){const i=r.first+j;put(body,i,p,1.05,6.6,1.5,1.25,visible);put(lower,i,p,.47,6.65,.22,1.27,visible);put(glass,i,p,1.35,6.28,.67,1.28,visible);put(roof,i,p,1.85,6.7,.16,1.33,visible);
     for(const side of [-1,1]){const q={...p,x:p.x+Math.cos(p.angle)*side*2.05,z:p.z-Math.sin(p.angle)*side*2.05};put(bogies,i*2+(side===1?1:0),q,.22,1.18,.3,1.3,visible);put(doors,i*2+(side===1?1:0),q,1.2,.48,1.2,1.3,visible);}
    }
   }for(const mesh of pools)mesh.instanceMatrix.needsUpdate=true;
  }
  update(null,'High',0,false);
  function audit(){const invalid=[];for(const [i,r] of routes.entries())for(const p of poses(r)){if(!Number.isFinite(p.x+p.y+p.z))invalid.push(i);else if(!r.segments.some(s=>{const dx=s.b.x-s.a.x,dz=s.b.z-s.a.z,t=Math.max(0,Math.min(1,((p.x-s.a.x)*dx+(p.z-s.a.z)*dz)/(dx*dx+dz*dz)));return Math.hypot(p.x-s.a.x-dx*t,p.z-s.a.z-dz*t)<.001;}))invalid.push(i);}return {invalid};}
  return {stats,update,audit,sample:()=>routes.flatMap(r=>poses(r).map(p=>({kind:r.kind,...p}))),views:routes.map(r=>({kind:r.kind,...api.sample(r,r.length*.5)}))};
 }
};
