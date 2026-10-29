/* Berlin Flight: actual 3D prototype. Three.js r160 and Water are embedded under MIT.
   Map data © OpenStreetMap contributors (ODbL 1.0), from Geofabrik, 2026-10-24.
   Footprints and roads are mapped; untagged heights and facade appearances are stylized. No remote assets or runtime packages. Map geometry is merged in spatial chunks; repeated scenery is instanced. Controls use GamepadStd. */
(async()=>{'use strict';
let startupReady=false,loadingYield=performance.now();
const startup={startedAt:performance.now(),stage:'Opening the city map…',percent:0,uploadedObjects:0,uploadedTextures:0,warmViews:0,ready:false};
async function loadingStage(percent,message){
 startup.percent=Math.max(startup.percent,Math.min(100,percent));startup.stage=message;
 document.querySelector('#loading-progress').value=startup.percent;
 document.querySelector('#loading-status').textContent=message;
 await new Promise(resolve=>requestAnimationFrame(()=>setTimeout(resolve,0)));
 loadingYield=performance.now();
}
async function loadingWork(percent,message){if(performance.now()-loadingYield>16)await loadingStage(percent,message);}
await loadingStage(2,'Opening the city map…');
const mapResponse=await fetch('/games/city-flight/berlin/data/berlin.bin');
if(!mapResponse.ok)throw new Error('Could not load the Berlin map');
const mapBytes=new Uint8Array(await mapResponse.arrayBuffer());
const BERLIN_MAP=await new Response(new Blob([mapBytes]).stream().pipeThrough(new DecompressionStream('gzip'))).json();
await loadingStage(10,'Building Berlin’s neighborhoods…');
const $=s=>document.querySelector(s),T=THREE,clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),lerp=(a,b,t)=>a+(b-a)*t,TAU=Math.PI*2;
let seed=92731;function rnd(){seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;}
const scene=new T.Scene();scene.fog=new T.FogExp2('#c4e2ed',.00062);
let renderer;
try{renderer=new T.WebGLRenderer({canvas:$('#view'),antialias:true,powerPreference:'high-performance'});}catch(e){$('#error').classList.remove('hidden');$('#error').innerHTML='<section class="card"><h2>This scene needs 3D graphics</h2><p>Please enable hardware acceleration in your browser, or try Chrome on another device.</p><button onclick="location.href=\'index.html\'">↩ Arcade</button></section>';$('#error button').focus();return;}
renderer.setPixelRatio(1);renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.04;renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.shadowMap.autoUpdate=false;
const camera=new T.PerspectiveCamera(54,1,1,4200),look=new T.Vector3(),desired=new T.Vector3();
const qualityModes=['Balanced','High','Performance'];let quality='Balanced';try{const stored=ArcadeProfile.storage.getItem('berlin-city-flight.graphics');if(qualityModes.includes(stored))quality=stored;}catch{}
function resize(){const w=innerWidth,h=innerHeight,budget=quality==='High'?2560*1440:quality==='Performance'?1280*720:1920*1080,scale=Math.min(devicePixelRatio||1,quality==='High'?2:1.5,Math.sqrt(budget/(w*h)));renderer.setSize(Math.round(w*scale),Math.round(h*scale),false);camera.aspect=w/h;camera.updateProjectionMatrix();}addEventListener('resize',resize);resize();
scene.add(new T.HemisphereLight(0xc4e2ff,0x77795c,1.45));
const sun=new T.DirectionalLight(0xffe6be,2.65);sun.position.set(-330,430,190);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-330,right:330,top:330,bottom:-330,near:1,far:1400});sun.shadow.bias=-.00035;sun.shadow.normalBias=.5;scene.add(sun,sun.target);
const sky=new T.Mesh(new T.SphereGeometry(3500,24,12),new T.ShaderMaterial({side:T.BackSide,toneMapped:false,depthWrite:false,uniforms:{top:{value:new T.Color('#398bd0')},bottom:{value:new T.Color('#d1e2e8')}},vertexShader:'varying vec3 v;void main(){v=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'varying vec3 v;uniform vec3 top;uniform vec3 bottom;void main(){vec3 dir=normalize(v);float h=smoothstep(-.08,.85,dir.y);vec3 col=mix(bottom,top,pow(h,.65));float glow=pow(max(0.,dot(dir,normalize(vec3(-.6,.75,.25)))),24.);col+=vec3(.13,.09,.035)*glow;gl_FragColor=vec4(col,1.);\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}'}));scene.add(sky);
const mats=new Map(),batches=new Map(),dummy=new T.Object3D(),cube=new T.BoxGeometry(1,1,1),leafGeo=new T.IcosahedronGeometry(1,1),rockGeo=new T.IcosahedronGeometry(1,0),cylGeo=new T.CylinderGeometry(1,1,1,10),sphereGeo=new T.SphereGeometry(1,16,10);
function mat(color,opts={}){const key=color+JSON.stringify(opts);if(!mats.has(key))mats.set(key,new T.MeshStandardMaterial({color,roughness:.82,...opts}));return mats.get(key);}
function stamp(geo,material,x,y,z,sx=1,sy=1,sz=1,ry=0,rx=0,rz=0,shadow=true){const key=geo.uuid+material.uuid+shadow+':'+Math.floor(x/500)+':'+Math.floor(z/500);let b=batches.get(key);if(!b){b={geo,material,matrices:[],shadow};batches.set(key,b);}dummy.position.set(x,y,z);dummy.rotation.set(rx,ry,rz);dummy.scale.set(sx,sy,sz);dummy.updateMatrix();b.matrices.push(dummy.matrix.clone());}
function box(x,y,z,w,h,d,c,ry=0,shadow=true){stamp(cube,typeof c==='string'?mat(c):c,x,y,z,w,h,d,ry,0,0,shadow);}
function cylinder(x,y,z,r,h,c,r2=r){if(r2===r)stamp(cylGeo,mat(c),x,y,z,r,h,r);else{const g=new T.CylinderGeometry(r2,r,h,12);stamp(g,mat(c),x,y,z);}}
function sphere(x,y,z,rx,ry,rz,c){stamp(sphereGeo,typeof c==='string'?mat(c):c,x,y,z,rx,ry,rz);}
function beam(a,b,r,c){const delta=new T.Vector3().subVectors(b,a),mid=new T.Vector3().addVectors(a,b).multiplyScalar(.5),q=new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),delta.clone().normalize());const key=cylGeo.uuid+mat(c).uuid+true;let batch=batches.get(key);if(!batch){batch={geo:cylGeo,material:mat(c),matrices:[],shadow:true};batches.set(key,batch);}dummy.position.copy(mid);dummy.quaternion.copy(q);dummy.scale.set(r,delta.length(),r);dummy.updateMatrix();batch.matrices.push(dummy.matrix.clone());}
const roofGeo=(()=>{const g=new T.BufferGeometry(),a=[-.5,0,-.5],b=[.5,0,-.5],c=[0,1,-.5],d=[-.5,0,.5],e=[.5,0,.5],f=[0,1,.5],v=[];for(const t of [[a,c,b],[d,e,f],[a,d,f],[a,f,c],[b,c,f],[b,f,e],[a,b,e],[a,e,d]])v.push(...t.flat());g.setAttribute('position',new T.Float32BufferAttribute(v,3));g.computeVertexNormals();return g;})();
function roof(x,y,z,w,h,d,col,ry=0){stamp(roofGeo,mat(col),x,y,z,w,h,d,ry);}
function texture(draw,w=256,h=256){const c=document.createElement('canvas');c.width=w;c.height=h;draw(c.getContext('2d'),w,h);const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;t.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());return t;}
const facadeColors=['#e9d4ad','#f4ddb6','#d5bba0','#ecd9bf','#dfa995','#c3d5ce','#efcd8e','#b9cdd5'];
const facades=facadeColors.map((color,n)=>new T.MeshStandardMaterial({roughness:.9,map:texture((c,w,h)=>{
 c.fillStyle=color;c.fillRect(0,0,w,h);const floors=4+n%3,cols=3+n%2,fh=h/floors,cw=w/cols;
 for(let j=0;j<floors;j++){
  c.fillStyle='#725d4930';c.fillRect(0,j*fh+fh-5,w,5);c.fillStyle='#fff3d299';c.fillRect(0,j*fh+fh-6,w,2);
  for(let k=0;k<cols;k++){const x=k*cw+cw*.24,y=j*fh+9,ww=cw*.48,hh=fh-21;
   c.fillStyle='#786f61';c.fillRect(x-3,y-3,ww+6,hh+7);c.fillStyle='#f3e4c8';c.fillRect(x-2,y-2,ww+4,hh+4);
   const glass=c.createLinearGradient(0,y,0,y+hh);glass.addColorStop(0,'#344e61');glass.addColorStop(1,(j+k+n)%5===0?'#bea77c':'#83a4af');c.fillStyle=glass;c.fillRect(x,y,ww,hh);
   c.fillStyle='#e9dec8';c.fillRect(x+ww*.48,y,2,hh);if(n%2)c.fillRect(x,y+hh*.45,ww,2);
   c.fillStyle='#fff1d1';c.fillRect(x-4,y+hh,ww+8,3);
   if(n%3===0&&j<floors-1){c.fillStyle='#424f5670';c.fillRect(x-5,y+hh+3,ww+10,6);}
  }
 }
 const shade=c.createLinearGradient(0,0,0,h);shade.addColorStop(0,'#45362638');shade.addColorStop(.12,'#45362600');shade.addColorStop(.75,'#45362600');shade.addColorStop(1,'#45362645');c.fillStyle=shade;c.fillRect(0,0,w,h);
 c.fillStyle='#f2dfbf';c.fillRect(0,0,w,5);c.fillStyle='#3c535b';c.fillRect(w*.43,h-30,w*.14,30);c.fillStyle='#d6c5a2';c.fillRect(w*.50,h-28,2,26);
})}));
const grassTex=texture((c,w,h)=>{c.fillStyle='#8fae63';c.fillRect(0,0,w,h);for(let i=0;i<13000;i++){c.fillStyle=rnd()<.5?'#b6c77b30':'#527d4030';c.fillRect(rnd()*w,rnd()*h,2,2);}});grassTex.wrapS=grassTex.wrapT=T.RepeatWrapping;grassTex.repeat.set(80,80);
// Real map geometry: local east/north projection, uniformly scaled for flight.
const geo=(lon,lat)=>({x:(lon-13.38)*111320*Math.cos(52.52*Math.PI/180)*.36,z:(52.52-lat)*111320*.36});
const TAKEOFF={x:220,z:1828.8,heading:Math.atan2(1,.071)};
const TITLE={...geo(13.3705,52.5144),y:48,heading:0};
const obstacles=[],cityChunks=[],cityLabels=[];
const ground=new T.Mesh(new T.PlaneGeometry(11000,11000),mat('#c7c8b3',{roughness:1}));ground.rotation.x=-Math.PI/2;ground.position.y=-.6;ground.receiveShadow=true;scene.add(ground);
const copper='#548f7d',stone='#d8c7a5',gold='#d7ae42';
const trees=[];
// Model helpers from the original game are retained for landmark silhouettes.
function tree(x,z,h=14,variant=0){trees.push({x,z,h});cylinder(x,h*.25+3,z,.6,h*.5,'#8a7952');const greens=['#7eaa38','#91b540','#5d983d','#a8b74b','#669b46'];for(let j=0;j<2;j++){const a=j*2.4+variant,xx=x+Math.cos(a)*h*.18,zz=z+Math.sin(a)*h*.16;stamp(leafGeo,mat(greens[(variant+j)%5],{flatShading:true}),xx,h*.68+3+(j%2)*h*.13,zz,h*(.27+rnd()*.1),h*(.29+rnd()*.12),h*.32,rnd()*3);}}
function plaza(x,z,w,d){box(x,1.1,z,w,2,d,'#d9d3b9');box(x,2.2,z,w-8,.2,d-8,'#e9dec5');for(let j=-2;j<=2;j++)box(x+j*w/6,2.35,z,.7,.1,d-10,'#c4bda5');}
function greenDome(x,y,z,r,h){const profile=[];for(let j=0;j<=12;j++){const a=j*Math.PI/24;profile.push(new T.Vector2(Math.cos(a)*r,Math.sin(a)*h));}stamp(new T.LatheGeometry(profile,24),mat(copper,{metalness:.2,roughness:.55}),x,y,z);for(let j=0;j<12;j++){const a=j*TAU/12;let prev=new T.Vector3(x+r*Math.cos(a),y,z+r*Math.sin(a));for(let k=1;k<=6;k++){const b=k*Math.PI/12,p=new T.Vector3(x+r*Math.cos(b)*Math.cos(a),y+h*Math.sin(b),z+r*Math.cos(b)*Math.sin(a));beam(prev,p,.25,'#90b4a0');prev=p;}}cylinder(x,y+h+3,z,r*.12,6,'#d8c8a7');sphere(x,y+h+6,z,r*.15,2.5,r*.15,copper);box(x,y+h+11,z,.5,7,.5,gold);box(x,y+h+12,z,4,.5,.5,gold);}
function reichstag(){const x=-192,z=-42;box(x,15,z,128,26,82,facades[0]);box(x,29,z,132,3,86,'#d4c7a8');box(x,32,z,110,3,70,'#9ca89f');for(const sx of [-1,1])for(const sz of [-1,1]){box(x+sx*54,23,z+sz*32,24,42,24,facades[0]);box(x+sx*54,44,z+sz*32,26,3,26,'#d6c7a2');roof(x+sx*54,45,z+sz*32,27,9,27,'#84938b');}
box(x,3,z+54,76,6,25,'#d4ccae');for(let k=0;k<4;k++)box(x,1+k*.6,z+64-k*2,85-k*2,1.2,7,'#e4d7b8');for(let j=-5;j<=5;j++){cylinder(x+j*6.4,16,z+44,1.4,25,'#eddfbd');box(x+j*6.4,29,z+44,4,2,4,'#e8d6b0');}roof(x,30,z+46,79,12,20,'#d9c9aa');box(x,30,z+45,80,3,22,'#e4d6b6');
const glass=mat('#79a6b3',{metalness:.42,roughness:.22});const dome=new T.SphereGeometry(24,32,16,0,TAU,0,Math.PI/2);stamp(dome,glass,x,33,z,1,.85,1);for(let j=0;j<10;j++){const a=(j+1)*Math.PI/22,r=Math.cos(a)*24,y=33+Math.sin(a)*20.4;const tor=new T.TorusGeometry(r,.25,4,48);stamp(tor,mat('#cbd0bd',{metalness:.35}),x,y,z,1,1,1,0,Math.PI/2);}for(let j=0;j<16;j++){const a=j*TAU/16;let prev=new T.Vector3(x+24*Math.cos(a),33,z+24*Math.sin(a));for(let k=1;k<=8;k++){const b=k*Math.PI/16,p=new T.Vector3(x+24*Math.cos(b)*Math.cos(a),33+20.4*Math.sin(b),z+24*Math.cos(b)*Math.sin(a));beam(prev,p,.24,'#cbd0bd');prev=p;}}
for(const sx of [-1,1]){cylinder(x+sx*54,62,z+32,.22,18,'#b1b8ac');box(x+sx*54+3,67,z+32,6,1.5,.15,'#353c3a');box(x+sx*54+3,65.5,z+32,6,1.5,.15,'#b64d35');box(x+sx*54+3,64,z+32,6,1.5,.15,'#ecc152');}
for(let i=0;i<30;i++){const xx=x-65+rnd()*130,zz=65+rnd()*100;if(Math.abs(xx-x)<28)continue;tree(xx,zz,14+rnd()*10,i%5);}box(x,3.5,108,28,.3,85,'#ded8bb');}
function cathedral(){const x=180,z=-1110;plaza(x,z,172,160);box(x,23,z,100,42,88,facades[0]);box(x,46,z,104,4,92,stone);cylinder(x,55,z,27,20,stone);for(let j=0;j<16;j++){const a=j*TAU/16,xx=x+27.1*Math.cos(a),zz=z+27.1*Math.sin(a);box(xx,56,zz,4,10,1,'#486e71',-a+Math.PI/2);}greenDome(x,65,z,29,31);for(const sx of [-1,1])for(const sz of [-1,1]){box(x+sx*42,29,z+sz*35,23,54,23,facades[0]);cylinder(x+sx*42,61,z+sz*35,12,10,stone);greenDome(x+sx*42,66,z+sz*35,13,15);}for(let j=-3;j<=3;j++){cylinder(x+j*9,22,z+48,1.5,36,'#e8d9b9');box(x+j*9,41,z+48,4,2,4,stone);}roof(x,42,z+48,76,13,19,stone);box(x,15,z+46,15,25,1,'#4e6866');for(let j=0;j<6;j++)box(x,1+j*.6,z+66-j*2,74-j*2,1.2,8,'#e4d6bb');obstacles.push({x,z,w:55,d:49,h:110});}
function gate(){const x=-490,z=-580;plaza(x,z,200,160);for(const side of [-1,1])for(let j=0;j<6;j++){const xx=x-45+j*18;box(xx,3,z+side*10,8,5,8,stone);cylinder(xx,20,z+side*10,2.4,31,'#e8d6ac');box(xx,36,z+side*10,7,3,7,'#dac7a1');}box(x,40,z,106,7,30,stone);box(x,45,z,110,3,33,'#eee0bd');box(x,49,z,48,6,27,'#dac8a5');for(let j=-11;j<=11;j++)box(x+j*4.4,40,z+15.2,1.6,4,.5,'#b6ab8b');for(const side of [-1,1]){box(x+side*74,12,z,32,24,33,facades[0]);roof(x+side*74,25,z,35,8,37,'#aaa78f');}
// Four horses and a two-wheeled chariot form the Quadriga silhouette.
for(let j=0;j<4;j++){const xx=x-10+j*6.6;sphere(xx,57,z+3,2.6,2.6,5.3,copper);sphere(xx,60,z+7,1.1,3,1.8,copper);sphere(xx,63,z+8,1.2,1.2,2,copper);for(const sx of [-1,1])for(const sz of [-1,1])box(xx+sx*1.4,53,z+3+sz*3,.7,6,.7,copper);}box(x,56,z-6,8,5,6,copper);for(const side of [-1,1])stamp(new T.TorusGeometry(2.6,.45,6,16),mat(copper),x+side*4.3,54,z-6,1,1,1,Math.PI/2);cylinder(x,62,z-6,1.2,8,copper);sphere(x,67,z-6,1.2,1.4,1.2,copper);beam(new T.Vector3(x,64,z-6),new T.Vector3(x+6,70,z-6),.4,copper);box(x+6,73,z-6,.5,8,.5,copper);stamp(new T.TorusGeometry(2,.4,5,16),mat(copper),x+6,77,z-6);obstacles.push({x,z,w:95,d:20,h:81});}
function victory(){const x=-700,z=90;plaza(x,z,118,118);cylinder(x,5,z,30,8,'#a5a397');cylinder(x,12,z,21,8,'#c7b695');for(let j=0;j<10;j++){const a=j*TAU/10;cylinder(x+Math.cos(a)*15,22,z+Math.sin(a)*15,1.3,16,stone);}cylinder(x,31,z,20,4,stone);cylinder(x,58,z,5.2,51,'#c3a75b');for(let j=0;j<4;j++)cylinder(x,37+j*14,z,6.4,2,gold);cylinder(x,85,z,9,5,gold);cylinder(x,91,z,4,7,stone);cylinder(x,100,z,2,12,gold,1.3);sphere(x,108,z,1.6,1.9,1.6,gold);const wing=new T.Shape();wing.moveTo(0,0);wing.lineTo(10,9);wing.lineTo(9,1);wing.lineTo(2,-2);wing.closePath();for(const side of [-1,1])stamp(new T.ExtrudeGeometry(wing,{depth:.6,bevelEnabled:false}),mat(gold,{metalness:.5}),x,103,z,side,1,1);beam(new T.Vector3(x,104,z),new T.Vector3(x+6,111,z),.5,gold);obstacles.push({x,z,w:22,d:22,h:115});for(let j=0;j<28;j++){const a=j*TAU/28;tree(x+Math.cos(a)*89,z+Math.sin(a)*89,16+j%5,j%5);}}
function museum(){const x=-285,z=-1240;plaza(x,z,180,145);box(x,21,z,140,38,70,facades[1]);box(x,41,z,145,4,74,stone);for(let j=0;j<18;j++){cylinder(x-64+j*7.5,22,z+43,1.5,34,'#e7d6b4');box(x-64+j*7.5,40,z+43,4,2,4,stone);}box(x,44,z+42,148,6,17,'#dbc29a');for(let j=0;j<7;j++)box(x,1+j*.6,z+66-j*2,151-j*2,1,9,'#ddd4bc');cylinder(x,47,z,23,7,'#b1ae98');stamp(new T.SphereGeometry(23,24,12,0,TAU,0,Math.PI/2),mat('#769b90'),x,50,z,1,.28,1);obstacles.push({x,z,w:75,d:48,h:62});}
function palace(){const x=-640,z=-1100;plaza(x,z,300,220);box(x,17,z,240,32,46,facades[1]);for(const side of [-1,1])box(x+side*112,17,z+44,32,32,118,facades[1]);roof(x,33,z,245,10,50,'#6b8588');for(const side of [-1,1])roof(x+side*112,33,z+44,36,10,122,'#6b8588');box(x,28,z,44,54,56,facades[0]);cylinder(x,62,z,16,14,stone);greenDome(x,69,z,18,24);box(x,2.4,z+99,80,.2,90,'#8da968');cylinder(x,3.3,z+90,14,1.8,'#d8cfb2');cylinder(x,4.3,z+90,12,.2,'#63b9c7');for(let j=0;j<12;j++){const a=j*TAU/12;tree(x+Math.cos(a)*155,z+Math.sin(a)*120,16+j%6,j%5);}obstacles.push({x,z,w:127,d:28,h:47},{x,z,w:26,d:32,h:108});for(const side of [-1,1])obstacles.push({x:x+side*112,z:z+44,w:19,d:62,h:46});}
const cityHipRoof=new T.ConeGeometry(1,1,4);
const landmarkModels=[
 {name:'Reichstag',lon:13.3762,lat:52.5186,old:[-192,-42],scale:.43,make:reichstag,r:34},
 {name:'Brandenburg Gate',lon:13.3777,lat:52.5163,old:[-490,-580],scale:.43,make:gate,r:29},
 {name:'Victory Column',lon:13.3501,lat:52.5145,old:[-700,90],scale:.32,make:victory,r:12},
 {name:'Berlin Cathedral',lon:13.4010,lat:52.5191,old:[180,-1110],scale:.43,make:cathedral,r:29},
 {name:'Altes Museum',lon:13.3989,lat:52.5196,old:[-285,-1240],scale:.33,make:museum,r:25},
 {name:'Charlottenburg Palace',lon:13.2957,lat:52.5209,old:[-640,-1100],scale:.65,make:palace,r:80}
];
// Apply one geographic transform to both meshes and collision volumes.
for(const l of landmarkModels){
 Object.assign(l,geo(l.lon,l.lat));const before=new Map([...batches].map(([key,b])=>[key,b.matrices.length])),oi=obstacles.length;
 l.make();const matrix=new T.Matrix4().makeTranslation(l.x-l.old[0]*l.scale,0,l.z-l.old[1]*l.scale).multiply(new T.Matrix4().makeScale(l.scale,l.scale,l.scale));
 for(const [key,b] of batches)for(let i=before.get(key)||0;i<b.matrices.length;i++)b.matrices[i].premultiply(matrix);
 if(obstacles.length===oi)obstacles.push({x:l.old[0],z:l.old[1],w:l.r/l.scale,d:l.r/l.scale,h:65});
 for(let i=oi;i<obstacles.length;i++){const o=obstacles[i];o.x=l.x+(o.x-l.old[0])*l.scale;o.z=l.z+(o.z-l.old[1])*l.scale;o.w*=l.scale;o.d*=l.scale;o.h*=l.scale;}
}
// Fernsehturm is placed at Alexanderplatz, with its real height at map scale.
const tv=geo(13.4094,52.5208);cylinder(tv.x,58,tv.z,1.8,116,'#d8d5c9',1.1);sphere(tv.x,119,tv.z,6,5,6,mat('#b7c4c9',{metalness:.65,roughness:.28}));cylinder(tv.x,119,tv.z,6.1,1.3,'#477785');for(let i=0;i<9;i++)cylinder(tv.x,126+i*1.4,tv.z,.45-i*.025,1.4,i%2?'#d75746':'#f3e6cf');obstacles.push({x:tv.x,z:tv.z,w:7,d:7,h:139});
landmarkModels.push({name:'TV Tower',...tv,r:8});
// Recognizable silhouettes at mapped locations on the eastern Spree.
const oberbaum={name:'Oberbaumbrücke',type:'landmark',...geo(13.44565,52.50176),y:24,altitude:30,approach:80,heading:.35,sideOffset:22,labelWidth:25};
const molecule={name:'Molecule Man',type:'landmark',...geo(13.459035,52.49697),y:20,altitude:18,approach:60,heading:.2,sideOffset:18,labelWidth:22};
const extraPlaces=[oberbaum,molecule];
{
 const theta=.91,c=Math.cos(theta),s=Math.sin(theta),brick='#a9654d',cream='#d4b697';
 const point=(u,v)=>({x:oberbaum.x+c*u+s*v,z:oberbaum.z-s*u+c*v});
 const block=(u,y,v,w,h,d,col)=>{const p=point(u,v);box(p.x,y,p.z,w,h,d,col,theta);};
 block(0,5.5,0,60,1.1,7,brick);block(0,6.1,0,60,.15,5,'#9b9083');
 for(let u=-27;u<=27;u+=9){block(u,2.2,0,2,4.4,6.6,brick);block(u,9,-2.8,.8,5.8,.8,brick);}
 for(const side of [-1,1])block(0,6.9,side*3.3,60,.8,.5,cream);
 block(0,11.6,-2.8,60,.7,1,brick);
 const arch=new T.Shape();arch.moveTo(-3.5,4.9);arch.lineTo(-3.5,.4);arch.quadraticCurveTo(0,7.9,3.5,.4);arch.lineTo(3.5,4.9);arch.closePath();
 const archGeo=new T.ExtrudeGeometry(arch,{depth:6.2,bevelEnabled:false,curveSegments:12});
 for(let u=-22.5;u<27;u+=9){const p=point(u,-3.1);stamp(archGeo,mat(brick),p.x,0,p.z,1,1,1,theta);}
 for(const side of [-1,1]){const p=point(5,side*3.1);cylinder(p.x,7,p.z,1.6,14,brick);cylinder(p.x,14.3,p.z,2,.6,cream);stamp(new T.ConeGeometry(2.2,5,12),mat('#557978'),p.x,17.1,p.z);cylinder(p.x,20,p.z,.12,1.5,gold);}
 obstacles.push({x:oberbaum.x,z:oberbaum.z,w:24,d:28,h:22});
}
{
 // Three perforated metal figures, 30 metres high at the city map scale.
 const outline=[[-1.8,0],[-.65,0],[.2,3.8],[.7,3.8],[1.45,0],[2.6,0],[1.65,4.8],[1.6,6.2],[3.5,7.0],[3.2,7.85],[1.3,7.15],[.8,8.5],[1.05,8.9],[1.15,9.6],[.75,10.3],[.1,10.7],[-.55,10.4],[-.9,9.7],[-.75,9.0],[-.3,8.5],[-.95,7.7],[-2.6,6.8],[-2.2,6.0],[-.85,6.55],[-.85,4.6]];
 const shape=new T.Shape(outline.map(p=>new T.Vector2(...p)));
 for(let y=.55;y<10.2;y+=.55)for(let x=-2.5;x<3;x+=.55){const r=.14;if(contains([x,y],outline)&&[[r,0],[-r,0],[0,r],[0,-r]].every(([dx,dy])=>contains([x+dx,y+dy],outline))){const hole=new T.Path();hole.absarc(x,y,r,0,TAU,true);shape.holes.push(hole);}}
 const plate=new T.ExtrudeGeometry(shape,{depth:.12,bevelEnabled:false,curveSegments:6});
 const metal=mat('#d4e1e4',{metalness:.65,roughness:.32,side:T.DoubleSide});
 for(let i=0;i<3;i++){const a=i*TAU/3;stamp(plate,metal,molecule.x+Math.cos(a)*1.5,.2,molecule.z+Math.sin(a)*1.5,1,1,1,-a);}
 obstacles.push({x:molecule.x,z:molecule.z,w:6,d:6,h:12});
}

// Chunked merged geometry keeps tens of thousands of real buildings affordable.
const chunks=new Map();
const wallMat=new T.MeshStandardMaterial({map:facades[3].map,vertexColors:true,roughness:.9,side:T.DoubleSide});
const roofMat=new T.MeshStandardMaterial({vertexColors:true,roughness:.92,side:T.DoubleSide});
const groundMat=new T.MeshStandardMaterial({vertexColors:true,roughness:1,side:T.DoubleSide});
const facadeTints=['#fff2df','#f1ddc6','#d7d8d2','#e9c4ae','#cad8d5','#eee6d7','#d6c2b5','#cbd4dd'].map(c=>new T.Color(c));
const roofTints=['#7a7770','#986c54','#77818a','#a47e65','#6c7778'].map(c=>new T.Color(c));
function batchFor(kind,x,z){const key=kind+':'+Math.floor(x/320)+':'+Math.floor(z/320);let b=chunks.get(key);if(!b){b={kind,x,z,p:[],uv:[],c:[]};chunks.set(key,b);}return b;}
function vertex(b,x,y,z,u,v,c){b.p.push(x,y,z);b.uv.push(u,v);b.c.push(c.r,c.g,c.b);}
function polygon(f,y,color,kind='ground'){
 const p=f.p,holes=f.holes||[];if(p.length<3)return;
 const contours=p.map(v=>new T.Vector2(...v)),holeVec=holes.map(h=>h.map(v=>new T.Vector2(...v))),all=[...p,...holes.flat()],tris=T.ShapeUtils.triangulateShape(contours,holeVec),b=batchFor(kind,p[0][0],p[0][1]),c=typeof color==='string'?new T.Color(color):color;
 for(const tri of tris)for(const i of [tri[0],tri[2],tri[1]]){const v=all[i];vertex(b,v[0],y,v[1],v[0]/8,v[1]/8,c);}
}
function strip(a,b,w,y,col,kind='ground'){
 const dx=b[0]-a[0],dz=b[1]-a[1],len=Math.hypot(dx,dz);if(len<.01)return;const xx=dz/len*w/2,zz=-dx/len*w/2;
 polygon({p:[[a[0]+xx,a[1]+zz],[b[0]+xx,b[1]+zz],[b[0]-xx,b[1]-zz],[a[0]-xx,a[1]-zz]]},y,col,kind);
}
const cityPOIs=BERLIN_MAP.pois;
const buildings=BERLIN_MAP.features.filter(f=>f.k==='building');
let builtCount=0;
for(const f of buildings){if(++builtCount%512===0)await loadingWork(12,'Finding buildings and places…');const xs=f.p.map(p=>p[0]),zs=f.p.map(p=>p[1]);f.x=(Math.min(...xs)+Math.max(...xs))/2;f.z=(Math.min(...zs)+Math.max(...zs))/2;f.w=(Math.max(...xs)-Math.min(...xs))/2;f.d=(Math.max(...zs)-Math.min(...zs))/2;}
for(const p of cityPOIs){await loadingWork(15,'Finding buildings and places…');let nearest=null,dist=Infinity;for(const f of buildings){const d=Math.hypot(Math.max(0,Math.abs(p.x-f.x)-f.w),Math.max(0,Math.abs(p.z-f.z)-f.d));if(d<dist){nearest=f;dist=d;}}if(nearest&&dist<25){nearest.cat=p.type;p.y=nearest.h+8;}else p.y=20;}
builtCount=0;
for(const f of buildings){
 if(++builtCount%256===0)await loadingWork(16+20*builtCount/buildings.length,'Building Berlin’s neighborhoods…');
 if(landmarkModels.some(l=>Math.hypot(f.x-l.x,f.z-l.z)<l.r)||Math.hypot(f.x-oberbaum.x,f.z-oberbaum.z)<25)continue;
 const height=f.h,cat=f.cat,base=facadeTints[f.c],color=cat==='hospital'?new T.Color('#d2e6e2'):cat==='school'?new T.Color('#efc99f'):cat==='mall'?new T.Color('#dbb3a5'):base;
 const b=batchFor('wall',f.x,f.z);
 for(const ring of [f.p,...(f.holes||[])])for(let j=0;j<ring.length;j++){
  const a=ring[j],d=ring[(j+1)%ring.length],len=Math.hypot(d[0]-a[0],d[1]-a[1]),u=Math.max(.25,len/18),v=Math.max(.25,height/11);
  for(const [x,y,z,uu,vv] of [[a[0],.25,a[1],0,0],[d[0],.25,d[1],u,0],[d[0],height,d[1],u,v],[a[0],.25,a[1],0,0],[d[0],height,d[1],u,v],[a[0],height,a[1],0,v]])vertex(b,x,y,z,uu,vv,color);
 }
 polygon(f,height,roofTints[f.c%5],'roof');obstacles.push({x:f.x,z:f.z,w:f.w+1,d:f.d+1,h:height+2});
}
facades[3].map.wrapS=facades[3].map.wrapT=T.RepeatWrapping;
const waterPositions=[],waterIndices=[];
function contains(p,ring){let inside=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++){const a=ring[i],b=ring[j];if((a[1]>p[1])!==(b[1]>p[1])&&p[0]<(b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0])inside=!inside;}return inside;}
// Keep vegetation off streets and the open former airfield.
await loadingStage(37,'Laying out streets and parks…');
let featureCount=0;
const streetCells=new Map();for(const f of BERLIN_MAP.features){if(++featureCount%512===0)await loadingWork(38,'Laying out streets and parks…');if(!['road','runway'].includes(f.k)||f.w<3)continue;for(let i=1;i<f.p.length;i++){const a=f.p[i-1],b=f.p[i],r=f.w/2+2,seg={a,b,r};for(let x=Math.floor((Math.min(a[0],b[0])-r)/40);x<=Math.floor((Math.max(a[0],b[0])+r)/40);x++)for(let z=Math.floor((Math.min(a[1],b[1])-r)/40);z<=Math.floor((Math.max(a[1],b[1])+r)/40);z++){const key=x+':'+z;if(!streetCells.has(key))streetCells.set(key,[]);streetCells.get(key).push(seg);}}}
function onStreet(p){return (streetCells.get(Math.floor(p[0]/40)+':'+Math.floor(p[1]/40))||[]).some(({a,b,r})=>{const dx=b[0]-a[0],dz=b[1]-a[1],u=clamp(((p[0]-a[0])*dx+(p[1]-a[1])*dz)/(dx*dx+dz*dz||1),0,1);return Math.hypot(p[0]-a[0]-u*dx,p[1]-a[1]-u*dz)<r;});}
let treeCount=0;const treeCandidates=[];const buildingCells=new Map();for(const f of buildings){for(let x=Math.floor((f.x-f.w)/40);x<=Math.floor((f.x+f.w)/40);x++)for(let z=Math.floor((f.z-f.d)/40);z<=Math.floor((f.z+f.d)/40);z++){const key=x+':'+z;if(!buildingCells.has(key))buildingCells.set(key,[]);buildingCells.get(key).push(f);}}
featureCount=0;
for(const f of BERLIN_MAP.features){
 if(++featureCount%256===0)await loadingWork(40+14*featureCount/BERLIN_MAP.features.length,'Laying out streets and parks…');
 if(f.k==='water'){
  const p=f.p,holes=f.holes||[],all=[...p,...holes.flat()],tris=T.ShapeUtils.triangulateShape(p.map(v=>new T.Vector2(...v)),holes.map(h=>h.map(v=>new T.Vector2(...v)))),offset=waterPositions.length/3;
  for(const p of all)waterPositions.push(p[0],-p[1],0);for(const t of tris)waterIndices.push(...t.map(i=>offset+i));
 }else if(f.k==='park'){
  polygon(f,.04,f.pitch?'#80a483':'#95ad79');
  if(!f.pitch){const xs=f.p.map(p=>p[0]),zs=f.p.map(p=>p[1]),minx=Math.min(...xs),maxx=Math.max(...xs),minz=Math.min(...zs),maxz=Math.max(...zs);let attempts=0;
   for(let x=minx+5;x<maxx&&attempts<1800;x+=9)for(let z=minz+5;z<maxz&&attempts++<1800;z+=9){const p=[x+rnd()*5,z+rnd()*5];if((p[0]>100&&p[0]<1050&&p[1]>1550)||onStreet(p)||rnd()>.55||!contains(p,f.p)||(f.holes||[]).some(h=>contains(p,h)))continue;if((buildingCells.get(Math.floor(p[0]/40)+':'+Math.floor(p[1]/40))||[]).some(f=>Math.abs(p[0]-f.x)<f.w+2&&Math.abs(p[1]-f.z)<f.d+2))continue;treeCandidates.push({p,rank:rnd()});}
  }
 }else if(['road','rail','runway'].includes(f.k)){
  const y=f.bridge?2.3:f.k==='runway'?.28:f.k==='rail'?.20:f.w<2?.10:.16,col=f.k==='rail'?'#777a76':f.k==='runway'?'#67787d':f.w<2?'#d9cfb7':'#92968f';
  for(let i=1;i<f.p.length;i++){const a=f.p[i-1],b=f.p[i];if(f.w>=3&&f.k==='road')strip(a,b,f.w+1.8,y-.03,'#ded9c9');strip(a,b,f.w,y,col);if(f.k==='runway')strip(a,b,.4,y+.02,'#eee8d7');}
 }
}
treeCandidates.sort((a,b)=>a.rank-b.rank);for(const {p} of treeCandidates.slice(0,4500))tree(p[0],p[1],4+rnd()*4,treeCount++%5);buildingCells.clear();streetCells.clear();treeCandidates.length=0;
await loadingStage(55,'Preparing city scenery…');
let chunkCount=0;const totalChunks=chunks.size;
for(const b of chunks.values()){
 if(++chunkCount%12===0)await loadingWork(55+8*chunkCount/totalChunks,'Preparing city scenery…');
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(b.p,3));g.setAttribute('uv',new T.Float32BufferAttribute(b.uv,2));g.setAttribute('color',new T.Float32BufferAttribute(b.c,3));g.computeVertexNormals();g.computeBoundingSphere();
 const m=new T.Mesh(g,b.kind==='wall'?wallMat:b.kind==='roof'?roofMat:groundMat);m.castShadow=b.kind!=='ground';m.receiveShadow=true;scene.add(m);cityChunks.push(m);
}chunks.clear();
const wg=new T.BufferGeometry();wg.setAttribute('position',new T.Float32BufferAttribute(waterPositions,3));wg.setIndex(waterIndices);wg.computeVertexNormals();
const normals=(()=>{const n=128,data=new Uint8Array(n*n*4);for(let y=0;y<n;y++)for(let x=0;x<n;x++){const i=(y*n+x)*4,a=x/n*TAU,b=y/n*TAU;data[i]=128+Math.sin(a*3+b*2)*22+Math.sin(a*7-b*5)*11+Math.cos(a*11+b*3)*7;data[i+1]=128+Math.cos(a*3+b*2)*18+Math.cos(a*7-b*5)*13+Math.sin(a*5+b*9)*7;data[i+2]=245;data[i+3]=255;}const t=new T.DataTexture(data,n,n);t.wrapS=t.wrapT=T.RepeatWrapping;t.magFilter=T.LinearFilter;t.minFilter=T.LinearMipmapLinearFilter;t.generateMipmaps=true;t.needsUpdate=true;return t;})();
const water=new Water(wg,{textureWidth:512,textureHeight:512,waterNormals:normals,sunDirection:new T.Vector3(-.6,.75,.25).normalize(),sunColor:0xfff3d4,waterColor:0x287f89,distortionScale:.48,fog:true});water.rotation.x=-Math.PI/2;water.position.y=.05;water.material.side=T.DoubleSide;water.material.uniforms.size.value=3.4;scene.add(water);
const reflect=water.onBeforeRender;let renderCount=0;water.onBeforeRender=function(...args){if(renderCount%(quality==='High'?1:quality==='Performance'?4:2)===0||renderCount<3)reflect.apply(this,args);};

// Labels identify mapped civic places without replacing their actual footprints.
const featuredPatterns=[/^Campus Charité Mitte$/i,/^Klinikum im Friedrichshain$/i,/^Alexa$/i,/^Mall of Berlin$/i,/^Schultheiss. Quartier$/i,/^Schultheiss Quartier$/i,/^Bikini Berlin$/i,/^Europa-Center$/i];
const featured=[...extraPlaces,...featuredPatterns.map(pattern=>cityPOIs.find(p=>pattern.test(p.name))).filter(Boolean)];
function placeLabel(p){const tex=texture((c,w,h)=>{c.fillStyle='#fff7e9';c.fillRect(0,0,w,h);c.fillStyle=p.type==='hospital'?'#2c927e':p.type==='school'?'#b87837':'#385d78';c.fillRect(0,0,10,h);c.font='bold 25px system-ui';c.textAlign='center';c.textBaseline='middle';c.fillText(p.name,w/2,h/2,w-30);},512,64);const sprite=new T.Sprite(new T.SpriteMaterial({map:tex,depthTest:true,transparent:true}));sprite.position.set(p.x,p.y||28,p.z);sprite.scale.set(p.labelWidth||46,(p.labelWidth||46)/8,1);scene.add(sprite);cityLabels.push(sprite);}
featured.forEach(placeLabel);
for(const p of cityPOIs.filter(p=>['hospital','school','mall'].includes(p.type))){const c=p.type==='hospital'?'#339985':p.type==='school'?'#d8ab50':'#b27267';box(p.x,p.y-5,p.z,3,.6,3,c,0,false);if(p.type==='hospital'){box(p.x,p.y-4.6,p.z,2,.15,.6,'#fff6df',0,false);box(p.x,p.y-4.6,p.z,.6,.15,2,'#fff6df',0,false);}}
// Index collision volumes by location rather than scanning the whole city per tick.
const obstacleCells=new Map();for(const o of obstacles)for(let x=Math.floor((o.x-o.w)/50);x<=Math.floor((o.x+o.w)/50);x++)for(let z=Math.floor((o.z-o.d)/50);z<=Math.floor((o.z+o.d)/50);z++){const key=x+':'+z;if(!obstacleCells.has(key))obstacleCells.set(key,[]);obstacleCells.get(key).push(o);}
function nearbyObstacles(x,z){return obstacleCells.get(Math.floor(x/50)+':'+Math.floor(z/50))||[];}
// The river is drawn from map polygons; boat paths follow a short central Spree reach.
const boatPath=[[13.3682,52.5225],[13.3703,52.5210],[13.3740,52.5211],[13.3775,52.5231],[13.3815,52.5226],[13.3860,52.5205]].map(p=>geo(...p));
function riverPoint(t){const n=boatPath.length-1,u=((t%1)+1)%1*n,i=Math.min(n-1,Math.floor(u)),a=boatPath[i],b=boatPath[i+1];return {x:lerp(a.x,b.x,u-i),z:lerp(a.z,b.z,u-i),heading:Math.atan2(b.x-a.x,b.z-a.z)};}
function riverX(){return TITLE.x;}
for(let i=0;i<30;i++){const x=-2300+rnd()*4400,z=1700-rnd()*2900,y=260+rnd()*90;for(let j=0;j<3;j++)stamp(leafGeo,mat('#fffaf0',{emissive:'#b2d1e1',emissiveIntensity:.22}),x+j*24,y+(j===1?8:0),z,30,8+rnd()*8,17,rnd(),0,0,false);}

// One draw call per geometry/material, including all facade details and tree canopies.
for(const b of batches.values()){const mesh=new T.InstancedMesh(b.geo,b.material,b.matrices.length);b.matrices.forEach((m,i)=>mesh.setMatrixAt(i,m));mesh.castShadow=b.shadow;mesh.receiveShadow=true;mesh.computeBoundingSphere();scene.add(mesh);}batches.clear();
function mesh(geo,m,parent=scene,x=0,y=0,z=0){const o=new T.Mesh(geo,m);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;}
function dbox(parent,x,y,z,w,h,d,m){const o=mesh(cube,m,parent,x,y,z);o.scale.set(w,h,d);return o;}
const paint=new T.MeshPhysicalMaterial({color:'#c93120',roughness:.29,metalness:.12,clearcoat:.65}),cream=new T.MeshPhysicalMaterial({color:'#fff0cf',roughness:.38,clearcoat:.45}),rubber=mat('#273c43',{roughness:.75}),steel=mat('#82979d',{metalness:.65,roughness:.35});
const aircraft=new T.Group(),body=new T.Group();aircraft.add(body);scene.add(aircraft);
const profile=[new T.Vector2(.13,-5.6),new T.Vector2(.34,-4.8),new T.Vector2(.7,-2.8),new T.Vector2(1.05,-.5),new T.Vector2(1.15,2),new T.Vector2(.93,3.8),new T.Vector2(.6,4.3)];const hull=mesh(new T.LatheGeometry(profile,24),cream,body,0,.7,0);hull.rotation.x=-Math.PI/2;
const cowling=mesh(new T.CylinderGeometry(.94,1.05,1.6,24),paint,body,0,.7,-3.25);cowling.rotation.x=Math.PI/2;
function wing(parent,span,chord,m,x,y,z){const shape=new T.Shape();shape.moveTo(-span*.5,chord*.35);shape.quadraticCurveTo(-span*.56,0,-span*.47,-chord*.35);shape.lineTo(-span*.10,-chord*.55);shape.lineTo(span*.10,-chord*.55);shape.lineTo(span*.47,-chord*.35);shape.quadraticCurveTo(span*.56,0,span*.5,chord*.35);shape.lineTo(-span*.5,chord*.35);const g=new T.ExtrudeGeometry(shape,{depth:.2,bevelEnabled:true,bevelSegments:2,steps:1,bevelSize:.16,bevelThickness:.12,curveSegments:8}),o=mesh(g,m,parent,x,y,z);o.rotation.x=Math.PI/2;return o;}
wing(body,22,3.5,paint,0,.1,-.7);for(const s of [-1,1]){dbox(body,s*5.3,.22,-.65,5.2,.12,2.8,cream);dbox(body,s*8.9,.22,-.65,1.2,.13,2.3,cream);}wing(body,7,2,paint,0,.85,4.3);for(const s of [-1,1])dbox(body,s*2.4,.95,4.25,.8,.1,1.4,cream);
const finshape=new T.Shape();finshape.moveTo(0,0);finshape.lineTo(0,3);finshape.quadraticCurveTo(1,3.3,2.1,0);const fin=mesh(new T.ExtrudeGeometry(finshape,{depth:.2,bevelEnabled:true,bevelSize:.1,bevelThickness:.1,bevelSegments:1,steps:1}),paint,body,-.1,1.1,3);fin.rotation.y=Math.PI/2;
const cockpit=mesh(new T.SphereGeometry(1,20,12),mat('#355866',{metalness:.25,roughness:.3}),body,0,1.48,-.6);cockpit.scale.set(.78,.35,1.25);
const pilotHead=mesh(sphereGeo,mat('#e7af7c'),body,0,1.98,-.1);pilotHead.scale.set(.47,.48,.47);const helmet=mesh(new T.SphereGeometry(.49,16,10,0,TAU,0,Math.PI*.64),mat('#83583b'),body,0,2.02,-.1);const screen=mesh(new T.SphereGeometry(1,20,10,0,Math.PI,0,Math.PI/2),new T.MeshPhysicalMaterial({color:'#a4d9e8',transparent:true,opacity:.58,roughness:.1,metalness:.1,side:T.DoubleSide}),body,0,1.65,-1.3);screen.scale.set(.78,.85,.7);screen.rotation.y=Math.PI;
const propeller=new T.Group();propeller.position.set(0,.7,-4.28);body.add(propeller);const propmat=mat('#57473a',{metalness:.1,roughness:.5});dbox(propeller,0,0,0,.27,5.8,.16,propmat);dbox(propeller,0,0,0,5.8,.27,.16,propmat);const spinner=mesh(new T.SphereGeometry(.47,16,10),paint,body,0,.7,-4.35);spinner.scale.z=1.4;
const propdisk=mesh(new T.CircleGeometry(3,40),new T.MeshBasicMaterial({color:'#eff7df',transparent:true,opacity:.075,side:T.DoubleSide,depthWrite:false}),body,0,.7,-4.32);
const wheels=new T.Group();body.add(wheels);for(const s of [-1,1]){const strut=dbox(wheels,s*1.1,-.5,-.7,.16,2,.16,steel);strut.rotation.z=s*-.4;const w=mesh(new T.CylinderGeometry(.61,.61,.32,18),rubber,wheels,s*1.5,-1.45,-.7);w.rotation.z=Math.PI/2;const hub=mesh(new T.CylinderGeometry(.25,.25,.35,12),steel,wheels,s*1.5,-1.45,-.7);hub.rotation.z=Math.PI/2;}const tailwheel=mesh(new T.SphereGeometry(.29,10,6),rubber,wheels,0,-.1,4.8);tailwheel.scale.x=.5;
// Little parcel: a direct visual link to the chosen concept.
dbox(body,0,1.8,1.9,1.5,1.25,1.4,mat('#d9b37a'));dbox(body,0,2.44,1.9,.18,.06,1.5,paint);dbox(body,0,2.44,1.9,1.58,.06,.18,paint);for(const s of [-1,1]){const bow=mesh(new T.TorusGeometry(.26,.055,6,16),paint,body,s*.24,2.55,1.9);bow.rotation.x=.7;bow.rotation.y=s*.5;}
const boats=[];for(let i=0;i<6;i++){const g=new T.Group();scene.add(g);const hull=mesh(new T.BoxGeometry(9,2.2,25),mat('#f6e6c5'),g,0,1.5,0);dbox(g,0,3.5,0,7,2.5,16,mat('#f9f2da'));dbox(g,0,5,0,7.5,.4,17,mat('#c7dbe0'));for(const s of [-1,1])for(let j=0;j<5;j++)dbox(g,s*3.52,3.7,-6+j*3,.1,1.3,2,mat('#547b8c'));dbox(g,0,5.5,5,4,.8,4,paint);const wake=mesh(new T.PlaneGeometry(12,35),new T.MeshBasicMaterial({color:'#dbf8ef',transparent:true,opacity:.25,depthWrite:false}),g,0,.3,25);wake.rotation.x=-Math.PI/2;g.scale.setScalar(.4);boats.push({g,t:i/6});}
// Spaced tour route v5: nearby sights are separated by other stops.
const hoopData=[{"lon": 13.398, "lat": 52.474, "y": 30, "name": "Tempelhofer Feld", "icon": "🛫"}, {"lon": 13.41, "lat": 52.486, "y": 65, "name": "Kreuzberg", "icon": "🏘️"}, {"lon": 13.459035, "lat": 52.49697, "y": 30, "name": "Molecule Man", "icon": "🗿"}, {"lon": 13.44565, "lat": 52.50176, "y": 40, "name": "Oberbaumbrücke", "icon": "🌉"}, {"lon": 13.437, "lat": 52.5245, "y": 65, "name": "Klinikum im Friedrichshain", "icon": "🏥"}, {"lon": 13.4084, "lat": 52.5208, "y": 95, "name": "TV Tower", "icon": "🗼"}, {"lon": 13.3875, "lat": 52.522, "y": 50, "name": "Friedrichstraße", "icon": "🚉"}, {"lon": 13.3989, "lat": 52.5196, "y": 48, "name": "Altes Museum", "icon": "🏛️"}, {"lon": 13.414, "lat": 52.5185, "y": 55, "name": "ALEXA", "icon": "🛍️"}, {"lon": 13.401, "lat": 52.5191, "y": 62, "name": "Berlin Cathedral", "icon": "⛪"}, {"lon": 13.3785, "lat": 52.528, "y": 65, "name": "Charité Campus Mitte", "icon": "🏥"}, {"lon": 13.3762, "lat": 52.5186, "y": 55, "name": "Reichstag", "icon": "🏛️"}, {"lon": 13.3695, "lat": 52.5251, "y": 60, "name": "Hauptbahnhof", "icon": "🚉"}, {"lon": 13.3501, "lat": 52.5145, "y": 50, "name": "Victory Column", "icon": "⭐"}, {"lon": 13.334, "lat": 52.506, "y": 60, "name": "Bikini Berlin", "icon": "🛍️"}, {"lon": 13.305, "lat": 52.511, "y": 55, "name": "Charlottenburg", "icon": "🏘️"}, {"lon": 13.2957, "lat": 52.5209, "y": 60, "name": "Charlottenburg Palace", "icon": "🏰"}, {"lon": 13.324, "lat": 52.526, "y": 60, "name": "Moabit", "icon": "🏘️"}, {"lon": 13.344, "lat": 52.528, "y": 55, "name": "Schultheiss-Quartier", "icon": "🛍️"}, {"lon": 13.359, "lat": 52.513, "y": 45, "name": "Tiergarten", "icon": "🌳"}, {"lon": 13.376, "lat": 52.509, "y": 65, "name": "Potsdamer Platz", "icon": "🏙️"}, {"lon": 13.3777, "lat": 52.5163, "y": 48, "name": "Brandenburg Gate", "icon": "🏛️"}, {"lon": 13.382, "lat": 52.508, "y": 60, "name": "Mall of Berlin", "icon": "🛍️"}, {"lon": 13.404, "lat": 52.498, "y": 60, "name": "Landwehrkanal", "icon": "🌊"}, {"lon": 13.395, "lat": 52.48, "y": 60, "name": "Tempelhofer Feld", "icon": "🛬"}].map(p=>({...p,...geo(p.lon,p.lat)}));
const hoops=hoopData.map((p,i)=>{const m=new T.MeshStandardMaterial({color:'#ffc739',metalness:.55,roughness:.25,emissive:'#e5a620',emissiveIntensity:.08,transparent:true});const ring=mesh(new T.TorusGeometry(15,1.2,8,48),m,scene,p.x,p.y,p.z);const prev=i?hoopData[i-1]:TAKEOFF;ring.rotation.y=-Math.atan2(p.x-prev.x,prev.z-p.z);const inside=mesh(new T.TorusGeometry(13.8,.15,4,48),mat('#fff5c0',{emissive:'#fff0a0',emissiveIntensity:.5}),ring);return ring;});
// A broad flight ribbon with large, outlined chevrons; all geometry is reused.
const ribbonGeo=new T.BufferGeometry(),ribbonPositions=new Float32Array(40*2*3),ribbonIndices=[];
for(let i=0;i<39;i++){const n=i*2;ribbonIndices.push(n,n+1,n+2,n+1,n+3,n+2);}
ribbonGeo.setAttribute('position',new T.BufferAttribute(ribbonPositions,3));ribbonGeo.setIndex(ribbonIndices);
const ribbon=new T.Mesh(ribbonGeo,new T.MeshBasicMaterial({color:'#ffd34d',transparent:true,opacity:.38,side:T.DoubleSide,depthWrite:false}));ribbon.frustumCulled=false;scene.add(ribbon);
const arrowShape=new T.Shape();arrowShape.moveTo(0,3.8);arrowShape.lineTo(3.8,-.8);arrowShape.lineTo(2.1,-2.2);arrowShape.lineTo(0,.45);arrowShape.lineTo(-2.1,-2.2);arrowShape.lineTo(-3.8,-.8);arrowShape.closePath();
const arrowGeo=new T.ShapeGeometry(arrowShape),routeArrows=new T.InstancedMesh(arrowGeo,new T.MeshBasicMaterial({color:'#ffe26b',side:T.DoubleSide,depthTest:false}),12),routeOutlines=new T.InstancedMesh(arrowGeo,new T.MeshBasicMaterial({color:'#284d64',side:T.DoubleSide,depthTest:false}),12);
routeArrows.renderOrder=12;routeOutlines.renderOrder=11;routeArrows.frustumCulled=routeOutlines.frustumCulled=false;scene.add(routeArrows,routeOutlines);
function guidePath(){const visible=S.mode==='flight'&&!S.free&&S.stage==='air';ribbon.visible=routeArrows.visible=routeOutlines.visible=visible;if(!visible)return;const p=S.stage==='ground'?{x:TAKEOFF.x+160,y:14,z:TAKEOFF.z}:hoopData[S.next];if(!p){ribbon.visible=routeArrows.visible=routeOutlines.visible=false;return;}const from=new T.Vector3(S.x,S.y,S.z),end=new T.Vector3(p.x,p.y,p.z),len=from.distanceTo(end),forward=new T.Vector3(Math.sin(S.heading),0,-Math.cos(S.heading)),control=from.clone().addScaledVector(forward,Math.min(60,len*.3));control.y=lerp(S.y,p.y,.45);const curve=new T.QuadraticBezierCurve3(from,control,end),begin=Math.min(.7,30/Math.max(1,len));
for(let i=0;i<40;i++){const t=lerp(begin,1,i/39),pos=curve.getPoint(t),tangent=curve.getTangent(t),side=new T.Vector3().crossVectors(tangent,new T.Vector3(0,1,0)).normalize().multiplyScalar(3.5);ribbonPositions.set([pos.x-side.x,pos.y-side.y,pos.z-side.z,pos.x+side.x,pos.y+side.y,pos.z+side.z],i*6);}ribbonGeo.attributes.position.needsUpdate=true;
const count=len<38?0:clamp(Math.round(len/28),3,12);routeArrows.count=routeOutlines.count=count;
for(let i=0;i<count;i++){const t=lerp(begin,.94,(i+.2)/count),pos=curve.getPoint(t),screen=pos.clone().project(camera),ahead=curve.getPoint(Math.min(1,t+.035)).project(camera),dx=ahead.x-screen.x,dy=ahead.y-screen.y,rot=Math.hypot(dx,dy)>.003?Math.atan2(-dx*camera.aspect,dy):0;dummy.position.copy(pos);dummy.quaternion.copy(camera.quaternion);dummy.rotateZ(rot);const size=.8+Math.sin(S.time*5-i*.7)*.12;dummy.scale.setScalar(size);dummy.updateMatrix();routeArrows.setMatrixAt(i,dummy.matrix);dummy.scale.setScalar(size*1.28);dummy.updateMatrix();routeOutlines.setMatrixAt(i,dummy.matrix);}routeArrows.instanceMatrix.needsUpdate=routeOutlines.instanceMatrix.needsUpdate=true;}
const glintsGeo=new T.BufferGeometry(),glintsData=[];for(let i=0;i<250;i++){const p=riverPoint(rnd());glintsData.push(p.x+(rnd()-.5)*3,.15,p.z);}glintsGeo.setAttribute('position',new T.Float32BufferAttribute(glintsData,3));const glints=new T.Points(glintsGeo,new T.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{time:{value:0}},vertexShader:'uniform float time;varying float a;void main(){vec4 p=modelViewMatrix*vec4(position,1.);a=smoothstep(.65,1.,sin(time*1.7+position.x*13.+position.z*7.));gl_PointSize=clamp(220./-p.z,1.,3.5);gl_Position=projectionMatrix*p;}',fragmentShader:'varying float a;void main(){vec2 p=abs(gl_PointCoord-.5);gl_FragColor=vec4(1.,.98,.85,a*(1.-smoothstep(.15,.5,p.x+p.y))*.9);}'}));scene.add(glints);
const fleckGeo=new T.BufferGeometry(),fleckPositions=new Float32Array(180*3),fleckColors=new Float32Array(180*3),fleckVelocity=new Float32Array(180*3);for(let i=0;i<180;i++){const c=new T.Color(['#ffce4b','#f77b68','#ffffff','#7adac3'][i%4]);fleckColors.set([c.r,c.g,c.b],i*3);}fleckGeo.setAttribute('position',new T.BufferAttribute(fleckPositions,3));fleckGeo.setAttribute('color',new T.BufferAttribute(fleckColors,3));const confetti=new T.Points(fleckGeo,new T.PointsMaterial({size:1.1,vertexColors:true,transparent:true,opacity:1,depthWrite:false}));confetti.frustumCulled=false;confetti.visible=false;scene.add(confetti);
let db;try{db=JSON.parse(ArcadeProfile.storage.getItem('berlin-city-flight.v1'));}catch{}
if(!db?.profiles?.length)db={tourVersion:5,current:0,profiles:[{name:ArcadeProfile.name,best:0,resume:null,music:true}]};
db.current=clamp(db.current||0,0,db.profiles.length-1);
if(db.tourVersion!==5){for(const p of db.profiles){p.previousTours={...p.previousTours,[db.tourVersion||'original']:{best:p.best||0,resume:p.resume?{...p.resume}:null}};if(p.resume)p.resume.next=0;p.routeNotice=true;}db.tourVersion=5;}
let save=db.profiles[db.current];
const S={mode:'loading',x:TITLE.x,z:TITLE.z,y:TITLE.y,heading:TITLE.heading,speed:0,turn:0,vy:0,bank:0,time:0,stage:'air',next:0,roll:0,fx:0,toast:0,saveT:0,free:false,invincible:0};let held={},touch={},pad={},menuButtons=[],focus=0,backAction=null,acc=0,last=performance.now(),audio=null,musicT=0,musicI=0,engine,engineGain,navReady=true,renderMs=0,renderFrames=0;
function persist(){try{ArcadeProfile.storage.setItem('berlin-city-flight.v1',JSON.stringify(db));}catch{}}
function snapshot(){if(['flight','pause'].includes(S.mode))save.resume={x:S.x,y:S.y,z:S.z,heading:S.heading,stage:S.stage,speed:S.speed,next:S.next,free:S.free};persist();}
function audioUnlock(){try{if(!audio){audio=new(window.AudioContext||window.webkitAudioContext)();engine=audio.createOscillator();engine.type='triangle';engineGain=audio.createGain();engineGain.gain.value=0;engine.connect(engineGain).connect(audio.destination);engine.start();}if(audio.state==='suspended')audio.resume().catch(()=>{});}catch{}}
function note(freq,d=.18,delay=0){if(!audio||audio.state!=='running')return;const o=audio.createOscillator(),g=audio.createGain(),t=audio.currentTime+delay;o.type='triangle';o.frequency.value=freq;g.gain.setValueAtTime(.001,t);g.gain.exponentialRampToValueAtTime(.06,t+.015);g.gain.exponentialRampToValueAtTime(.001,t+d);o.connect(g).connect(audio.destination);o.start(t);o.stop(t+d+.02);}
function burst(big=false){S.fx=big?5:1.2;confetti.visible=true;for(let i=0;i<180;i++){fleckPositions.set([S.x,S.y,S.z-8],i*3);fleckVelocity.set([(rnd()-.5)*(big?28:18),rnd()*22,(rnd()-.5)*24],i*3);}fleckGeo.attributes.position.needsUpdate=true;[523,659,784,1047].forEach((f,i)=>note(f,.25,i*.1));}
function toast(t){$('#toast').textContent=t;S.toast=2.5;}
function escapeHTML(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function focusButton(n){focus=(n+menuButtons.length)%menuButtons.length;menuButtons.forEach((b,i)=>b.classList.toggle('focus',i===focus));menuButtons[focus]?.focus({preventScroll:true});menuButtons[focus]?.scrollIntoView({block:'nearest'});}
function menu(mode,html,back,initial=0){S.mode=mode;S.toast=0;$('#toast').textContent='';$('#overlay').className=mode==='title'?'':'modal';$('#overlay').innerHTML=html;$('#hud').classList.add('hidden');$('#pause').classList.add('hidden');$('#guide').classList.add('hidden');$('#touch').classList.add('hidden');menuButtons=[...$('#overlay').querySelectorAll('button')];backAction=back;held={};touch={};navReady=false;focusButton(initial);}
function bind(id,fn){$('#'+id).onclick=()=>{audioUnlock();fn();};}
function title(){S.mode='title';S.x=TITLE.x;S.z=TITLE.z;S.y=TITLE.y;S.heading=TITLE.heading;S.bank=0;S.stage='air';S.next=0;S.speed=0;positionCamera(true);menu('title',`<section class="card intro"><p class="eyebrow">The big Berlin tour</p><h1>The real city.<br>A bigger flight.</h1><p>Fly over real Berlin streets, neighborhoods, hospitals and landmarks. Follow ${hoopData.length} golden hoops.</p>${save.routeNotice?'<p>Nearby sights are now spread through the tour. Your saved plane position is kept; the reordered route starts at stop 1.</p>':''}<button id="play"><span class="key">A</span> ${save.resume?'Continue flying':'Let’s fly'}</button><p class="controls">A / Space — fly · Directions — turn & climb<br>X — barrel roll · B / Esc — pause</p></section>`,()=>{});bind('play',()=>start(!!save.resume));}
function showPause(){if(S.mode==='flight')snapshot();menu('pause',`<section class="card"><p class="eyebrow">Berlin City Flight</p><h2>A little breather</h2><div class="actions vertical"><button id="resume">▶ Keep flying</button><button id="restart">🛫 Start at the runway</button><button id="scenic">☀ Scenic flight</button><button id="profiles">👤 Who is flying?</button><button id="music">${save.music?'♫':'🔇'} Music ${save.music?'on':'off'}</button><button id="graphics">Graphics: ${quality}</button><button id="places">⌖ Explore places</button><button id="cities">🌍 Choose a city</button><button id="arcade">↩ Arcade</button></div></section>`,resume);bind('resume',resume);bind('restart',()=>start(false));bind('scenic',()=>start(false,true));bind('profiles',profiles);bind('music',()=>{save.music=!save.music;persist();showPause();focusButton(4);});bind('graphics',()=>{quality=qualityModes[(qualityModes.indexOf(quality)+1)%qualityModes.length];try{ArcadeProfile.storage.setItem('berlin-city-flight.graphics',quality);}catch{}resize();showPause();focusButton(5);});bind('places',()=>placesMenu());bind('cities',()=>{snapshot();location.replace('world-flight/index.html?from=berlin');});bind('arcade',()=>{snapshot();location.href='index.html';});}
function placesMenu(category=null){
 const spots=category?cityPOIs.filter(p=>p.type===category).sort((a,b)=>Math.hypot(a.x-S.x,a.z-S.z)-Math.hypot(b.x-S.x,b.z-S.z)).slice(0,30):[...featured,...landmarkModels];
 const categories=[['hospital','Hospitals'],['mall','Shopping centers'],['university','Universities'],['library','Libraries']];
 menu('places',`<section class="card"><h2>${category?'Nearby places':'Explore Berlin'}</h2><p>${category?'Listed nearest to your plane':'Real locations across the city'}</p>${category?'':`<div class="actions">${categories.map(([id,label])=>`<button id="cat-${id}">${label}</button>`).join('')}</div>`}<div class="actions vertical">${spots.map((p,i)=>`<button id="place${i}">${escapeHTML(p.name)}</button>`).join('')}<button id="places-back">↩ Back</button></div></section>`,category?()=>placesMenu():showPause);
 spots.forEach((p,i)=>bind('place'+i,()=>{start(false,true);const heading=p.heading??0,distance=p.approach??90,side=p.sideOffset||0;Object.assign(S,{x:p.x-Math.sin(heading)*distance-Math.cos(heading)*side,z:p.z+Math.cos(heading)*distance+Math.sin(heading)*side,y:p.altitude??Math.max(45,(p.y||35)+15),heading});positionCamera(true);snapshot();toast(p.name);}));
 if(!category)categories.forEach(([id])=>bind('cat-'+id,()=>placesMenu(id)));bind('places-back',category?()=>placesMenu():showPause);
}
function profiles(){ArcadeProfile.switchPlayer();}
function start(restore=false,free=false){if(!startupReady)return;save.routeNotice=false;const r=restore?save.resume:null;Object.assign(S,{x:r?.x??(free?TITLE.x:TAKEOFF.x),z:r?.z??(free?TITLE.z:TAKEOFF.z),y:r?.y??(free?TITLE.y:3.3),heading:r?.heading??(free?TITLE.heading:TAKEOFF.heading),stage:r?.stage??(free?'air':'ground'),speed:r?.speed??0,next:clamp(r?.next??0,0,hoopData.length-1),free:r?.free??free,turn:0,vy:0,bank:0,roll:0,fx:0,invincible:0,saveT:0});confetti.visible=false;resume();positionCamera(true);snapshot();}
function resume(){S.mode='flight';$('#overlay').innerHTML='';$('#overlay').className='';$('#pause').classList.remove('hidden');$('#hud').classList.remove('hidden');$('#guide').classList.remove('hidden');$('#touch').classList.remove('hidden');held={};touch={};updateHUD();}
function back(){if(S.mode==='flight')showPause();else backAction?.();}
function confirm(){if(S.mode!=='flight'&&document.activeElement?.tagName!=='INPUT')menuButtons[focus]?.click();}
function finish(){save.best=hoopData.length;save.resume=null;persist();burst(true);menu('clear',`<section class="card"><p class="eyebrow">${hoopData.length} golden hoops · Berlin</p><h2>Wonderful flying,<br>${escapeHTML(save.name)}!</h2><div class="medal">🏅</div><p>From the Cathedral to Brandenburg Gate — you explored Berlin!</p><div class="actions"><button id="again"><span class="key">A</span> Keep exploring</button><button id="runway">🛫 Fly again</button></div></section>`,()=>start(false,true));bind('again',()=>start(false,true));bind('runway',()=>start(false));}
function updateHUD(){$('#hud').classList.toggle('hidden',S.free);$('#guide').classList.toggle('scenic',S.free);$('#hud').textContent=S.free?'':(hoopData[S.next]?.icon||'🏅')+' '+(hoopData[S.next]?.name||'Berlin explored');if(S.stage==='ground'){$('#guide').innerHTML='<span class="key">A</span> ➜ 🛩️ &nbsp; ⬆ 🛫';return;}if(S.free){$('#guide').innerHTML='🕹️ ↔ ↕ &nbsp; <span class="key">A</span> ✈ &nbsp; X ↻';return;}const p=hoopData[S.next];if(!p)return;const a=angle(Math.atan2(p.x-S.x,S.z-p.z)-S.heading),dy=p.y-S.y;const near=Math.hypot(p.x-S.x,p.z-S.z)<70,turn=Math.abs(a)>.22?(Math.abs(a)>2?'↶':a>0?'➜':'⬅'):'◎',vertical=Math.abs(dy)>10?(dy>0?'⬆':'⬇'):'';$('#guide').innerHTML='<span class="direction">'+turn+'</span>'+(vertical?'<span class="direction climb">'+vertical+'</span>':'')+'<span class="next-hoop">◎ <small>'+ (S.next+1)+'/'+hoopData.length+'</small></span><span class="guide-words">'+(Math.abs(a)>2?'Turn around':Math.abs(a)>.22?(a>0?'Turn right':'Turn left'):vertical?(dy>0?'Fly up':'Fly down'):near?'Through the hoop!':'Follow the golden path')+'</span>';}

function angle(a){return Math.atan2(Math.sin(a),Math.cos(a));}
function doRoll(){if(S.mode==='flight'&&S.stage==='air'&&S.roll<=0){S.roll=1.1;note(440,.25);note(660,.2,.15);}}
function input(){if(!startupReady)return;pad={};for(const p of GamepadStd.read('berlin-city-flight')){if(p.any)audioUnlock();if(p.index!==0)continue;pad=p;if(p.just.B||p.just.start){back();continue;}if(p.just.X)doRoll();if(p.just.A){confirm();continue;}if(S.mode!=='flight'&&document.activeElement?.tagName!=='INPUT'){if(!p.left&&!p.right&&!p.up&&!p.down)navReady=true;if(navReady){const n=GamepadStd.navRepeat(p,'berlin-menu');if(n.left||n.up)focusButton(focus-1);if(n.right||n.down)focusButton(focus+1);}}}}
addEventListener('keydown',e=>{if(!startupReady)return;if(e.target.tagName==='INPUT')return;if(['Space','Enter','ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Escape','KeyP','KeyX'].includes(e.code))e.preventDefault();audioUnlock();held[e.code]=true;if(e.repeat)return;if(e.code==='Escape'||e.code==='KeyP')back();else if(e.code==='Space'||e.code==='Enter')confirm();else if(e.code==='KeyX')doRoll();else if(S.mode!=='flight'){if(e.code==='ArrowLeft'||e.code==='ArrowUp')focusButton(focus-1);if(e.code==='ArrowRight'||e.code==='ArrowDown')focusButton(focus+1);}});addEventListener('keyup',e=>delete held[e.code]);
$('#pause').onclick=showPause;for(const b of document.querySelectorAll('[data-input]')){b.onpointerdown=e=>{e.preventDefault();audioUnlock();touch[b.dataset.input]=true;if(b.dataset.input==='X')doRoll();b.setPointerCapture(e.pointerId);};for(const event of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(event,()=>touch[b.dataset.input]=false);}
addEventListener('pointerdown',e=>{audioUnlock();if(e.pointerType==='touch')document.body.classList.add('touch');});if(matchMedia('(pointer:coarse)').matches)document.body.classList.add('touch');
function hide(){held={};touch={};if(S.mode==='flight')showPause();}addEventListener('blur',hide);document.addEventListener('visibilitychange',()=>{if(document.hidden)hide();});addEventListener('pagehide',snapshot);addEventListener('arcade-exit',snapshot);
function update(dt){S.time+=dt;if(S.toast>0&&(S.toast-=dt)<=0)$('#toast').textContent='';if(S.mode==='flight'){
 const gas=held.Space||held.Enter||touch.A||pad.A,right=(held.ArrowRight||touch.right||pad.right?1:0)-(held.ArrowLeft||touch.left||pad.left?1:0),up=(held.ArrowUp||touch.up||pad.up?1:0)-(held.ArrowDown||touch.down||pad.down?1:0),ground=S.stage==='ground';S.speed=lerp(S.speed,gas?40:ground?0:14,1-Math.exp(-1.9*dt));S.turn=lerp(S.turn,right*(ground?.24:.96),1-Math.exp(-5*dt));S.heading=angle(S.heading+S.turn*dt);S.bank=lerp(S.bank,ground?0:-S.turn*.46,1-Math.exp(-5*dt));S.vy=lerp(S.vy,up*21,1-Math.exp(-5*dt));S.x+=Math.sin(S.heading)*S.speed*dt;S.z-=Math.cos(S.heading)*S.speed*dt;
 if(ground){S.heading=clamp(S.heading,TAKEOFF.heading-.15,TAKEOFF.heading+.15);S.z=clamp(S.z,TAKEOFF.z-(S.x-TAKEOFF.x)*.071-6,TAKEOFF.z-(S.x-TAKEOFF.x)*.071+6);S.y=3.3;if(S.speed>18&&(up>0||S.x>TAKEOFF.x+150)){S.stage='air';S.y=8;toast('🛫  Up we go!');note(523);}}
 else {S.y=clamp(S.y+S.vy*dt,8,225);S.invincible=Math.max(0,S.invincible-dt);if(S.invincible<=0){const o=nearbyObstacles(S.x,S.z).find(o=>Math.abs(S.x-o.x)<o.w&&Math.abs(S.z-o.z)<o.d&&S.y<o.h);if(o){S.y=o.h+3;S.speed*=.7;S.invincible=1;toast('☁️  Whoosh!');}}if(!S.free){const p=hoopData[S.next];if(p&&Math.hypot(S.x-p.x,S.z-p.z)<75&&Math.abs(angle(Math.atan2(p.x-S.x,S.z-p.z)-S.heading))<.6){if(!up)S.y=lerp(S.y,p.y,dt*.9);if(!right)S.heading+=angle(Math.atan2(p.x-S.x,S.z-p.z)-S.heading)*dt*.18;}if(p&&Math.hypot(S.x-p.x,S.y-p.y,S.z-p.z)<22){hoops[S.next].visible=false;S.next++;save.best=Math.max(save.best||0,S.next);if(S.next===hoopData.length)finish();else{burst();toast((p.icon||'★')+' '+p.name+'  ✓');snapshot();}}}
 if(S.x<-2400||S.x>3850||S.z>2050||S.z<-1020){const a=angle(Math.atan2(-S.x,S.z+300)-S.heading);S.heading+=Math.sign(a)*dt*.7;}
 }S.roll=Math.max(0,S.roll-dt);S.saveT+=dt;if(S.saveT>1){S.saveT=0;snapshot();updateHUD();}if(Math.floor(S.time*10)!==Math.floor((S.time-dt)*10))updateHUD();}
 if(S.fx>0){S.fx-=dt;for(let i=0;i<180;i++){fleckPositions[i*3]+=fleckVelocity[i*3]*dt;fleckPositions[i*3+1]+=fleckVelocity[i*3+1]*dt;fleckPositions[i*3+2]+=fleckVelocity[i*3+2]*dt;fleckVelocity[i*3+1]-=7*dt;}fleckGeo.attributes.position.needsUpdate=true;confetti.material.opacity=Math.min(1,S.fx);if(S.fx<=0)confetti.visible=false;}
 if(audio){engineGain.gain.setTargetAtTime(S.mode==='flight'?.012:0,audio.currentTime,.12);engine.frequency.setTargetAtTime(45+S.speed*2.5,audio.currentTime,.15);if(S.mode==='flight'&&save.music&&(musicT-=dt)<=0){musicT=.38;note(196*Math.pow(2,[0,4,7,12,9,7,4,2][musicI++%8]/12),.19);}}
}
function positionCamera(snap=false){const fov=54+clamp((S.speed-14)/26,0,1)*8;if(Math.abs(camera.fov-fov)>.05){camera.fov=lerp(camera.fov,fov,snap?1:.12);camera.updateProjectionMatrix();}aircraft.position.set(S.x,S.y,S.z);aircraft.rotation.y=-S.heading;body.rotation.z=S.bank+(S.roll>0?(1-S.roll/1.1)*TAU:0);body.rotation.x=-S.vy*.012;const sy=Math.sin(S.heading),cy=Math.cos(S.heading);const followDistance=29*Math.max(1,1.1/camera.aspect);desired.set(S.x-sy*followDistance,S.y+(S.stage==='ground'?8:11),S.z+cy*followDistance);camera.position.lerp(desired,snap?1:.13);look.set(S.x+sy*45,S.y+1,S.z-cy*45);camera.lookAt(look);}
function render(){const t0=performance.now();positionCamera();guidePath();glints.material.uniforms.time.value=S.time;propeller.rotation.z=S.time*(S.mode==='flight'?38+S.speed*2:30);propdisk.visible=S.speed>10;water.material.uniforms.time.value=S.time*.32;for(const b of boats){const p=riverPoint(b.t+S.time*.002);b.g.position.set(p.x,0,p.z);b.g.rotation.y=p.heading;}hoops.forEach((h,i)=>{h.visible=!S.free&&(i>=S.next&&i<=S.next+2);h.material.emissiveIntensity=i===S.next?.22+.16*Math.sin(S.time*2):.02;h.material.opacity=S.free||i===S.next?1:.36;h.scale.setScalar(i===S.next?1+Math.sin(S.time*2)*.025:1);});sun.target.position.set(S.x,0,S.z-120);sun.position.set(S.x-330,430,S.z+70);sun.target.updateMatrixWorld();sky.position.copy(camera.position);for(const label of cityLabels)label.visible=label.position.distanceTo(camera.position)<280;renderCount++;renderer.shadowMap.needsUpdate=renderCount<3||renderCount%3===0;renderer.render(scene,camera);renderMs+=performance.now()-t0;renderFrames++;}
function frame(now){const dt=Math.max(0,Math.min(.05,(now-last)/1000));last=now;input();acc+=dt;let n=0;while(acc>=1/120&&n++<8){update(1/120);acc-=1/120;}if(n>=8)acc=0;render();requestAnimationFrame(frame);}
$('#view').addEventListener('webglcontextlost',e=>{e.preventDefault();hide();$('#error').classList.remove('hidden');$('#error').innerHTML='<section class="card"><h2>Let’s try again</h2><p>Your flight is saved.</p><button onclick="location.reload()">↻ Reload flight</button></section>';$('#error button').focus();});
async function waitForGraphics(){
 const gl=renderer.getContext();
 if(gl.fenceSync){
  const fence=gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE,0);gl.flush();
  try{for(;;){if(gl.isContextLost())throw new Error('Graphics context lost during loading');const status=gl.clientWaitSync(fence,0,0);if(status===gl.WAIT_FAILED)throw new Error('Graphics preparation failed');if(status!==gl.TIMEOUT_EXPIRED)break;await new Promise(resolve=>setTimeout(resolve,16));}}
  finally{gl.deleteSync(fence);}
 }else gl.finish();
}
async function prepareGraphics(){
 const objects=[];scene.traverse(o=>{if(o.isMesh||o.isPoints||o.isLine||o.isSprite)objects.push({o,visible:o.visible,culled:o.frustumCulled});});
 const textures=new Set();for(const {o} of objects)for(const material of (Array.isArray(o.material)?o.material:[o.material])){if(!material)continue;for(const v of Object.values(material))if(v?.isTexture&&!v.isRenderTargetTexture)textures.add(v);for(const u of Object.values(material.uniforms||{}))if(u.value?.isTexture&&!u.value.isRenderTargetTexture)textures.add(u.value);}
 const oldReflect=water.onBeforeRender,initialState={...S},warmTarget=new T.WebGLRenderTarget(32,32);
 try{
  await loadingStage(65,'Preparing colors and textures…');
  for(const tex of textures){renderer.initTexture(tex);startup.uploadedTextures++;if(startup.uploadedTextures%8===0)await loadingWork(65+5*startup.uploadedTextures/textures.size,'Preparing colors and textures…');}
  positionCamera(true);scene.updateMatrixWorld(true);
  // Include normally hidden effects in shader compilation so their first use is ready too.
  for(const {o} of objects)o.visible=true;
  await loadingStage(71,'Preparing lighting and reflections…');
  await renderer.compileAsync(scene,camera);
  // A small real render uploads every geometry, even scenery outside the starting view.
  // Keep the default framebuffer so output-color and tone-mapping variants match gameplay.
  renderer.setSize(64,64,false);water.onBeforeRender=()=>{};
  for(const {o} of objects){o.visible=false;o.frustumCulled=false;}
  for(let i=0;i<objects.length;i+=64){
   const batch=objects.slice(i,i+64),shown=new Set();for(const {o} of batch){for(let node=o;node&&node!==scene;node=node.parent){if(!node.visible){node.visible=true;shown.add(node);}}}
   renderer.shadowMap.needsUpdate=true;renderer.render(scene,camera);
   renderer.setRenderTarget(warmTarget);renderer.render(scene,camera);renderer.setRenderTarget(null);
   await waitForGraphics();
   for(const node of shown)node.visible=false;
   startup.uploadedObjects+=batch.length;
   await loadingStage(74+16*startup.uploadedObjects/objects.length,'Getting the city ready to fly…');
  }
 }finally{
  for(const {o,visible,culled} of objects){o.visible=visible;o.frustumCulled=culled;}
  renderer.setRenderTarget(null);warmTarget.dispose();water.onBeforeRender=oldReflect;resize();Object.assign(S,initialState);
 }
 const views=[{...TAKEOFF,y:3.3,stage:'ground'},...hoopData.map(p=>({...p,heading:0,stage:'air'})),...(save.resume?[save.resume]:[]),{...TITLE,stage:'air'}];
 for(let i=0;i<views.length;i++){
  await loadingStage(91+7*i/views.length,'Checking the starting views…');
  Object.assign(S,views[i],{mode:'loading'});positionCamera(true);renderCount=0;
  render();await waitForGraphics();render();await waitForGraphics();startup.warmViews++;
 }
 Object.assign(S,initialState);positionCamera(true);
 await loadingStage(100,'Ready for takeoff!');
 startup.ready=true;startup.shaderPrograms=renderer.info.programs.length;startup.geometryCount=renderer.info.memory.geometries;startup.elapsedMs=performance.now()-startup.startedAt;
 renderMs=0;renderFrames=0;held={};touch={};acc=0;
 // Consume buttons held during loading; starting requires a fresh confirm press.
 GamepadStd.read('berlin-city-flight');
 startupReady=true;
 document.querySelector('#loading').remove();
}
await prepareGraphics();
if(new URLSearchParams(location.search).has('test'))window.BerlinTest={get state(){return {...S,startup:{...startup},shaderPrograms:renderer.info.programs.length,geometryCount:renderer.info.memory.geometries,focus:menuButtons[focus]?.id,save,profile:db.current,mapBuildings:buildings.length,mapPlaces:cityPOIs.length,quality,canvasSize:[renderer.domElement.width,renderer.domElement.height],drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles,meanRender:renderMs/Math.max(1,renderFrames)};},step:n=>{input();for(let i=0;i<n;i++)update(1/120);},set:v=>{Object.assign(S,v);positionCamera(true);},start,render,hoops:hoopData,river:riverX};
title();persist();last=performance.now();acc=0;requestAnimationFrame(frame);
})().catch(error=>{console.error(error);const panel=document.querySelector('#error');panel.classList.remove('hidden');panel.innerHTML='<section class="card"><h2>Could not load Berlin</h2><p>Try reloading the game in a recent browser.</p><button onclick="location.reload()">Reload</button></section>';});
