/* Parkstadt Karlshorst: OSM footprints, courtyard holes, storey tags and tree
   positions. Setbacks, facade finishes and balconies are authored approximations
   from ENS Architekten / PORR photographs, never claimed as survey geometry. */
window.BerlinParkstadt={
 contains(f){return f.district==='parkstadt'&&f.setbacks?.length>0;},
 build({T,scene,map,buildings,environment,box,tree,obstacles}){
  const root=new T.Group();root.name='Parkstadt Karlshorst';scene.add(root);
  const stats={buildings:0,mappedStoreys:0,estimatedStoreys:0,mappedTrees:0,windows:0,balconies:0},positions=[],colors=[];
  const M=environment.materials,glass=environment.surface('#416d83',{roughness:.32}),frame=environment.surface('#657576'),cream=environment.surface('#f1ede0'),railing=environment.surface('#7f969c');
  const inside=(p,ring)=>{let yes=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++){const a=ring[i],b=ring[j];if((a[1]>p[1])!==(b[1]>p[1])&&p[0]<(b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0])yes=!yes;}return yes;};
  function triangle(a,b,c,color){const shade=new T.Color(color);positions.push(...a,...b,...c);for(let i=0;i<3;i++)colors.push(shade.r,shade.g,shade.b);}
  function roof(f,y,color){const rings=[f.p,...(f.holes||[])],all=rings.flat(),tris=T.ShapeUtils.triangulateShape(f.p.map(p=>new T.Vector2(...p)),rings.slice(1).map(r=>r.map(p=>new T.Vector2(...p))));for(const t of tris)triangle(...[t[0],t[2],t[1]].map(i=>[all[i][0],y,all[i][1]]),color);}
  function walls(f,bottom,top,color,floors,balconies=false){
   for(const [ri,ring] of [f.p,...(f.holes||[])].entries())for(let i=0;i<ring.length;i++){
    const a=ring[i],b=ring[(i+1)%ring.length],dx=b[0]-a[0],dz=b[1]-a[1],length=Math.hypot(dx,dz);if(length<.05)continue;
    triangle([a[0],bottom,a[1]],[b[0],bottom,b[1]],[b[0],top,b[1]],color);triangle([a[0],bottom,a[1]],[b[0],top,b[1]],[a[0],top,a[1]],color);
    const angle=-Math.atan2(dz,dx),ux=dx/length,uz=dz/length,mx=(a[0]+b[0])/2,mz=(a[1]+b[1])/2;
    // Determine the exterior side geometrically, including courtyard walls.
    const probe=[mx-uz*.1,mz+ux*.1],solid=inside(probe,f.p)&&!(f.holes||[]).some(r=>inside(probe,r)),sign=solid?-1:1,nx=-uz*sign,nz=ux*sign;
    box(mx,top+.06,mz,length,.13,.13,cream,angle,false);
    const bays=Math.floor(length/1.65),step=length/Math.max(1,bays),floorHeight=(top-bottom)/floors;
    for(let j=0;j<bays;j++){
     const x=a[0]+ux*(j+.5)*step+nx*.045,z=a[1]+uz*(j+.5)*step+nz*.045;
     for(let level=0;level<floors;level++){
      const y=bottom+(level+.52)*floorHeight,ww=Math.min(.56,step*.43),hh=Math.min(.74,floorHeight*.69);
      box(x,y,z,ww+.09,hh+.08,.07,frame,angle,false);box(x+nx*.045,y,z+nz*.045,ww,hh,.05,glass,angle,false);stats.windows++;
      box(x,y-hh*.5-.025,z,ww+.13,.055,.15,cream,angle,false);
      if(balconies&&ri===0&&length>8&&j%4===2&&level>0&&level<floors-1){
       const bx=x+nx*.32,bz=z+nz*.32,by=bottom+level*floorHeight+.04;
       box(bx,by,bz,.95,.09,.65,cream,angle);box(x+nx*.62,by+.26,z+nz*.62,.95,.06,.055,railing,angle,false);
       for(const side of [-1,1])box(bx+ux*.44*side,by+.26,bz+uz*.44*side,.055,.06,.65,railing,angle,false);stats.balconies++;
      }
     }
    }
   }
  }
  for(const f of buildings){
   if(!window.BerlinParkstadt.contains(f))continue;
   const floors=f.floors||5,top=f.h,baseHeight=top-top/floors;
   const north=f.z<1492,color=north?['#f1eade','#e0ddd3','#dfceb6'][f.id%3]:['#b99a88','#ac8276','#d8c5af'][f.id%3];
   walls(f,.25,baseHeight,color,floors-1,true);roof(f,baseHeight+.025,'#aebcb1');
   // Courtyard gardens use the mapped openings; mapped paths render above the
   // lawn. Garden finish is authored, not an invented building footprint.
   for(const p of f.holes||[])roof({p},.055,'#91b85d');
   for(const inset of f.setbacks){walls(inset,baseHeight,top,'#eee9d9',1);roof(inset,top+.025,'#87a56e');}
   obstacles.push({x:f.x,z:f.z,w:f.w+1,d:f.d+1,h:top+.5});stats.buildings++;stats[f.heightSource==='estimated'?'estimatedStoreys':'mappedStoreys']++;
  }
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('color',new T.Float32BufferAttribute(colors,3));g.computeVertexNormals();g.computeBoundingSphere();
  const mesh=new T.Mesh(g,new T.MeshStandardMaterial({vertexColors:true,roughness:.94,side:T.DoubleSide}));mesh.castShadow=true;mesh.receiveShadow=true;root.add(mesh);
  const local=buildings.filter(f=>f.district==='parkstadt');
  for(const p of map.parkstadt?.nodes||[]){
   if(p.kind==='tree'){
    if(local.some(f=>inside([p.x,p.z],f.p)&&!(f.holes||[]).some(r=>inside([p.x,p.z],r))))continue;
    tree(p.x,p.z,2.5+(p.id%11)*.11,p.id%6,true);stats.mappedTrees++;
   }else if(p.kind==='bench'){
    box(p.x,.24,p.z,1,.12,.35,M.trunk);box(p.x,.45,p.z+.15,1,.35,.08,M.trunk);
   }
  }
  return {root,stats,update(camera,radius){const center=map.parkstadt?.p?.[0]||[3150,1520];root.visible=Math.hypot(camera.position.x-center[0],camera.position.z-center[1])<radius+230;}};
 }
};
