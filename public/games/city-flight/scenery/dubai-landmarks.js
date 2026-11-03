/* Original architectural approximations. Metres before the engine's .36 scale;
   source references and the map snapshot are recorded in city-flight.txt. */
window.DubaiLandmarks={build(l,{T,stamp,box,cylinder,beam,texture,environment}){
 const {width:w,depth:d,height:h,kind:k}=l,M=environment.materials;
 if(k==='burjkhalifa'){
  const glass=environment.surface('#83bcc8',{color:'#a1b6bb',metalness:.6,roughness:.3});
  const metal=environment.surface('#c3ccca',{metalness:.8,roughness:.36});
  // Three buttressed wings step back at alternating heights around the core.
  for(let wing=0;wing<3;wing++){
   const a=wing*Math.PI*2/3+.35,top=610-wing*43;
   for(let tier=0;tier<13;tier++){
    const y=tier*top/13,hh=top/13,r=18-tier*.95,reach=40-tier*2.5,x=Math.cos(a)*reach,z=Math.sin(a)*reach;
    cylinder(x,y+hh/2,z,r,hh,glass,r*.97);
    box(x*.5,y+hh/2,z*.5,reach,hh,r*1.8,glass,-a);
    for(let yy=y+4;yy<y+hh;yy+=4)cylinder(x,yy,z,r+.22,.55,metal,r+.22);
    cylinder(x,y+hh,z,r+.3,.8,metal,r+.3);
   }
  }
  for(let tier=0;tier<18;tier++){
   const yy=tier*38,hh=38,r=23-tier*1.03;cylinder(0,yy+hh/2,0,r,hh,glass,r*.98);
   for(let y=yy+4;y<yy+hh;y+=4)cylinder(0,y,0,r+.2,.5,metal);
  }
  cylinder(0,715,0,4.5,62,metal,2.5);cylinder(0,774,0,2.5,56,metal,1.1);cylinder(0,815,0,1.1,26,metal,.12);
  for(let j=0;j<3;j++){const a=j*Math.PI*2/3+.35;cylinder(Math.cos(a)*42,4,Math.sin(a)*42,32,8,M.concrete,29);}
  return true;
 }
 if(k==='futuremuseum'){
  const marks=texture((c,n,m)=>{c.fillStyle='#c9cfca';c.fillRect(0,0,n,m);c.lineCap='round';
   for(let row=0;row<6;row++)for(let j=0;j<12;j++){const x=j*n/12+Math.sin(row+j)*5,y=(row+.5)*m/6;c.strokeStyle='#3b4c50';c.lineWidth=2+(j%3);c.beginPath();c.moveTo(x,y+8);c.bezierCurveTo(x+18,y-16,x-7,y-24,x+22,y-4);c.stroke();c.beginPath();c.moveTo(x+5,y+12);c.lineTo(x+25,y+9);c.stroke();}
  },512,256);
  const cladding=new T.MeshStandardMaterial({map:marks,color:'#d2d8d5',metalness:.75,roughness:.37,envMap:environment.environment.texture,envMapIntensity:.7});
  stamp(new T.TorusGeometry(1,.35,18,96),cladding,0,h*.52,0,w*.37,h*.355,d*.73);
  stamp(new T.SphereGeometry(1,40,16,0,Math.PI*2,0,Math.PI/2),M.lawn,0,0,0,w*.63,7,d*.85);return true;
 }
 if(k==='dubaiopera'){
  const outline=new T.Shape();outline.moveTo(-w*.5,0);outline.bezierCurveTo(-w*.4,-d*.55,w*.32,-d*.58,w*.5,0);outline.bezierCurveTo(w*.32,d*.5,-w*.38,d*.56,-w*.5,0);
  const g=new T.ExtrudeGeometry(outline,{depth:h*.72,bevelEnabled:true,bevelSize:1,bevelThickness:1,bevelSegments:2,curveSegments:24});
  stamp(g,environment.surface('#83bcc8',{color:'#668181'}),0,1,0,1,1,1,0,-Math.PI/2);
  const roof=new T.ExtrudeGeometry(outline,{depth:2,bevelEnabled:true,bevelSize:2,bevelThickness:1,bevelSegments:2,curveSegments:24});
  stamp(roof,environment.surface('#b49670'),0,h*.74,0,1,1,1,0,-Math.PI/2);
  for(let j=0;j<34;j++){const a=j*Math.PI*2/34,x=Math.cos(a)*w*.46,z=Math.sin(a)*d*.47;box(x,h*.36,z,.65,h*.7,.65,M.frame);}
  return true;
 }
 return false;
}};
