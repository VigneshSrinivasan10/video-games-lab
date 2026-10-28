

/* City Flight: compact landmark tours. Three.js r160 and Water are embedded under MIT.
   Map data © OpenStreetMap contributors (ODbL 1.0), from regional OSM extracts; snapshot sources and dates are stored in the packaged maps.
   Footprints and roads are mapped; untagged heights and facade appearances are stylized. Map data is loaded for the selected city only. Map geometry is merged in spatial chunks; repeated scenery is instanced. Controls use GamepadStd. */
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
const cityList=await fetch('cities.json').then(r=>{if(!r.ok)throw new Error('City list unavailable');return r.json();});
const cityId=new URLSearchParams(location.search).get('city')||'paris',CITY=cityList.find(c=>c.id===cityId);
if(!CITY)throw new Error('Unknown city');
document.title=CITY.name+' · City Flight';document.querySelector('.city').textContent=CITY.name.toUpperCase();document.querySelector('.footer').textContent=CITY.name.toUpperCase()+' · THE GRAND TOUR';
const mapResponse=await fetch('data/'+CITY.id+'.bin');if(!mapResponse.ok)throw new Error('City map unavailable');const mapBytes=await mapResponse.arrayBuffer();
const CITY_MAP=await new Response(new Blob([mapBytes]).stream().pipeThrough(new DecompressionStream('gzip'))).json();
await loadingStage(10,'Building '+CITY.name+'’s neighborhoods…');
const $=s=>document.querySelector(s),T=THREE,clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),lerp=(a,b,t)=>a+(b-a)*t,TAU=Math.PI*2;
let seed=92731;function rnd(){seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;}
const scene=new T.Scene();scene.fog=new T.FogExp2('#c4e2ed',.00062);
let renderer;
try{renderer=new T.WebGLRenderer({canvas:$('#view'),antialias:true,powerPreference:'high-performance'});}catch(e){$('#error').classList.remove('hidden');$('#error').innerHTML='<section class="card"><h2>This scene needs 3D graphics</h2><p>Please enable hardware acceleration in your browser, or try Chrome on another device.</p><button onclick="location.href=\'index.html\'">↩ Arcade</button></section>';$('#error button').focus();return;}
renderer.setPixelRatio(1);renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.04;renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.shadowMap.autoUpdate=false;
const camera=new T.PerspectiveCamera(54,1,1,4200),look=new T.Vector3(),desired=new T.Vector3();
const qualityModes=['Balanced','High','Performance'];let quality='Balanced';try{const stored=ArcadeProfile.storage.getItem('world-flight.graphics');if(qualityModes.includes(stored))quality=stored;}catch{}
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
const isRome=CITY.id==='rome',isVenice=CITY.id==='venice',isBengaluru=CITY.id==='bengaluru';
const facadeColors=isBengaluru?['#ecd8b8','#e8d9c7','#c1cfc7','#f0e5d3','#d7b8ac','#bad0d0','#e5cca4','#c8d8df']:['#e9d4ad','#f4ddb6','#d5bba0','#ecd9bf','#dfa995','#c3d5ce','#efcd8e','#b9cdd5'];
const facades=facadeColors.map((color,n)=>new T.MeshStandardMaterial({roughness:.9,map:texture((c,w,h)=>{
 c.fillStyle=(isRome||isVenice)&&n===3?'#fff7e8':color;c.fillRect(0,0,w,h);const floors=isVenice?3:isRome?4:4+n%3,cols=isVenice?3:3+n%2,fh=h/floors,cw=w/cols;
 for(let j=0;j<floors;j++){
  c.fillStyle='#725d4930';c.fillRect(0,j*fh+fh-5,w,5);c.fillStyle='#fff3d299';c.fillRect(0,j*fh+fh-6,w,2);
  for(let k=0;k<cols;k++){const x=k*cw+cw*.24,y=j*fh+9,ww=cw*(isVenice?.36:.48),hh=fh-21;
   c.fillStyle='#786f61';c.fillRect(x-3,y-3,ww+6,hh+7);c.fillStyle='#f3e4c8';c.fillRect(x-2,y-2,ww+4,hh+4);
   const glass=c.createLinearGradient(0,y,0,y+hh);glass.addColorStop(0,'#344e61');glass.addColorStop(1,(j+k+n)%5===0?'#bea77c':'#83a4af');c.fillStyle=glass;c.fillRect(x,y,ww,hh);
   if(isVenice){c.fillStyle='#fff2d6';c.beginPath();c.moveTo(x-3,y+8);c.quadraticCurveTo(x+ww/2,y-11,x+ww+3,y+8);c.lineTo(x+ww+3,y+12);c.quadraticCurveTo(x+ww/2,y-4,x-3,y+12);c.fill();c.fillStyle='#485d55';c.fillRect(x-8,y+10,5,hh-10);c.fillRect(x+ww+3,y+10,5,hh-10);}if(isRome){c.fillStyle='#526850';c.fillRect(x-9,y,6,hh);c.fillRect(x+ww+3,y,6,hh);}c.fillStyle='#e9dec8';c.fillRect(x+ww*.48,y,2,hh);if(n%2)c.fillRect(x,y+hh*.45,ww,2);
   c.fillStyle='#fff1d1';c.fillRect(x-4,y+hh,ww+8,3);
   if(n%3===0&&j<floors-1){c.fillStyle='#424f5670';c.fillRect(x-5,y+hh+3,ww+10,6);}
  }
 }
 const shade=c.createLinearGradient(0,0,0,h);shade.addColorStop(0,'#45362638');shade.addColorStop(.12,'#45362600');shade.addColorStop(.75,'#45362600');shade.addColorStop(1,'#45362645');c.fillStyle=shade;c.fillRect(0,0,w,h);
 c.fillStyle='#f2dfbf';c.fillRect(0,0,w,5);c.fillStyle='#3c535b';c.fillRect(w*.43,h-30,w*.14,30);c.fillStyle='#d6c5a2';c.fillRect(w*.50,h-28,2,26);
})}));
const grassTex=texture((c,w,h)=>{c.fillStyle='#8fae63';c.fillRect(0,0,w,h);for(let i=0;i<13000;i++){c.fillStyle=rnd()<.5?'#b6c77b30':'#527d4030';c.fillRect(rnd()*w,rnd()*h,2,2);}});grassTex.wrapS=grassTex.wrapT=T.RepeatWrapping;grassTex.repeat.set(80,80);
// Real map geometry: local east/north projection, uniformly scaled for flight.
const geo=(lon,lat)=>({x:(lon-CITY.origin[0])*111320*Math.cos(CITY.origin[1]*Math.PI/180)*.36,z:(CITY.origin[1]-lat)*111320*.36});
const first=geo(CITY.landmarks[0].lon,CITY.landmarks[0].lat);
const TITLE={x:first.x-55,z:first.z+150,y:Math.max(46,CITY.landmarks[0].height*.36+20),heading:0};
const TAKEOFF={...TITLE};
const nw=geo(CITY.bounds[0],CITY.bounds[3]),se=geo(CITY.bounds[2],CITY.bounds[1]);
const obstacles=[],cityChunks=[],cityLabels=[];
const ground=new T.Mesh(new T.PlaneGeometry(11000,11000),mat('#c7c8b3',{roughness:1}));ground.rotation.x=-Math.PI/2;ground.position.y=-.6;ground.receiveShadow=true;scene.add(ground);
const copper='#548f7d',stone='#d8c7a5',gold='#d7ae42';
const trees=[];
// Model helpers from the original game are retained for landmark silhouettes.
function tree(x,z,h=14,variant=0){trees.push({x,z,h});if(isBengaluru&&variant===0){cylinder(x,h*.55,z,.35,h*1.1,'#94724f');for(let j=0;j<6;j++){const a=j*TAU/6;stamp(leafGeo,mat('#51845c',{flatShading:true}),x+Math.cos(a)*h*.22,h*1.05,z+Math.sin(a)*h*.22,h*.38,h*.08,h*.12,-a);}return;}if(isRome&&variant%3===0){cylinder(x,h*.4,z,.35,h*.8,'#8a7952');sphere(x,h*.8,z,h*.19,h*.7,h*.19,'#49684b');return;}cylinder(x,h*.25+3,z,.6,h*.5,'#8a7952');const greens=['#7eaa38','#91b540','#5d983d','#a8b74b','#669b46'];for(let j=0;j<2;j++){const a=j*2.4+variant,xx=x+Math.cos(a)*h*.18,zz=z+Math.sin(a)*h*.16;stamp(leafGeo,mat(greens[(variant+j)%5],{flatShading:true}),xx,h*.68+3+(j%2)*h*.13,zz,h*(.27+rnd()*.1),h*(.29+rnd()*.12),h*.32,rnd()*3);}}
function plaza(x,z,w,d){box(x,1.1,z,w,2,d,'#d9d3b9');box(x,2.2,z,w-8,.2,d-8,'#e9dec5');for(let j=-2;j<=2;j++)box(x+j*w/6,2.35,z,.7,.1,d-10,'#c4bda5');}
function greenDome(x,y,z,r,h){const profile=[];for(let j=0;j<=12;j++){const a=j*Math.PI/24;profile.push(new T.Vector2(Math.cos(a)*r,Math.sin(a)*h));}stamp(new T.LatheGeometry(profile,24),mat(copper,{metalness:.2,roughness:.55}),x,y,z);for(let j=0;j<12;j++){const a=j*TAU/12;let prev=new T.Vector3(x+r*Math.cos(a),y,z+r*Math.sin(a));for(let k=1;k<=6;k++){const b=k*Math.PI/12,p=new T.Vector3(x+r*Math.cos(b)*Math.cos(a),y+h*Math.sin(b),z+r*Math.cos(b)*Math.sin(a));beam(prev,p,.25,'#90b4a0');prev=p;}}cylinder(x,y+h+3,z,r*.12,6,'#d8c8a7');sphere(x,y+h+6,z,r*.15,2.5,r*.15,copper);box(x,y+h+11,z,.5,7,.5,gold);box(x,y+h+12,z,4,.5,.5,gold);}
// Landmark silhouettes use metre dimensions at the same scale as the street map.
const landmarkModels=CITY.landmarks.map((l,index)=>{const bridge=['bridge','suspension','rialto','sighs'].includes(l.kind),boost=l.mapped?1:bridge?1:Math.max(l.width,l.depth)<45?1.85:l.height>150?1.08:1.35,vertical=l.mapped?1:bridge?1.8:boost;const a=l.angle||0,wx=(Math.abs(Math.cos(a))*l.width+Math.abs(Math.sin(a))*l.depth)*.18*boost,dz=(Math.abs(Math.sin(a))*l.width+Math.abs(Math.cos(a))*l.depth)*.18*boost;return {...l,index,...geo(l.lon,l.lat),boost,vertical,wx,dz,modelHeight:l.height*.36*vertical,r:Math.hypot(wx,dz),y:l.height*.36*vertical+22};});
const extraPlaces=[],featured=[];
const coneCache=new Map();
function cone(x,y,z,r,h,c,n=12){const key=n;let g=coneCache.get(key);if(!g){g=new T.ConeGeometry(1,1,n);coneCache.set(key,g);}stamp(g,mat(c),x,y,z,r,h,r,n===4?Math.PI/4:0);}
function makeLandmark(l){
 const w=l.width,d=l.depth,h=l.height,k=l.kind,cream='#e1d2b6',trim='#f3e6cd',dark='#53646a',bronze='#866342',brick='#ab7158',glass='#83bcc8';
 const B=(x,y,z,a,b,c,col=cream)=>box(x,y,z,a,b,c,col),C=(x,y,z,r,hh,col=cream)=>cylinder(x,y,z,r,hh,col);
 const rod=(a,b,r=.7,col=bronze)=>beam(new T.Vector3(...a),new T.Vector3(...b),r,col);
 const dome=(x,y,z,r,hh,col='#67998a')=>{stamp(sphereGeo,mat(col,{metalness:.25}),x,y,z,r,hh,r);C(x,y+hh+3,z,1.2,6,gold);};
 const cols=(ww,zz,yy,hh,n)=>{for(let j=0;j<n;j++)C(-ww/2+j*ww/(n-1),yy,zz,1.3,hh,trim);};
 const block=(hh=h*.65)=>{B(0,hh/2,0,w,hh,d,facades[0]);B(0,hh,0,w+2,2,d+2,trim);roof(0,hh,0,w+3,h*.12,d+3,dark);};
 const tower=(x,z,hh,r=6,spire=true)=>{B(x,hh*.38,z,r*2,hh*.76,r*2,facades[0]);B(x,hh*.76,z,r*2.2,2,r*2.2,trim);if(spire)cone(x,hh*.88,z,r*1.5,hh*.24,dark,4);else B(x,hh*.88,z,r*2,hh*.24,r*2,cream);};
 // Bengaluru: domed civic architecture, timber galleries, a glasshouse and cricket ground.
 if(k==='vidhana'){
  B(0,h*.26,0,w,h*.52,d,cream);B(0,h*.53,0,w+3,2,d+3,trim);
  for(const z of [-d*.501,d*.501])for(const y of [h*.16,h*.38])for(let i=0;i<22;i++)B((i-10.5)*w*.042,y,z,w*.019,h*.12,.3,'#5c675d');
  for(const x of [-w*.4,w*.4])for(const z of [-d*.35,d*.35]){B(x,h*.34,z,w*.15,h*.68,d*.22,cream);dome(x,h*.72,z,w*.055,h*.13,cream);}
  B(0,h*.57,0,w*.22,h*.18,d*.28,cream);dome(0,h*.79,0,w*.095,h*.19,cream);
  for(let i=0;i<14;i++){const x=(i-6.5)*w*.055;C(x,h*.28,d*.53,1.5,h*.38,trim);}
  for(let i=0;i<8;i++)B(0,i*.6,d*.6+(7-i)*2,w*.45,.6,4,trim);return;
 }
 if(k==='redcivic'){
  B(0,h*.38,0,w,h*.76,d,'#b94e40');B(0,h*.77,0,w+2,1.5,d+2,'#e5c6a8');roof(0,h*.79,0,w,h*.2,d,'#a74739');
  for(let i=0;i<12;i++)C((i-5.5)*w*.07,h*.34,d*.53,1.25,h*.6,'#edceae');
  roof(0,h*.83,d*.49,w*.33,h*.17,d*.16,'#e6c6a8');return;
 }
 if(k==='timberpalace'){
  for(const x of [-w*.4,w*.4])B(x,h*.38,0,w*.2,h*.76,d,'#c49b6d');
  B(0,h*.48,0,w,.9,d,'#8f633e');roof(0,h*.78,0,w+3,h*.2,d+4,'#8a4e34');
  for(const z of [-d*.44,d*.44])for(let i=0;i<12;i++){const x=(i-5.5)*w*.075;C(x,h*.38,z,.8,h*.76,'#755033');B(x,h*.64,z,w*.075,.7,.8,'#b48b59');}return;
 }
 if(k==='glasshouse'){
  B(0,1,0,w,2,d,'#d2b9a1');B(0,h*.34,0,w,h*.62,d,glass);roof(0,h*.66,0,w,h*.31,d,'#b8dedd');
  for(let i=0;i<17;i++){const x=(i-8)*w/16;for(const z of [-d*.5,d*.5]){B(x,h*.34,z,.55,h*.65,.55,'#f3f0dd');rod([x,h*.66,z],[x,h*.97,0],.35,'#f3f0dd');}}
  for(let j=1;j<4;j++)for(const z of [-d*.502,d*.502])B(0,h*j/6,z,w,.4,.4,'#f3f0dd');return;
 }
 if(k==='cricket'){
  stamp(cylGeo,mat('#6f9b57'),0,.6,0,w*.46,1,d*.46);B(0,1.2,0,w*.035,.2,d*.21,'#d5c696');
  for(let i=0;i<40;i++){const a=i*TAU/40,x=Math.cos(a)*w*.48,z=Math.sin(a)*d*.48;box(x,h*.34,z,w*.08,h*.68,d*.11,'#d9c6af',-a);box(x,h*.73,z,w*.085,1.2,d*.14,'#eee8dd',-a);}
  for(const x of [-w*.4,w*.4])for(const z of [-d*.4,d*.4]){C(x,h*.48,z,.8,h*.96,dark);B(x,h*.98,z,8,2,2,trim);}return;
 }
 if(k==='bengalurupalace'){
  B(0,h*.32,0,w,h*.64,d,'#d4b582');roof(0,h*.65,0,w,h*.14,d,'#7f715d');
  for(const x of [-w*.41,w*.41])for(const z of [-d*.4,d*.4]){C(x,h*.45,z,w*.075,h*.9,'#d4b582');C(x,h*.9,z,w*.082,2,'#e6d1a9');for(let j=0;j<8;j++){const a=j*TAU/8;B(x+Math.cos(a)*w*.075,h*.95,z+Math.sin(a)*w*.075,2,h*.1,2,'#e6d1a9');}}
  for(let i=0;i<9;i++)B((i-4)*w*.09,h*.4,d*.505,w*.025,h*.18,.2,'#514c43');return;
 }
 if(isRome&&k==='pantheon'){
  const r=w*.43,z=-d*.15;C(0,h*.32,z,r,h*.64,'#bd9f7a');
  const profile=[];for(let i=0;i<=18;i++){const a=i/18*Math.acos(.08);profile.push(new T.Vector2(r*Math.cos(a),h*.36*Math.sin(a)));}stamp(new T.LatheGeometry(profile,48),mat('#b3aa91'),0,h*.64,z);
  const rim=new T.TorusGeometry(r*.08,.8,6,24);stamp(rim,mat('#e5d5b5'),0,h*.999,z,1,1,1,0,Math.PI/2);
  const front=d*.4;for(const zz of [front,front-d*.16])cols(w*.78,zz,h*.26,h*.52,8);B(0,h*.54,front-d*.08,w*.86,2,d*.25,trim);roof(0,h*.56,front-d*.08,w*.89,h*.18,d*.28,cream);return;
 }
 if(isRome&&k==='arch'){
  const shape=new T.Shape();shape.moveTo(-w/2,0);shape.lineTo(w/2,0);shape.lineTo(w/2,h);shape.lineTo(-w/2,h);shape.closePath();
  for(const [x,r,hh] of [[0,w*.15,h*.72],[-w*.34,w*.085,h*.48],[w*.34,w*.085,h*.48]]){const hole=new T.Path();hole.moveTo(x-r,.05);hole.lineTo(x-r,hh-r);hole.quadraticCurveTo(x,hh+r,x+r,hh-r);hole.lineTo(x+r,.05);hole.closePath();shape.holes.push(hole);}
  stamp(new T.ExtrudeGeometry(shape,{depth:d,bevelEnabled:false,curveSegments:12}),mat('#eddbb8'),0,0,-d/2);for(const x of [-w*.45,-w*.22,w*.22,w*.45])C(x,h*.37,d*.58,.65,h*.74,trim);B(0,h*.8,0,w+1,1,d+1,trim);B(0,h*.99,0,w+1,1,d+1,trim);return;
 }
 if(isRome&&l.name==='Piazza Navona'){
  stamp(cylGeo,mat('#e6ccb0'),0,1,0,w*.5,2,d*.5);stamp(cylGeo,mat('#56b8c0'),0,2.1,0,w*.44,.3,d*.44);
  for(const side of [-1,1])for(const zz of [-1,1])sphere(side*4,4,zz*3,3,3,2.5,'#f2dfbb');B(0,h*.52,0,2,h*.82,2,'#c8a473');cone(0,h*.97,0,1.5,h*.08,gold,4);return;
 }

 if(isRome&&l.name==='Trevi Fountain'){
  B(0,h*.48,-d*.28,w,h*.96,d*.32,'#f5dfba');cols(w*.83,-d*.05,h*.49,h*.72,8);B(0,h*.92,-d*.18,w+3,2,d*.5,trim);roof(0,h*.94,-d*.18,w*.45,h*.13,d*.42,cream);
  for(const x of [-w*.27,0,w*.27]){B(x,h*.42,-d*.08,w*.16,h*.56,.3,'#8e7c65');sphere(x,h*.25,d*.04,1.8,h*.16,1.5,trim);C(x,h*.12,d*.04,2,h*.18,trim);}
  stamp(cylGeo,mat('#f1d2a4'),0,1,d*.23,w*.55,2,d*.46);stamp(cylGeo,mat('#4ec5c6'),0,2.1,d*.23,w*.49,.3,d*.4);for(let i=0;i<7;i++)sphere((i-3)*w/8,3+Math.abs(i-3)*.5,d*.1,3,2,3,'#c9b28f');return;
 }
 if(isVenice&&k==='basilica'){
  B(0,h*.2,0,w,h*.4,d,'#e8d6b3');
  for(const [x,z] of [[0,0],[-w*.28,0],[w*.28,0],[0,-d*.28],[0,d*.28]]){C(x,h*.47,z,w*.17,h*.15,cream);dome(x,h*.56,z,w*.19,h*.3,'#b6b4a3');}
  for(let i=0;i<5;i++){const x=(i-2)*w*.19;B(x,h*.19,d*.505,w*.13,h*.31,.3,'#676452');C(x-w*.085,h*.2,d*.53,.7,h*.4,trim);C(x+w*.085,h*.2,d*.53,.7,h*.4,trim);dome(x,h*.38,d*.5,w*.085,h*.1,cream);}return;
 }
 if(isVenice&&l.name==='Doge’s Palace'){
  B(0,h*.69,0,w,h*.58,d,'#e5b3a2');B(0,h*.98,0,w+2,1,d+2,trim);
  for(const z of [-d*.51,d*.51])for(let i=0;i<16;i++){const x=-w*.47+i*w*.94/15;C(x,h*.2,z,.9,h*.4,trim);C(x,h*.46,z,.55,h*.15,trim);B(x,h*.38,z,w/15,1,1.8,cream);}
  for(const x of [-w*.51,w*.51])for(let i=0;i<10;i++)C(x,h*.2,-d*.45+i*d*.9/9,.9,h*.4,trim);for(let i=0;i<12;i++)B(-w*.45+i*w*.9/11,h*.7,d*.505,w*.035,h*.18,.2,'#615e55');return;
 }
 if(isVenice&&k==='campanile'){
  B(0,h*.39,0,w*.65,h*.78,d*.65,'#b76245');B(0,h*.81,0,w*.8,h*.08,d*.8,trim);for(const x of [-w*.3,w*.3])for(const z of [-d*.3,d*.3])C(x,h*.86,z,1,h*.1,trim);cone(0,h*.94,0,w*.65,h*.13,'#679583',4);C(0,h,0,.5,3,gold);return;
 }

 if(k==='colosseum'){
  // Open elliptical arena, three real arch tiers, and the broken outer wall.
  const count=64,rx=w*.48,rz=d*.48,bay=TAU*Math.sqrt((rx*rx+rz*rz)/2)/count;
  const arch=new T.Shape();arch.moveTo(-bay*.5,0);arch.lineTo(-bay*.5,h*.235);arch.lineTo(bay*.5,h*.235);arch.lineTo(bay*.5,0);arch.lineTo(bay*.33,0);arch.lineTo(bay*.33,h*.11);arch.quadraticCurveTo(0,h*.28,-bay*.33,h*.11);arch.lineTo(-bay*.33,0);arch.closePath();
  const ag=new T.ExtrudeGeometry(arch,{depth:4,bevelEnabled:false,curveSegments:6});
  for(let i=0;i<count;i++){const a=i*TAU/count,x=Math.cos(a)*rx,z=Math.sin(a)*rz,rotation=Math.atan2(Math.cos(a)/rx,Math.sin(a)/rz);const tiers=i>32&&i<55?2:3;
   for(let j=0;j<tiers;j++){stamp(ag,mat(j%2?'#e8c998':'#f4dfb5'),x,j*h*.25,z,1,1,1,rotation);box(x,(j+1)*h*.25,z,bay+1,1.5,5,'#ffe9c1',rotation);}
   if(tiers===3){box(x,h*.84,z,bay+.4,h*.18,4,'#d5b784',rotation);box(x,h*.94,z,bay+1,1.8,5,trim,rotation);}
   for(let j=0;j<5;j++){const r=.56+j*.07;box(x*r,2+j*h*.045,z*r,bay*.85,2.2,5,'#c6a780',rotation);}
  }
  stamp(new T.CylinderGeometry(1,1,1,64),mat('#c8a37b'),0,.5,0,rx*.52,1,rz*.52);
  for(let x=-w*.2;x<w*.23;x+=9)B(x,1.5,0,1.3,2,d*.4,'#987958');
  for(let z=-d*.18;z<d*.2;z+=11)B(0,1.5,z,w*.4,2,1.3,'#987958');return;
 }
 if(k==='rialto'){
  // A single pale stone arch, stepped ramps, two shop rows and central portico.
  const shape=new T.Shape();shape.moveTo(-w/2,0);shape.lineTo(-w/2,3);shape.lineTo(0,12);shape.lineTo(w/2,3);shape.lineTo(w/2,0);shape.lineTo(w*.35,0);shape.quadraticCurveTo(0,17,-w*.35,0);shape.closePath();
  const arch=new T.ExtrudeGeometry(shape,{depth:d,bevelEnabled:false,curveSegments:24});stamp(arch,mat('#fff0d2'),0,0,-d/2);
  for(let i=0;i<24;i++){const x=-w*.49+(i+.5)*w*.98/24,y=3+9*(1-Math.abs(x)/(w*.5));B(x,y,0,w/24,1,d,trim);for(const side of [-1,1])B(x,y+1.2,side*d*.48,w/24,.7,.8,cream);}
  for(const side of [-1,1])for(let j=0;j<6;j++)for(const half of [-1,1]){const x=half*(4+j*3),y=3+9*(1-Math.abs(x)/(w*.5));B(x,y+2.1,side*d*.28,2.9,4.2,d*.24,'#ead1aa');B(x,y+2.2,side*d*.405,1.5,2.6,.12,'#584c42');roof(x,y+4.2,side*d*.28,3.1,1.2,d*.27,'#bd6f45');}
  for(const z of [-d*.3,d*.3]){for(const x of [-3,3])C(x,15,z,.7,6,trim);roof(0,18,z,9,3,7,trim);}return;
 }

 if(k==='eiffel'){
  const levels=[[0,w*.46],[h*.18,w*.24],[h*.37,w*.12],[h*.82,w*.035],[h*.94,1.8]];
  for(let i=1;i<levels.length;i++){const [y0,r0]=levels[i-1],[y1,r1]=levels[i];for(const sx of [-1,1])for(const sz of [-1,1]){rod([sx*r0,y0,sz*r0],[sx*r1,y1,sz*r1],i===1?2.6:1.4);for(let n=0;n<5;n++){const a=n/5,b=(n+1)/5,ya=lerp(y0,y1,a),yb=lerp(y0,y1,b),ra=lerp(r0,r1,a),rb=lerp(r0,r1,b);rod([sx*ra,ya,sz*ra],[-sx*rb,yb,sz*rb],.45);rod([sx*ra,ya,sz*ra],[sx*rb,yb,-sz*rb],.45);}}if(i<3)B(0,y1,0,r1*2.5,4,r1*2.5,bronze);}
  C(0,h*.97,0,.9,h*.06,bronze);return;
 }
 if(k==='wheel'){
  const r=h*.45,y=h*.52,g=new T.TorusGeometry(r,1.3,6,64);stamp(g,mat('#f2f0df'),0,y,0);
  for(let i=0;i<32;i++){const a=i*TAU/32,x=Math.cos(a)*r,yy=y+Math.sin(a)*r;rod([0,y,0],[x,yy,0],.23,'#e1e0cf');sphere(x,yy,0,3,2,2.5,glass);}
  rod([-r*.4,0,8],[0,y,0],2,trim);rod([r*.4,0,8],[0,y,0],2,trim);return;
 }
 if(['colosseum','amphitheatre','stadium'].includes(k)){
  const count=k==='colosseum'?64:48,open=k==='amphitheatre'?Math.PI:TAU;
  for(let i=0;i<count;i++){const a=i*open/count,x=Math.cos(a)*w*.46,z=Math.sin(a)*d*.46;
   if(isRome&&k==='pantheon'){
  const r=w*.43,z=-d*.15;C(0,h*.32,z,r,h*.64,'#bd9f7a');
  const profile=[];for(let i=0;i<=18;i++){const a=i/18*Math.acos(.08);profile.push(new T.Vector2(r*Math.cos(a),h*.36*Math.sin(a)));}stamp(new T.LatheGeometry(profile,48),mat('#b3aa91'),0,h*.64,z);
  const rim=new T.TorusGeometry(r*.08,.8,6,24);stamp(rim,mat('#e5d5b5'),0,h*.999,z,1,1,1,0,Math.PI/2);
  const front=d*.4;for(const zz of [front,front-d*.16])cols(w*.78,zz,h*.26,h*.52,8);B(0,h*.54,front-d*.08,w*.86,2,d*.25,trim);roof(0,h*.56,front-d*.08,w*.89,h*.18,d*.28,cream);return;
 }
 if(isRome&&k==='arch'){
  const shape=new T.Shape();shape.moveTo(-w/2,0);shape.lineTo(w/2,0);shape.lineTo(w/2,h);shape.lineTo(-w/2,h);shape.closePath();
  for(const [x,r,hh] of [[0,w*.15,h*.72],[-w*.34,w*.085,h*.48],[w*.34,w*.085,h*.48]]){const hole=new T.Path();hole.moveTo(x-r,.05);hole.lineTo(x-r,hh-r);hole.quadraticCurveTo(x,hh+r,x+r,hh-r);hole.lineTo(x+r,.05);hole.closePath();shape.holes.push(hole);}
  stamp(new T.ExtrudeGeometry(shape,{depth:d,bevelEnabled:false,curveSegments:12}),mat('#eddbb8'),0,0,-d/2);for(const x of [-w*.45,-w*.22,w*.22,w*.45])C(x,h*.37,d*.58,.65,h*.74,trim);B(0,h*.8,0,w+1,1,d+1,trim);B(0,h*.99,0,w+1,1,d+1,trim);return;
 }
 if(isRome&&l.name==='Piazza Navona'){
  stamp(cylGeo,mat('#e6ccb0'),0,1,0,w*.5,2,d*.5);stamp(cylGeo,mat('#56b8c0'),0,2.1,0,w*.44,.3,d*.44);
  for(const side of [-1,1])for(const zz of [-1,1])sphere(side*4,4,zz*3,3,3,2.5,'#f2dfbb');B(0,h*.52,0,2,h*.82,2,'#c8a473');cone(0,h*.97,0,1.5,h*.08,gold,4);return;
 }

 if(isRome&&l.name==='Trevi Fountain'){
  B(0,h*.48,-d*.28,w,h*.96,d*.32,'#f5dfba');cols(w*.83,-d*.05,h*.49,h*.72,8);B(0,h*.92,-d*.18,w+3,2,d*.5,trim);roof(0,h*.94,-d*.18,w*.45,h*.13,d*.42,cream);
  for(const x of [-w*.27,0,w*.27]){B(x,h*.42,-d*.08,w*.16,h*.56,.3,'#8e7c65');sphere(x,h*.25,d*.04,1.8,h*.16,1.5,trim);C(x,h*.12,d*.04,2,h*.18,trim);}
  stamp(cylGeo,mat('#f1d2a4'),0,1,d*.23,w*.55,2,d*.46);stamp(cylGeo,mat('#4ec5c6'),0,2.1,d*.23,w*.49,.3,d*.4);for(let i=0;i<7;i++)sphere((i-3)*w/8,3+Math.abs(i-3)*.5,d*.1,3,2,3,'#c9b28f');return;
 }
 if(isVenice&&k==='basilica'){
  B(0,h*.2,0,w,h*.4,d,'#e8d6b3');
  for(const [x,z] of [[0,0],[-w*.28,0],[w*.28,0],[0,-d*.28],[0,d*.28]]){C(x,h*.47,z,w*.17,h*.15,cream);dome(x,h*.56,z,w*.19,h*.3,'#b6b4a3');}
  for(let i=0;i<5;i++){const x=(i-2)*w*.19;B(x,h*.19,d*.505,w*.13,h*.31,.3,'#676452');C(x-w*.085,h*.2,d*.53,.7,h*.4,trim);C(x+w*.085,h*.2,d*.53,.7,h*.4,trim);dome(x,h*.38,d*.5,w*.085,h*.1,cream);}return;
 }
 if(isVenice&&l.name==='Doge’s Palace'){
  B(0,h*.69,0,w,h*.58,d,'#e5b3a2');B(0,h*.98,0,w+2,1,d+2,trim);
  for(const z of [-d*.51,d*.51])for(let i=0;i<16;i++){const x=-w*.47+i*w*.94/15;C(x,h*.2,z,.9,h*.4,trim);C(x,h*.46,z,.55,h*.15,trim);B(x,h*.38,z,w/15,1,1.8,cream);}
  for(const x of [-w*.51,w*.51])for(let i=0;i<10;i++)C(x,h*.2,-d*.45+i*d*.9/9,.9,h*.4,trim);for(let i=0;i<12;i++)B(-w*.45+i*w*.9/11,h*.7,d*.505,w*.035,h*.18,.2,'#615e55');return;
 }
 if(isVenice&&k==='campanile'){
  B(0,h*.39,0,w*.65,h*.78,d*.65,'#b76245');B(0,h*.81,0,w*.8,h*.08,d*.8,trim);for(const x of [-w*.3,w*.3])for(const z of [-d*.3,d*.3])C(x,h*.86,z,1,h*.1,trim);cone(0,h*.94,0,w*.65,h*.13,'#679583',4);C(0,h,0,.5,3,gold);return;
 }

 if(k==='colosseum'){for(let j=0;j<3;j++){B(x,(j+.5)*h/3,z,3,h/3,4,cream);box(x,(j+1)*h/3,z,w*.048,2.5,7,trim,-a+Math.PI/2);} }
   else for(let j=0;j<8;j++){const rr=.55+j*.055;box(x*rr,(j+.5)*h/8,z*rr,w*.07,h/8,d*.05,trim,-a+Math.PI/2);}
  }return;
 }
 if(['bridge','suspension','rialto','sighs'].includes(k)){
  const length=w,wide=Math.max(d,8);B(0,9,0,length,2,wide,dark);
  for(const s of [-1,1]){B(0,11,s*wide*.48,length,2,1,cream);for(let x=-length*.45;x<length*.5;x+=length/10)B(x,6,s*wide*.4,3,12,2,cream);}
  if(k==='suspension'){for(const x of [-length*.28,length*.28])for(const z of [-wide*.6,wide*.6]){B(x,h*.4,z,5,h*.8,5,cream);for(let i=0;i<32;i++){const xx=-length*.5+i*length/31,yy=12+(h-12)*Math.pow(Math.abs(xx)/(length*.5),2);rod([xx,10,z],[xx,yy,z],.35,dark);if(i)rod([xx-length/31,12+(h-12)*Math.pow(Math.abs(xx-length/31)/(length*.5),2),z],[xx,yy,z],.65,dark);}}}
  if(k==='rialto'){for(let x=-length*.38;x<length*.4;x+=5){const yy=14+6*(1-Math.abs(x)/(length*.4));B(x,yy,0,4,7,wide,cream);roof(x,yy+3.5,0,5,3,wide,brick);}}
  if(k==='sighs'){B(0,14,0,length,8,wide,facades[0]);roof(0,18,0,length,3,wide,dark);}return;
 }
 if(k==='fountain'){C(0,.6,0,w*.5,1.2,cream);C(0,1.25,0,w*.43,.15,'#75b9b3');C(0,h*.3,0,w*.1,h*.6,cream);sphere(0,h*.7,0,w*.08,h*.28,w*.08,bronze);return;}
 if(['obelisk','column','campanile','clock','roundtower','lift','gothic'].includes(k)){
  if(k==='obelisk'){B(0,2,0,w,4,d,cream);C(0,h*.48,0,w*.18,h*.85,cream);cone(0,h*.95,0,w*.25,h*.1,gold,4);}
  else if(k==='column'){C(0,2,0,w*.5,4,cream);C(0,h*.45,0,w*.16,h*.8,cream);sphere(0,h*.92,0,2,h*.08,2,bronze);}
  else if(k==='roundtower'){C(0,h*.45,0,w*.45,h*.9,brick);C(0,h*.93,0,w*.48,h*.06,trim);dome(0,h*.96,0,w*.15,h*.06,dark);}
  else if(k==='lift'){for(const x of [-w*.4,w*.4])for(const z of [-d*.4,d*.4]){rod([x,0,z],[x,h,z],.7,dark);for(let y=3;y<h-4;y+=5)rod([x,y,z],[-x,y+5,z],.4,dark);}B(0,h*.9,0,w*1.3,2,d*1.3,dark);}
  else {tower(0,0,h,Math.min(w,d)*.35,k!=='clock');if(k==='clock'){for(const z of [-d*.36,d*.36]){stamp(new T.CircleGeometry(w*.22,24),mat('#fff3c8'),0,h*.79,z,1,1,1,z<0?Math.PI:0);B(0,h*.82,z+(z>0?.1:-.1),.7,h*.1,.2,dark);B(w*.06,h*.79,z+(z>0?.1:-.1),w*.12,.7,.2,dark);}cone(0,h*.94,0,w*.45,h*.12,dark,4);}if(k==='gothic')for(const x of [-w*.4,w*.4])for(const z of [-d*.4,d*.4])tower(x,z,h*.6,w*.1,true);}
  return;
 }
 if(['arch','gate'].includes(k)){
  const gap=w*.35;for(const x of [-(w+gap)/4,(w+gap)/4])B(x,h*.4,0,(w-gap)/2,h*.8,d,cream);B(0,h*.88,0,w,h*.24,d,trim);for(const x of [-w*.4,w*.4])C(x,h*.4,d*.55,1.3,h*.75,trim);return;
 }
 if(['temple','pantheon','ruins'].includes(k)){
  B(0,1.5,0,w+6,3,d+6,cream);cols(w*.85,d*.43,h*.4,h*.7,8);cols(w*.85,-d*.43,h*.4,h*.7,8);
  for(const x of [-w*.43,w*.43])for(let i=1;i<7;i++)C(x,h*.4,-d*.43+i*d*.86/7,1.3,h*.7,trim);
  if(k!=='ruins'){B(0,h*.77,0,w,3,d,cream);roof(0,h*.79,0,w,h*.21,d,cream);if(k==='pantheon'){C(0,h*.35,-d*.1,w*.45,h*.7,brick);dome(0,h*.7,-d*.1,w*.48,h*.3,'#a79d89');}}return;
 }
 if(['fountain','garden','plaza','steps','harbor'].includes(k)){
  if(k==='steps'){for(let i=0;i<24;i++){B(0,(i+.5)*h/24,-d*.5+i*d/24,w*(.85+.15*Math.cos(i*.45)),h/24,d/24,trim);B(0,(i+1)*h/24+.04,-d*.5+(i+.1)*d/24,w*(.85+.15*Math.cos(i*.45)),.15,.3,'#baa486');}}
  else if(k==='harbor'){for(let i=0;i<9;i++){const x=-w/2+i*w/9;B(x,h*.4,0,w/10,h*.8,d,facades[i%8]);roof(x,h*.8,0,w/10,h*.2,d,brick);}}
  else if(k==='plaza'){for(const side of [-1,1]){B(side*w*.45,h*.4,0,w*.1,h*.8,d,facades[0]);B(0,h*.4,side*d*.45,w,h*.8,d*.1,facades[0]);}C(0,3,0,5,6,cream);sphere(0,8,0,2,3,2,bronze);}
  else {C(0,1,0,w*.4,2,cream);C(0,2.1,0,w*.36,.3,'#57a9bc');C(0,h*.3,0,w*.06,h*.55,trim);C(0,h*.55,0,w*.17,1,cream);sphere(0,h*.75,0,2,h*.2,2,trim);}
  return;
 }
 if(k==='pyramid'||k==='glasshouse'){if(k==='pyramid')cone(0,h/2,0,w/Math.sqrt(2),h,glass,4);else{B(0,h*.3,0,w,h*.6,d,glass);roof(0,h*.6,0,w,h*.4,d,glass);for(let x=-w/2;x<=w/2;x+=w/12)B(x,h*.3,d*.505,.7,h*.6,.7,trim);}return;}
 if(k==='sagrada'){
  block(h*.25);for(const side of [-1,1])for(let i=0;i<4;i++){const x=(i-1.5)*w*.22,hh=h*(.55+(i===1||i===2?.12:0)),z=side*d*.35;C(x,hh*.42,z,4,hh*.84,cream);cone(x,hh*.92,z,4,hh*.16,cream);sphere(x,hh,z,2.5,3,2.5,gold);}C(0,h*.58,0,6,h*.75,cream);cone(0,h*.94,0,6,h*.12,cream);B(0,h,0,10,2,2,trim);return;
 }
 if(['cathedral','chapel','basilica','synagogue'].includes(k)){
  block(h*.45);for(const x of [-w*.34,w*.34])tower(x,d*.32,h,w*.13,k!=='cathedral'||CITY.id!=='paris');
  for(let z=-d*.4;z<d*.4;z+=d/7)for(const x of [-w*.53,w*.53])B(x,h*.18,z,3,h*.36,3,cream);
  if(k==='basilica'||k==='synagogue')for(const x of [-w*.25,0,w*.25])dome(x,h*.54,0,w*.16,h*.22);
  else cone(0,h*.74,0,w*.09,h*.35,dark,8);return;
 }
 if(['dome','parliament','secession'].includes(k)){
  block(h*.32);const r=Math.min(w*.25,h*.22);C(0,h*.48,0,r,h*.25,cream);dome(0,h*.6,0,r*1.1,h*.23,k==='secession'||l.name==='Les Invalides'?gold:'#649485');C(0,h*.89,0,r*.15,h*.12,cream);cone(0,h*.97,0,r*.2,h*.08,gold);
  cols(w*.65,d*.55,h*.18,h*.3,8);if(k==='parliament')for(let i=-4;i<=4;i++)tower(i*w/10,d*.4,h*.5,w*.025,true);return;
 }
 if(['castle','bastion','pagoda'].includes(k)){
  block(h*.48);for(const x of [-w*.4,w*.4])for(const z of [-d*.38,d*.38]){C(x,h*.36,z,w*.09,h*.72,cream);cone(x,h*.82,z,w*.12,h*.28,k==='bastion'?cream:dark);}
  if(k==='pagoda')for(let i=0;i<5;i++){B(0,h*(i+.5)/5,0,w*(1-i*.13),h/5,d*(1-i*.13),brick);roof(0,h*(i+1)/5,0,w*(1.2-i*.13),h*.07,d*(1.2-i*.13),gold);}return;
 }
 if(k==='modern'||k==='vasa'){B(0,h*.4,0,w,h*.8,d,glass);for(let x=-w*.5;x<=w*.5;x+=w/14)B(x,h*.4,d*.502,1,h*.8,1,trim);roof(0,h*.8,0,w,h*.2,d,dark);if(k==='vasa')for(let i=-1;i<=1;i++){C(i*w*.2,h*1.1,0,.6,h*.7,dark);B(i*w*.2,h*1.2,0,w*.12,.7,.7,dark);}return;}
 if(k==='gaudi'){for(let i=0;i<9;i++){const x=(i-4)*w/9;C(x,h*.4,0,w*.07,h*.8,cream);sphere(x,h*.84,0,w*.07,h*.09,d*.4,'#b39a76');cone(x,h*.98,0,1.8,h*.14,cream);}return;}
 // Palaces, museums, stations, markets and concert halls: wings, cornices and portico.
 if(k==='palace'){B(0,h*.35,d*.35,w,h*.7,d*.3,facades[0]);for(const x of [-w*.42,w*.42]){B(x,h*.35,-d*.1,w*.16,h*.7,d*.8,facades[0]);roof(x,h*.7,-d*.1,w*.18,h*.18,d*.82,dark);}roof(0,h*.7,d*.35,w,h*.18,d*.32,dark);}else block(h*.7);cols(w*.55,d*.55,h*.3,h*.55,8);roof(0,h*.72,d*.45,w*.65,h*.2,d*.2,trim);
 if(['station','market'].includes(k)){roof(0,h*.72,0,w,h*.28,d,glass);for(const x of [-w*.43,w*.43])tower(x,d*.3,h,w*.045,true);}
}
for(const l of landmarkModels){
 if(l.mapped)continue;
 const before=new Map([...batches].map(([key,b])=>[key,b.matrices.length]));makeLandmark(l);
 const transform=new T.Matrix4().makeTranslation(l.x,0,l.z).multiply(new T.Matrix4().makeRotationY(l.angle||0)).multiply(new T.Matrix4().makeScale(.36*l.boost,.36*l.vertical,.36*l.boost));
 for(const [key,b] of batches)for(let i=before.get(key)||0;i<b.matrices.length;i++)b.matrices[i].premultiply(transform);
 obstacles.push({x:l.x,z:l.z,w:l.wx,d:l.dz,h:l.modelHeight+2});
}

// Chunked merged geometry keeps tens of thousands of real buildings affordable.
const chunks=new Map();
const wallMat=new T.MeshStandardMaterial({map:facades[3].map,vertexColors:true,roughness:.9,side:T.DoubleSide});
const roofMat=new T.MeshStandardMaterial({vertexColors:true,roughness:.92,side:T.DoubleSide});
const groundMat=new T.MeshStandardMaterial({vertexColors:true,roughness:1,side:T.DoubleSide});
const facadeTints=['#fff2df','#f1ddc6','#d7d8d2','#e9c4ae','#cad8d5','#eee6d7','#d6c2b5','#cbd4dd'].map(c=>new T.Color(c));
const roofPalettes={limestone:['#74808a','#7a8288','#92918b','#797e83','#64808b'],brick:['#6c7375','#866354','#777b7a','#a27864','#717574'],terracotta:['#ac7256','#bc8666','#a46b51','#c38b6a','#8d7365'],sandstone:['#ae795e','#b58d71','#98816a','#b58162','#8f8175'],dutch:['#6a655f','#97634e','#826655','#aa7358','#696c68'],copper:['#8b705a','#a77c61','#758c7e','#b28669','#687f77'],nordic:['#807264','#b8875c','#676d6b','#987454','#668a7b'],stone:['#697273','#7d807b','#706d65','#7e766a','#677475'],venetian:['#b47758','#c08a65','#a16b52','#c99b77','#a4785e'],marble:['#bab6a9','#b4b6b0','#c9c5b6','#adad9f','#b8ae99']};
const roofTints=(roofPalettes[CITY.theme]||roofPalettes.limestone).map(c=>new T.Color(c));
if(isRome||isVenice){const palette=isRome?['#e4bc7c','#f2d19a','#ce9d70','#e8c397','#dca574','#f2dab1','#c9906b','#d8b48a']:['#fff2d9','#eda28d','#f8dd9a','#fff4e3','#d8886c','#fff8e8','#e7ae99','#f6dfbe'];palette.forEach((c,i)=>facadeTints[i].set(c));}
const cityTint=new T.Color(({'garden-city':'#e8efdb',brick:'#e1cfbe',dutch:'#d8c2ad',terracotta:'#f4d4ad',venetian:'#f0c69f',stone:'#c8c6b7',marble:'#fff9ea',nordic:'#eed7ae'})[CITY.theme]||'#fff4e4');facadeTints.forEach(c=>c.multiply(cityTint));
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
const cityPOIs=CITY_MAP.pois.filter(p=>p.type!=='school');
const buildings=CITY_MAP.features.filter(f=>f.k==='building');
let builtCount=0;
for(const f of buildings){if(++builtCount%512===0)await loadingWork(12,'Finding buildings and places…');const xs=f.p.map(p=>p[0]),zs=f.p.map(p=>p[1]);f.x=(Math.min(...xs)+Math.max(...xs))/2;f.z=(Math.min(...zs)+Math.max(...zs))/2;f.w=(Math.max(...xs)-Math.min(...xs))/2;f.d=(Math.max(...zs)-Math.min(...zs))/2;}
for(const p of cityPOIs){await loadingWork(15,'Finding buildings and places…');let nearest=null,dist=Infinity;for(const f of buildings){const d=Math.hypot(Math.max(0,Math.abs(p.x-f.x)-f.w),Math.max(0,Math.abs(p.z-f.z)-f.d));if(d<dist){nearest=f;dist=d;}}if(nearest&&dist<25){nearest.cat=p.type;p.y=nearest.h+8;}else p.y=20;}
builtCount=0;
for(const f of buildings){
 if(++builtCount%256===0)await loadingWork(16+20*builtCount/buildings.length,'Building '+CITY.name+'’s neighborhoods…');
 if(landmarkModels.some(l=>!l.mapped&&Math.abs(f.x-l.x)<f.w+l.wx+5&&Math.abs(f.z-l.z)<f.d+l.dz+5))continue;
 const adjacent=landmarkModels.find(l=>!l.mapped&&Math.abs(f.x-l.x)<f.w+l.wx+28&&Math.abs(f.z-l.z)<f.d+l.dz+28);
 const height=Math.min(f.h,isVenice?12:isRome?17:160,adjacent?Math.max(5,adjacent.modelHeight*.55):160),cat=f.cat,base=facadeTints[f.c],color=cat==='hospital'?new T.Color('#d2e6e2'):cat==='mall'?new T.Color('#dbb3a5'):base;
 const b=batchFor('wall',f.x,f.z);
 for(const ring of [f.p,...(f.holes||[])])for(let j=0;j<ring.length;j++){
  const a=ring[j],d=ring[(j+1)%ring.length],len=Math.hypot(d[0]-a[0],d[1]-a[1]),u=Math.max(.25,len/18),v=Math.max(.25,height/11);
  for(const [x,y,z,uu,vv] of [[a[0],.25,a[1],0,0],[d[0],.25,d[1],u,0],[d[0],height,d[1],u,v],[a[0],.25,a[1],0,0],[d[0],height,d[1],u,v],[a[0],height,a[1],0,v]])vertex(b,x,y,z,uu,vv,color);
 }
 let roofRise=0;
 if((isRome||isVenice)&&!f.holes?.length&&f.p.length<=10&&f.w<24&&f.d<24&&f.w>1.4&&f.d>1.4){roofRise=Math.min(3.4,Math.min(f.w,f.d)*.42);const roofBatch=batchFor('roof',f.x,f.z),col=roofTints[f.c%5];for(let j=0;j<f.p.length;j++){const a=f.p[j],b=f.p[(j+1)%f.p.length];for(const [x,y,z] of [[a[0],height,a[1]],[f.x,height+roofRise,f.z],[b[0],height,b[1]]])vertex(roofBatch,x,y,z,x/8,z/8,col);}}
 else polygon(f,height,roofTints[f.c%5],'roof');
 obstacles.push({x:f.x,z:f.z,w:f.w+1,d:f.d+1,h:height+roofRise+2});
}
facades[3].map.wrapS=facades[3].map.wrapT=T.RepeatWrapping;
const waterPositions=[],waterIndices=[];
function contains(p,ring){let inside=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++){const a=ring[i],b=ring[j];if((a[1]>p[1])!==(b[1]>p[1])&&p[0]<(b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0])inside=!inside;}return inside;}
// Keep vegetation off streets and the open former airfield.
await loadingStage(37,'Laying out streets and parks…');
let featureCount=0;
const streetCells=new Map();for(const f of CITY_MAP.features){if(++featureCount%512===0)await loadingWork(38,'Laying out streets and parks…');if(!['road','runway'].includes(f.k)||f.w<3)continue;for(let i=1;i<f.p.length;i++){const a=f.p[i-1],b=f.p[i],r=f.w/2+2,seg={a,b,r};for(let x=Math.floor((Math.min(a[0],b[0])-r)/40);x<=Math.floor((Math.max(a[0],b[0])+r)/40);x++)for(let z=Math.floor((Math.min(a[1],b[1])-r)/40);z<=Math.floor((Math.max(a[1],b[1])+r)/40);z++){const key=x+':'+z;if(!streetCells.has(key))streetCells.set(key,[]);streetCells.get(key).push(seg);}}}
function onStreet(p){return (streetCells.get(Math.floor(p[0]/40)+':'+Math.floor(p[1]/40))||[]).some(({a,b,r})=>{const dx=b[0]-a[0],dz=b[1]-a[1],u=clamp(((p[0]-a[0])*dx+(p[1]-a[1])*dz)/(dx*dx+dz*dz||1),0,1);return Math.hypot(p[0]-a[0]-u*dx,p[1]-a[1]-u*dz)<r;});}
let treeCount=0;const treeCandidates=[];const buildingCells=new Map();for(const f of buildings){for(let x=Math.floor((f.x-f.w)/40);x<=Math.floor((f.x+f.w)/40);x++)for(let z=Math.floor((f.z-f.d)/40);z<=Math.floor((f.z+f.d)/40);z++){const key=x+':'+z;if(!buildingCells.has(key))buildingCells.set(key,[]);buildingCells.get(key).push(f);}}
featureCount=0;
for(const f of CITY_MAP.features){
 if(++featureCount%256===0)await loadingWork(40+14*featureCount/CITY_MAP.features.length,'Laying out streets and parks…');
 if(f.k==='water'){
  const p=f.p,holes=f.holes||[],all=[...p,...holes.flat()],tris=T.ShapeUtils.triangulateShape(p.map(v=>new T.Vector2(...v)),holes.map(h=>h.map(v=>new T.Vector2(...v)))),offset=waterPositions.length/3;
  for(const p of all)waterPositions.push(p[0],-p[1],0);for(const t of tris)waterIndices.push(...t.map(i=>offset+i));
 }else if(f.k==='park'){
  polygon(f,.04,f.pitch?'#80a483':'#95ad79');
  if(!f.pitch&&f.trees){const xs=f.p.map(p=>p[0]),zs=f.p.map(p=>p[1]),minx=Math.min(...xs),maxx=Math.max(...xs),minz=Math.min(...zs),maxz=Math.max(...zs);let attempts=0;
   for(let x=minx+5;x<maxx&&attempts<1800;x+=9)for(let z=minz+5;z<maxz&&attempts++<1800;z+=9){const p=[x+rnd()*5,z+rnd()*5];if(onStreet(p)||rnd()>.55||!contains(p,f.p)||(f.holes||[]).some(h=>contains(p,h)))continue;if(landmarkModels.some(l=>!l.mapped&&Math.abs(p[0]-l.x)<l.wx+7&&Math.abs(p[1]-l.z)<l.dz+7))continue;if((buildingCells.get(Math.floor(p[0]/40)+':'+Math.floor(p[1]/40))||[]).some(f=>Math.abs(p[0]-f.x)<f.w+2&&Math.abs(p[1]-f.z)<f.d+2))continue;treeCandidates.push({p,rank:rnd()});}
  }
 }else if(['road','rail','runway'].includes(f.k)){
  const y=f.bridge?2.3:f.k==='runway'?.28:f.k==='rail'?.20:f.w<2?.10:.16,col=f.k==='rail'?'#777a76':f.k==='runway'?'#67787d':f.w<2?'#d9cfb7':'#92968f';
  for(let i=1;i<f.p.length;i++){const a=f.p[i-1],b=f.p[i];if(landmarkModels.some(l=>{if(!['bridge','suspension','rialto','sighs'].includes(l.kind))return false;const dx=(a[0]+b[0])/2-l.x,dz=(a[1]+b[1])/2-l.z,c=Math.cos(l.angle||0),sn=Math.sin(l.angle||0);return Math.abs(c*dx-sn*dz)<l.width*.18&&Math.abs(sn*dx+c*dz)<l.depth*.18+1;}))continue;if(f.w>=3&&f.k==='road')strip(a,b,f.w+1.8,y-.03,'#ded9c9');strip(a,b,f.w,y,col);if(f.k==='runway')strip(a,b,.4,y+.02,'#eee8d7');}
 }
}
treeCandidates.sort((a,b)=>a.rank-b.rank);for(const {p} of treeCandidates.slice(0,2200))tree(p[0],p[1],4+rnd()*4,treeCount++%5);buildingCells.clear();streetCells.clear();treeCandidates.length=0;
await loadingStage(55,'Preparing city scenery…');
let chunkCount=0;const totalChunks=chunks.size;
for(const b of chunks.values()){
 if(++chunkCount%12===0)await loadingWork(55+8*chunkCount/totalChunks,'Preparing city scenery…');
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(b.p,3));g.setAttribute('uv',new T.Float32BufferAttribute(b.uv,2));g.setAttribute('color',new T.Float32BufferAttribute(b.c,3));g.computeVertexNormals();g.computeBoundingSphere();
 const m=new T.Mesh(g,b.kind==='wall'?wallMat:b.kind==='roof'?roofMat:groundMat);m.castShadow=b.kind!=='ground';m.receiveShadow=true;scene.add(m);cityChunks.push(m);
}chunks.clear();
const wg=new T.BufferGeometry();wg.setAttribute('position',new T.Float32BufferAttribute(waterPositions,3));wg.setIndex(waterIndices);wg.computeVertexNormals();
const normals=(()=>{const n=128,data=new Uint8Array(n*n*4);for(let y=0;y<n;y++)for(let x=0;x<n;x++){const i=(y*n+x)*4,a=x/n*TAU,b=y/n*TAU;data[i]=128+Math.sin(a*3+b*2)*22+Math.sin(a*7-b*5)*11+Math.cos(a*11+b*3)*7;data[i+1]=128+Math.cos(a*3+b*2)*18+Math.cos(a*7-b*5)*13+Math.sin(a*5+b*9)*7;data[i+2]=245;data[i+3]=255;}const t=new T.DataTexture(data,n,n);t.wrapS=t.wrapT=T.RepeatWrapping;t.magFilter=T.LinearFilter;t.minFilter=T.LinearMipmapLinearFilter;t.generateMipmaps=true;t.needsUpdate=true;return t;})();
const water=new Water(wg,{textureWidth:512,textureHeight:512,waterNormals:normals,sunDirection:new T.Vector3(-.6,.75,.25).normalize(),sunColor:0xfff3d4,waterColor:isVenice?0x159f9a:isRome?0x557e69:0x287f89,distortionScale:.48,fog:true});water.rotation.x=-Math.PI/2;water.position.y=.05;water.material.side=T.DoubleSide;water.material.uniforms.size.value=3.4;scene.add(water);
const reflect=water.onBeforeRender;let renderCount=0;water.onBeforeRender=function(...args){if(renderCount%(quality==='High'?1:quality==='Performance'?4:2)===0||renderCount<3)reflect.apply(this,args);};

// Labels identify mapped civic places without replacing their actual footprints.
// Visible navigation markers are separate from solid architecture.
const landmarkMarkers=[];
const haloGeo=new T.RingGeometry(.93,1,64),haloMat=new T.MeshBasicMaterial({color:'#ffd15c',transparent:true,opacity:.8,side:T.DoubleSide,depthWrite:false});
function placeLabel(p){
 const tex=texture((c,w,h)=>{c.fillStyle='#173c48';c.fillRect(0,0,w,h);c.fillStyle='#ffd15c';c.fillRect(0,0,58,h);c.fillStyle='#173c48';c.font='bold 30px system-ui';c.textAlign='center';c.textBaseline='middle';c.fillText(p.index+1,29,h/2);c.fillStyle='#fff8de';c.font='bold 26px system-ui';c.fillText(p.name,(w+58)/2,h/2,w-76);},512,72);
 const sprite=new T.Sprite(new T.SpriteMaterial({map:tex,depthTest:false,depthWrite:false,transparent:true}));sprite.position.set(p.x,p.y,p.z);sprite.renderOrder=20;sprite.userData.landmark=p;sprite.scale.set(50,7,1);scene.add(sprite);cityLabels.push(sprite);
 const halo=new T.Mesh(haloGeo,haloMat);halo.rotation.x=-Math.PI/2;halo.scale.set(p.wx+9,p.dz+9,1);halo.position.set(p.x,.4,p.z);scene.add(halo);
 const line=new T.Line(new T.BufferGeometry().setFromPoints([new T.Vector3(p.x,p.modelHeight+2,p.z),new T.Vector3(p.x,p.y-2,p.z)]),new T.LineBasicMaterial({color:'#ffd15c',transparent:true,opacity:.9,depthTest:false,depthWrite:false}));line.renderOrder=19;scene.add(line);landmarkMarkers.push({halo,line,landmark:p});
}
landmarkModels.forEach(placeLabel);

for(const p of cityPOIs.filter(p=>['hospital','school','mall'].includes(p.type))){const c=p.type==='hospital'?'#339985':p.type==='school'?'#d8ab50':'#b27267';box(p.x,p.y-5,p.z,3,.6,3,c,0,false);if(p.type==='hospital'){box(p.x,p.y-4.6,p.z,2,.15,.6,'#fff6df',0,false);box(p.x,p.y-4.6,p.z,.6,.15,2,'#fff6df',0,false);}}
// Index collision volumes by location rather than scanning the whole city per tick.
const obstacleCells=new Map();for(const o of obstacles)for(let x=Math.floor((o.x-o.w)/50);x<=Math.floor((o.x+o.w)/50);x++)for(let z=Math.floor((o.z-o.d)/50);z<=Math.floor((o.z+o.d)/50);z++){const key=x+':'+z;if(!obstacleCells.has(key))obstacleCells.set(key,[]);obstacleCells.get(key).push(o);}
function nearbyObstacles(x,z){return obstacleCells.get(Math.floor(x/50)+':'+Math.floor(z/50))||[];}
// The river is drawn from map polygons; boat paths follow a short central Spree reach.
function riverPoint(){return {x:0,z:0,heading:0};}
function riverX(){return TITLE.x;}
for(let i=0;i<30;i++){const x=-2300+rnd()*4400,z=1700-rnd()*2900,y=260+rnd()*90;for(let j=0;j<3;j++)stamp(leafGeo,mat('#fffaf0',{emissive:'#b2d1e1',emissiveIntensity:.22}),x+j*24,y+(j===1?8:0),z,30,8+rnd()*8,17,rnd(),0,0,false);}

// Small local details share the existing instance batches; no extra render pass.
let localProps=0;
if(isVenice){
 const waterAreas=CITY_MAP.features.filter(f=>f.k==='water');const onWater=(x,z)=>waterAreas.some(f=>contains([x,z],f.p)&&!(f.holes||[]).some(h=>contains([x,z],h)));
 const sites=[];for(const f of waterAreas){for(let i=0;i<f.p.length;i+=Math.max(1,Math.floor(f.p.length/100))){const p=f.p[i];if(Math.hypot(...p)>600)continue;for(const [dx,dz] of [[4,0],[-4,0],[0,4],[0,-4]]){const x=p[0]+dx,z=p[1]+dz;if(onWater(x,z)&&onWater(x+1,z+1)&&onWater(x-1,z-1)&&!sites.some(s=>Math.hypot(s.x-x,s.z-z)<22)){sites.push({x,z});break;}}if(sites.length>=34)break;}if(sites.length>=34)break;}
 for(const [i,p] of sites.entries()){const a=i*2.399;stamp(sphereGeo,mat('#223c3c'),p.x,.65,p.z,.8,.35,3.4,a);box(p.x,.9,p.z,1,.3,1.6,'#a05c42',a,false);const dx=Math.sin(a)*3.1,dz=Math.cos(a)*3.1;cylinder(p.x+dx,.95,p.z+dz,.09,.8,'#e3ce9f');localProps++;}
}

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
const boats=[];
const hoopData=[];
for(const l of landmarkModels){
 let best=null,bestScore=-Infinity;
 for(let j=0;j<32;j++){
  const angle=Math.PI+j*Math.PI/8,radius=j<16?0:18,x=l.x+Math.cos(angle)*(l.wx+28+radius),z=l.z+Math.sin(angle)*(l.dz+28+radius)+l.dz*.25;
  const nearby=nearbyObstacles(x,z).filter(o=>Math.abs(x-o.x)<o.w+18&&Math.abs(z-o.z)<o.d+18),y=Math.max(30,Math.min(85,l.modelHeight*.55+18),...nearby.map(o=>o.h+18));
  const previous=hoopData.at(-1),gap=previous?Math.hypot(x-previous.x,z-previous.z,y-previous.y):100;
  const score=Math.min(gap,60)-j*.02-Math.max(0,y-180)*10;
  if(score>bestScore){bestScore=score;best={x,z,y,name:l.name,id:l.id,icon:'◎'};}
  if(gap>=60&&y<180)break;
 }
 hoopData.push(best);
}
Object.assign(TAKEOFF,{x:hoopData[0].x,z:hoopData[0].z+140,y:hoopData[0].y,heading:0});
Object.assign(TITLE,TAKEOFF);
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
const glintsGeo=new T.BufferGeometry(),glintsData=[];for(let i=0;i<0;i++){const p=riverPoint(rnd());glintsData.push(p.x+(rnd()-.5)*3,.15,p.z);}glintsGeo.setAttribute('position',new T.Float32BufferAttribute(glintsData,3));const glints=new T.Points(glintsGeo,new T.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{time:{value:0}},vertexShader:'uniform float time;varying float a;void main(){vec4 p=modelViewMatrix*vec4(position,1.);a=smoothstep(.65,1.,sin(time*1.7+position.x*13.+position.z*7.));gl_PointSize=clamp(220./-p.z,1.,3.5);gl_Position=projectionMatrix*p;}',fragmentShader:'varying float a;void main(){vec2 p=abs(gl_PointCoord-.5);gl_FragColor=vec4(1.,.98,.85,a*(1.-smoothstep(.15,.5,p.x+p.y))*.9);}'}));scene.add(glints);
const fleckGeo=new T.BufferGeometry(),fleckPositions=new Float32Array(180*3),fleckColors=new Float32Array(180*3),fleckVelocity=new Float32Array(180*3);for(let i=0;i<180;i++){const c=new T.Color(['#ffce4b','#f77b68','#ffffff','#7adac3'][i%4]);fleckColors.set([c.r,c.g,c.b],i*3);}fleckGeo.setAttribute('position',new T.BufferAttribute(fleckPositions,3));fleckGeo.setAttribute('color',new T.BufferAttribute(fleckColors,3));const confetti=new T.Points(fleckGeo,new T.PointsMaterial({size:1.1,vertexColors:true,transparent:true,opacity:1,depthWrite:false}));confetti.frustumCulled=false;confetti.visible=false;scene.add(confetti);
let db;try{db=JSON.parse(ArcadeProfile.storage.getItem('world-flight.'+CITY.id+'.v1'));}catch{}
if(!db?.profiles?.length)db={tourVersion:6,current:0,profiles:[{name:ArcadeProfile.name,best:0,resume:null,music:true}]};
db.current=clamp(db.current||0,0,db.profiles.length-1);
if(db.tourVersion!==6){for(const p of db.profiles){p.previousTours={...p.previousTours,[db.tourVersion||'original']:{best:p.best||0,resume:p.resume?{...p.resume}:null}};if(db.tourVersion!==5)p.best=0;if(p.resume)p.resume.next=0;p.routeNotice=true;}db.tourVersion=6;}
let save=db.profiles[db.current];
const S={mode:'loading',x:TITLE.x,z:TITLE.z,y:TITLE.y,heading:TITLE.heading,speed:0,turn:0,vy:0,bank:0,time:0,stage:'air',next:0,roll:0,fx:0,toast:0,saveT:0,free:false,invincible:0};let held={},touch={},pad={},menuButtons=[],focus=0,backAction=null,acc=0,last=performance.now(),audio=null,musicT=0,musicI=0,engine,engineGain,navReady=true,renderMs=0,renderFrames=0;
function persist(){try{ArcadeProfile.storage.setItem('world-flight.'+CITY.id+'.v1',JSON.stringify(db));}catch{}}
function snapshot(){if(['flight','pause'].includes(S.mode))save.resume={x:S.x,y:S.y,z:S.z,heading:S.heading,stage:S.stage,speed:S.speed,next:S.next,free:S.free};persist();}
function audioUnlock(){try{if(!audio){audio=new(window.AudioContext||window.webkitAudioContext)();engine=audio.createOscillator();engine.type='triangle';engineGain=audio.createGain();engineGain.gain.value=0;engine.connect(engineGain).connect(audio.destination);engine.start();}if(audio.state==='suspended')audio.resume().catch(()=>{});}catch{}}
function note(freq,d=.18,delay=0){if(!audio||audio.state!=='running')return;const o=audio.createOscillator(),g=audio.createGain(),t=audio.currentTime+delay;o.type='triangle';o.frequency.value=freq;g.gain.setValueAtTime(.001,t);g.gain.exponentialRampToValueAtTime(.06,t+.015);g.gain.exponentialRampToValueAtTime(.001,t+d);o.connect(g).connect(audio.destination);o.start(t);o.stop(t+d+.02);}
function burst(big=false){S.fx=big?5:1.2;confetti.visible=true;for(let i=0;i<180;i++){fleckPositions.set([S.x,S.y,S.z-8],i*3);fleckVelocity.set([(rnd()-.5)*(big?28:18),rnd()*22,(rnd()-.5)*24],i*3);}fleckGeo.attributes.position.needsUpdate=true;[523,659,784,1047].forEach((f,i)=>note(f,.25,i*.1));}
function toast(t){$('#toast').textContent=t;S.toast=2.5;}
function escapeHTML(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function focusButton(n){focus=(n+menuButtons.length)%menuButtons.length;menuButtons.forEach((b,i)=>b.classList.toggle('focus',i===focus));menuButtons[focus]?.focus({preventScroll:true});menuButtons[focus]?.scrollIntoView({block:'nearest'});}
function menu(mode,html,back,initial=0){S.mode=mode;S.toast=0;$('#toast').textContent='';$('#overlay').className=mode==='title'?'':'modal';$('#overlay').innerHTML=html;$('#hud').classList.add('hidden');$('#pause').classList.add('hidden');$('#guide').classList.add('hidden');$('#touch').classList.add('hidden');menuButtons=[...$('#overlay').querySelectorAll('button')];backAction=back;held={};touch={};navReady=false;focusButton(initial);}
function bind(id,fn){$('#'+id).onclick=()=>{audioUnlock();fn();};}
let inspectLandmark=null,inspectionAngle=0;
const spotlight=document.createElement('button');spotlight.id='landmark-look';spotlight.className='hidden';spotlight.setAttribute('aria-label','Look closely at the landmark');document.body.appendChild(spotlight);
function closestLandmark(){return landmarkModels.reduce((best,l)=>Math.hypot(l.x-S.x,l.z-S.z)<Math.hypot(best.x-S.x,best.z-S.z)?l:best,landmarkModels[0]);}
function featuredLandmark(){const near=closestLandmark(),goal=!S.free&&hoopData[S.next]?landmarkModels[S.next]:near,d=Math.hypot(near.x-S.x,near.z-S.z);return d<90&&Math.hypot(goal.x-S.x,goal.z-S.z)>d+35?near:goal;}
function openLandmark(index){if(!startupReady||!['flight','places','pause','landmark'].includes(S.mode))return;if(S.mode==='flight')snapshot();inspectLandmark=landmarkModels[index??featuredLandmark().index];inspectionAngle=(inspectLandmark.angle||0)-S.time*.035;
 menu('landmark',`<section class="lookout-card"><p class="eyebrow">${CITY.name} · Stop ${inspectLandmark.index+1} / ${landmarkModels.length}</p><h2>${escapeHTML(inspectLandmark.name)}</h2><p>${inspectLandmark.kind==='colosseum'?'An open arena, tiered arches and a broken outer wall.':inspectLandmark.kind==='rialto'?'A stone arch, stepped walkways and two rows of shops.':'Take a closer look.'} Your plane is waiting.</p><div class="actions"><button id="look-return">A · Keep flying</button><button id="look-here">Fly from here</button><button id="look-next">Next landmark →</button></div></section>`,closeLandmark);$('#overlay').className='lookout-overlay';bind('look-return',closeLandmark);bind('look-here',()=>{const l=inspectLandmark,p=hoopData[l.index];inspectLandmark=null;start(false,true);Object.assign(S,{x:p.x,z:p.z+100,y:p.y,heading:0});positionCamera(true);snapshot();});bind('look-next',()=>openLandmark((inspectLandmark.index+1)%landmarkModels.length));positionCamera(true);
}
function closeLandmark(){inspectLandmark=null;resume();positionCamera(true);}
spotlight.onclick=()=>openLandmark();
function updateLandmarkMarkers(){
 const active=featuredLandmark(),nearest=closestLandmark(),inFlight=S.mode==='flight';spotlight.classList.toggle('hidden',!inFlight);
 if(inFlight){const meters=Math.round(Math.hypot(active.x-S.x,active.z-S.z)/.36/10)*10;spotlight.textContent='⌖ '+active.name+' · '+meters+' m  |  Y / L · Look';}
 for(const label of cityLabels){const l=label.userData.landmark,dist=label.position.distanceTo(camera.position);label.visible=!inspectLandmark&&S.mode!=='landmark'&&dist<900&&(l===active||l===nearest);const width=clamp(dist*.22,16,130);label.scale.set(width,width*72/512,1);}
 for(const m of landmarkMarkers){const near=Math.hypot(m.landmark.x-S.x,m.landmark.z-S.z)<650;m.halo.visible=inspectLandmark?m.landmark===inspectLandmark:near&&(m.landmark===active||m.landmark===nearest||Math.hypot(m.landmark.x-S.x,m.landmark.z-S.z)<100);m.line.visible=!inspectLandmark&&near&&(m.landmark===active||m.landmark===nearest);}
}

let leavingCity=false;
function chooseCity(){if(leavingCity)return;leavingCity=true;snapshot();location.replace('index.html?from='+encodeURIComponent(CITY.id));}
function title(){S.mode='title';S.x=TITLE.x;S.z=TITLE.z;S.y=TITLE.y;S.heading=TITLE.heading;S.bank=0;S.stage='air';S.next=0;S.speed=0;positionCamera(true);menu('title',`<section class="card intro"><p class="eyebrow">${CITY.name} · The grand tour</p><h1>${isRome?'Ancient wonders.<br>Golden rooftops.':isVenice?'Canals below.<br>Palaces ahead.':'A new city.<br>A new adventure.'}</h1><p>${isRome?'Fly past ancient arenas, domes and sunlit terracotta rooftops.':isVenice?'Follow turquoise canals past stone bridges, palaces and gondolas.':'Explore '+CITY.name+' along its mapped streets and waterways.'} Follow ${hoopData.length} golden hoops.</p>${save.routeNotice?'<p>Nearby sights are now spread through the tour. Your saved plane position is kept; the reordered route starts at stop 1.</p>':''}<button id="play"><span class="key">A</span> ${save.resume?'Continue flying':'Let’s fly'}</button><p class="controls">A / Space — fly · Directions — turn & climb<br>X — barrel roll · Y / L — look at landmark · B / Esc — pause</p></section>`,chooseCity);bind('play',()=>start(!!save.resume));}
function showPause(){if(S.mode==='flight')snapshot();menu('pause',`<section class="card"><p class="eyebrow">${CITY.name} City Flight</p><h2>A little breather</h2><div class="actions vertical"><button id="resume">▶ Keep flying</button><button id="restart">🛫 Start the tour</button><button id="scenic">☀ Scenic flight</button><button id="profiles">👤 Who is flying?</button><button id="music">${save.music?'♫':'🔇'} Music ${save.music?'on':'off'}</button><button id="graphics">Graphics: ${quality}</button><button id="places">⌖ Explore places</button><button id="cities">🌍 Choose a city</button><button id="arcade">↩ Arcade</button></div></section>`,resume);bind('resume',resume);bind('restart',()=>start(false));bind('scenic',()=>start(false,true));bind('profiles',profiles);bind('music',()=>{save.music=!save.music;persist();showPause();focusButton(4);});bind('graphics',()=>{quality=qualityModes[(qualityModes.indexOf(quality)+1)%qualityModes.length];try{ArcadeProfile.storage.setItem('world-flight.graphics',quality);}catch{}resize();showPause();focusButton(5);});bind('places',()=>placesMenu());bind('cities',chooseCity);bind('arcade',()=>{snapshot();location.href='../index.html';});}
function placesMenu(category=null){
 const spots=category?cityPOIs.filter(p=>p.type===category).sort((a,b)=>Math.hypot(a.x-S.x,a.z-S.z)-Math.hypot(b.x-S.x,b.z-S.z)).slice(0,30):[...featured,...landmarkModels];
 const categories=[['hospital','Hospitals'],['mall','Shopping centers'],['university','Universities'],['library','Libraries']];
 menu('places',`<section class="card"><h2>${category?'Nearby places':'Explore '+CITY.name}</h2><p>${category?'Listed nearest to your plane':'Real locations across the city'}</p>${category?'':`<div class="actions">${categories.map(([id,label])=>`<button id="cat-${id}">${label}</button>`).join('')}</div>`}<div class="actions vertical">${spots.map((p,i)=>`<button id="place${i}">${escapeHTML(p.name)}</button>`).join('')}<button id="places-back">↩ Back</button></div></section>`,category?()=>placesMenu():showPause);
 spots.forEach((p,i)=>bind('place'+i,()=>{if(p.index!==undefined){openLandmark(p.index);return;}start(false,true);const heading=p.heading??0,distance=p.approach??90,side=p.sideOffset||0;Object.assign(S,{x:p.x-Math.sin(heading)*distance-Math.cos(heading)*side,z:p.z+Math.cos(heading)*distance+Math.sin(heading)*side,y:p.altitude??Math.max(45,(p.y||35)+15),heading});positionCamera(true);snapshot();toast(p.name);}));
 if(!category)categories.forEach(([id])=>bind('cat-'+id,()=>placesMenu(id)));bind('places-back',category?()=>placesMenu():showPause);
}
function profiles(){ArcadeProfile.switchPlayer();}
function start(restore=false,free=false){if(!startupReady)return;save.routeNotice=false;inspectLandmark=null;const r=restore?save.resume:null;Object.assign(S,{x:r?.x??(free?TITLE.x:TAKEOFF.x),z:r?.z??(free?TITLE.z:TAKEOFF.z),y:r?.y??TAKEOFF.y,heading:r?.heading??(free?TITLE.heading:TAKEOFF.heading),stage:r?.stage??'air',speed:r?.speed??22,next:clamp(r?.next??0,0,hoopData.length-1),free:r?.free??free,turn:0,vy:0,bank:0,roll:0,fx:0,invincible:0,saveT:0});confetti.visible=false;resume();positionCamera(true);snapshot();}
function resume(){S.mode='flight';$('#overlay').innerHTML='';$('#overlay').className='';$('#pause').classList.remove('hidden');$('#hud').classList.remove('hidden');$('#guide').classList.remove('hidden');$('#touch').classList.remove('hidden');held={};touch={};updateHUD();}
function back(){if(S.mode==='flight')showPause();else backAction?.();}
function confirm(){if(S.mode!=='flight'&&document.activeElement?.tagName!=='INPUT')menuButtons[focus]?.click();}
function finish(){save.best=hoopData.length;save.resume=null;persist();burst(true);menu('clear',`<section class="card"><p class="eyebrow">${hoopData.length} golden hoops · ${CITY.name}</p><h2>Wonderful flying,<br>${escapeHTML(save.name)}!</h2><div class="medal">🏅</div><p>You visited every landmark on the ${CITY.name} tour!</p><div class="actions"><button id="again"><span class="key">A</span> Keep exploring</button><button id="runway">🛫 Fly again</button></div></section>`,()=>start(false,true));bind('again',()=>start(false,true));bind('runway',()=>start(false));}
function updateHUD(){$('#hud').classList.toggle('hidden',S.free);$('#guide').classList.toggle('scenic',S.free);$('#hud').textContent=S.free?'':(hoopData[S.next]?.icon||'🏅')+' '+(hoopData[S.next]?.name||CITY.name+' explored');if(S.stage==='ground'){$('#guide').innerHTML='<span class="key">A</span> ➜ 🛩️ &nbsp; ⬆ 🛫';return;}if(S.free){$('#guide').innerHTML='🕹️ ↔ ↕ &nbsp; <span class="key">A</span> ✈ &nbsp; X ↻';return;}const p=hoopData[S.next];if(!p)return;const a=angle(Math.atan2(p.x-S.x,S.z-p.z)-S.heading),dy=p.y-S.y;const near=Math.hypot(p.x-S.x,p.z-S.z)<70,turn=Math.abs(a)>.22?(Math.abs(a)>2?'↶':a>0?'➜':'⬅'):'◎',vertical=Math.abs(dy)>10?(dy>0?'⬆':'⬇'):'';$('#guide').innerHTML='<span class="direction">'+turn+'</span>'+(vertical?'<span class="direction climb">'+vertical+'</span>':'')+'<span class="next-hoop">◎ <small>'+ (S.next+1)+'/'+hoopData.length+'</small></span><span class="guide-words">'+(Math.abs(a)>2?'Turn around':Math.abs(a)>.22?(a>0?'Turn right':'Turn left'):vertical?(dy>0?'Fly up':'Fly down'):near?'Through the hoop!':'Follow the golden path')+'</span>';}

function angle(a){return Math.atan2(Math.sin(a),Math.cos(a));}
function doRoll(){if(S.mode==='flight'&&S.stage==='air'&&S.roll<=0){S.roll=1.1;note(440,.25);note(660,.2,.15);}}
function input(){if(!startupReady)return;pad={};for(const p of GamepadStd.read('world-flight')){if(p.any)audioUnlock();if(p.index!==0)continue;pad=p;if(p.just.B||p.just.start){back();continue;}if(p.just.Y){if(S.mode==='landmark')closeLandmark();else openLandmark();}if(p.just.X)doRoll();if(p.just.A){confirm();continue;}if(S.mode!=='flight'&&document.activeElement?.tagName!=='INPUT'){if(!p.left&&!p.right&&!p.up&&!p.down)navReady=true;if(navReady){const n=GamepadStd.navRepeat(p,'berlin-menu');if(n.left||n.up)focusButton(focus-1);if(n.right||n.down)focusButton(focus+1);}}}}
addEventListener('keydown',e=>{if(!startupReady)return;if(e.target.tagName==='INPUT')return;if(['Space','Enter','ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Escape','KeyP','KeyX'].includes(e.code))e.preventDefault();audioUnlock();held[e.code]=true;if(e.repeat)return;if(e.code==='Escape'||e.code==='KeyP')back();else if(e.code==='Space'||e.code==='Enter')confirm();else if(e.code==='KeyL'){if(S.mode==='landmark')closeLandmark();else openLandmark();}else if(e.code==='KeyX')doRoll();else if(S.mode!=='flight'){if(e.code==='ArrowLeft'||e.code==='ArrowUp')focusButton(focus-1);if(e.code==='ArrowRight'||e.code==='ArrowDown')focusButton(focus+1);}});addEventListener('keyup',e=>delete held[e.code]);
$('#pause').onclick=showPause;for(const b of document.querySelectorAll('[data-input]')){b.onpointerdown=e=>{e.preventDefault();audioUnlock();touch[b.dataset.input]=true;if(b.dataset.input==='X')doRoll();b.setPointerCapture(e.pointerId);};for(const event of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(event,()=>touch[b.dataset.input]=false);}
addEventListener('pointerdown',e=>{audioUnlock();if(e.pointerType==='touch')document.body.classList.add('touch');});if(matchMedia('(pointer:coarse)').matches)document.body.classList.add('touch');
function hide(){held={};touch={};if(S.mode==='flight')showPause();}addEventListener('blur',hide);document.addEventListener('visibilitychange',()=>{if(document.hidden)hide();});addEventListener('pagehide',snapshot);addEventListener('arcade-exit',snapshot);
function update(dt){S.time+=dt;if(S.toast>0&&(S.toast-=dt)<=0)$('#toast').textContent='';if(S.mode==='flight'){
 const gas=held.Space||held.Enter||touch.A||pad.A,right=(held.ArrowRight||touch.right||pad.right?1:0)-(held.ArrowLeft||touch.left||pad.left?1:0),up=(held.ArrowUp||touch.up||pad.up?1:0)-(held.ArrowDown||touch.down||pad.down?1:0),ground=S.stage==='ground';S.speed=lerp(S.speed,gas?40:ground?0:14,1-Math.exp(-1.9*dt));S.turn=lerp(S.turn,right*(ground?.24:.96),1-Math.exp(-5*dt));S.heading=angle(S.heading+S.turn*dt);S.bank=lerp(S.bank,ground?0:-S.turn*.46,1-Math.exp(-5*dt));S.vy=lerp(S.vy,up*21,1-Math.exp(-5*dt));S.x+=Math.sin(S.heading)*S.speed*dt;S.z-=Math.cos(S.heading)*S.speed*dt;
 if(ground){S.heading=clamp(S.heading,TAKEOFF.heading-.15,TAKEOFF.heading+.15);S.z=clamp(S.z,TAKEOFF.z-(S.x-TAKEOFF.x)*.071-6,TAKEOFF.z-(S.x-TAKEOFF.x)*.071+6);S.y=3.3;if(S.speed>18&&(up>0||S.x>TAKEOFF.x+150)){S.stage='air';S.y=8;toast('🛫  Up we go!');note(523);}}
 else {S.y=clamp(S.y+S.vy*dt,8,225);S.invincible=Math.max(0,S.invincible-dt);if(S.invincible<=0){const o=nearbyObstacles(S.x,S.z).find(o=>Math.abs(S.x-o.x)<o.w&&Math.abs(S.z-o.z)<o.d&&S.y<o.h);if(o){S.y=o.h+3;S.speed*=.7;S.invincible=1;toast('☁️  Whoosh!');}}if(!S.free){const p=hoopData[S.next];if(p&&Math.hypot(S.x-p.x,S.z-p.z)<75&&Math.abs(angle(Math.atan2(p.x-S.x,S.z-p.z)-S.heading))<.6){if(!up)S.y=lerp(S.y,p.y,dt*.9);if(!right)S.heading+=angle(Math.atan2(p.x-S.x,S.z-p.z)-S.heading)*dt*.18;}if(p&&Math.hypot(S.x-p.x,S.y-p.y,S.z-p.z)<22){hoops[S.next].visible=false;S.next++;save.best=Math.max(save.best||0,S.next);if(S.next===hoopData.length)finish();else{burst();toast((p.icon||'★')+' '+p.name+'  ✓');snapshot();}}}
 if(S.x<nw.x+30||S.x>se.x-30||S.z>se.z-30||S.z<nw.z+30){const a=angle(Math.atan2(-S.x,S.z)-S.heading);S.heading+=Math.sign(a)*dt*.7;}
 }S.roll=Math.max(0,S.roll-dt);S.saveT+=dt;if(S.saveT>1){S.saveT=0;snapshot();updateHUD();}if(Math.floor(S.time*10)!==Math.floor((S.time-dt)*10))updateHUD();}
 if(S.fx>0){S.fx-=dt;for(let i=0;i<180;i++){fleckPositions[i*3]+=fleckVelocity[i*3]*dt;fleckPositions[i*3+1]+=fleckVelocity[i*3+1]*dt;fleckPositions[i*3+2]+=fleckVelocity[i*3+2]*dt;fleckVelocity[i*3+1]-=7*dt;}fleckGeo.attributes.position.needsUpdate=true;confetti.material.opacity=Math.min(1,S.fx);if(S.fx<=0)confetti.visible=false;}
 if(audio){engineGain.gain.setTargetAtTime(S.mode==='flight'?.012:0,audio.currentTime,.12);engine.frequency.setTargetAtTime(45+S.speed*2.5,audio.currentTime,.15);if(S.mode==='flight'&&save.music&&(musicT-=dt)<=0){musicT=.38;note(196*Math.pow(2,[0,4,7,12,9,7,4,2][musicI++%8]/12),.19);}}
}
function positionCamera(snap=false){
 aircraft.visible=S.mode!=='landmark';
 if(S.mode==='landmark'&&inspectLandmark){const l=inspectLandmark,r=Math.max(14,Math.hypot(l.wx,l.dz,l.modelHeight*.5)),distance=r*3.2/Math.min(1,camera.aspect),a=inspectionAngle+S.time*.035;camera.fov=45;camera.updateProjectionMatrix();camera.position.set(l.x+Math.sin(a)*distance,l.modelHeight*.5+distance*.6,l.z+Math.cos(a)*distance);camera.lookAt(l.x,l.modelHeight*.5-r*.13,l.z);return;}
 const fov=54+clamp((S.speed-14)/26,0,1)*8;if(Math.abs(camera.fov-fov)>.05){camera.fov=lerp(camera.fov,fov,snap?1:.12);camera.updateProjectionMatrix();}aircraft.position.set(S.x,S.y,S.z);aircraft.rotation.y=-S.heading;body.rotation.z=S.bank+(S.roll>0?(1-S.roll/1.1)*TAU:0);body.rotation.x=-S.vy*.012;const sy=Math.sin(S.heading),cy=Math.cos(S.heading);const followDistance=29*Math.max(1,1.1/camera.aspect);desired.set(S.x-sy*followDistance,S.y+(S.stage==='ground'?8:19),S.z+cy*followDistance);camera.position.lerp(desired,snap?1:.13);look.set(S.x+sy*55,S.y-10,S.z-cy*55);
 const l=featuredLandmark(),dx=l.x-S.x,dz=l.z-S.z,dist=Math.hypot(dx,dz),ahead=(dx*sy-dz*cy)/Math.max(1,dist),weight=clamp((230-dist)/150,0,1)*clamp((ahead-.1)/.6,0,1)*.5;
 if(S.mode==='flight'||S.mode==='title'){look.x=lerp(look.x,l.x,weight*.45);look.z=lerp(look.z,l.z,weight*.45);look.y=lerp(look.y,l.modelHeight*.35,weight);}camera.lookAt(look);}
function render(){const t0=performance.now();positionCamera();guidePath();glints.material.uniforms.time.value=S.time;propeller.rotation.z=S.time*(S.mode==='flight'?38+S.speed*2:30);propdisk.visible=S.speed>10;water.material.uniforms.time.value=S.time*.32;for(const b of boats){const p=riverPoint(b.t+S.time*.002);b.g.position.set(p.x,0,p.z);b.g.rotation.y=p.heading;}hoops.forEach((h,i)=>{h.visible=S.mode!=='landmark'&&!S.free&&(i>=S.next&&i<=S.next+2);h.material.emissiveIntensity=i===S.next?.22+.16*Math.sin(S.time*2):.02;h.material.opacity=S.free||i===S.next?1:.36;h.scale.setScalar(i===S.next?1+Math.sin(S.time*2)*.025:1);});const lightFocus=inspectLandmark||S;sun.target.position.set(lightFocus.x,0,lightFocus.z-120);sun.position.set(lightFocus.x-330,430,lightFocus.z+70);sun.target.updateMatrixWorld();sky.position.copy(camera.position);updateLandmarkMarkers();renderCount++;renderer.shadowMap.needsUpdate=renderCount<3||renderCount%3===0;renderer.render(scene,camera);renderMs+=performance.now()-t0;renderFrames++;}
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
 const views=[{...TAKEOFF,stage:'air'},...hoopData.map(p=>({...p,heading:0,stage:'air'})),...(save.resume?[save.resume]:[]),{...TITLE,stage:'air'}];
 for(let i=0;i<views.length;i++){
  await loadingStage(91+7*i/views.length,'Checking the starting views…');
  Object.assign(S,views[i],{mode:'loading'});positionCamera(true);renderCount=0;
  render();await waitForGraphics();render();await waitForGraphics();startup.warmViews++;
 }
 for(const l of landmarkModels){inspectLandmark=l;Object.assign(S,{mode:'landmark'});positionCamera(true);renderCount=0;render();await waitForGraphics();render();await waitForGraphics();}inspectLandmark=null;
 Object.assign(S,initialState);positionCamera(true);
 await loadingStage(100,'Ready for takeoff!');
 startup.ready=true;startup.shaderPrograms=renderer.info.programs.length;startup.geometryCount=renderer.info.memory.geometries;startup.elapsedMs=performance.now()-startup.startedAt;
 renderMs=0;renderFrames=0;held={};touch={};acc=0;
 // Consume buttons held during loading; starting requires a fresh confirm press.
 GamepadStd.read('world-flight');
 startupReady=true;
 document.querySelector('#loading').remove();
}
await prepareGraphics();
if(new URLSearchParams(location.search).has('test'))window.FlightTest={get state(){return {...S,city:CITY.id,startup:{...startup},shaderPrograms:renderer.info.programs.length,geometryCount:renderer.info.memory.geometries,inspecting:inspectLandmark?.name||null,focus:menuButtons[focus]?.id,save,profile:db.current,localProps,mapBuildings:buildings.length,mapPlaces:cityPOIs.length,quality,canvasSize:[renderer.domElement.width,renderer.domElement.height],drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles,meanRender:renderMs/Math.max(1,renderFrames)};},step:n=>{input();for(let i=0;i<n;i++)update(1/120);},set:v=>{Object.assign(S,v);positionCamera(true);},start,render,hoops:hoopData,river:riverX,look:openLandmark,closeLook:closeLandmark,landmarks:landmarkModels,landmarkBounds:i=>{const l=landmarkModels[i],points=[];for(const x of [-l.wx,l.wx])for(const y of [0,l.modelHeight])for(const z of [-l.dz,l.dz])points.push(new T.Vector3(l.x+x,y,l.z+z).project(camera));return {left:Math.min(...points.map(p=>p.x)),right:Math.max(...points.map(p=>p.x)),top:Math.max(...points.map(p=>p.y)),bottom:Math.min(...points.map(p=>p.y))};},programs:()=>renderer.info.programs.map(p=>({name:p.name,key:p.cacheKey}))};
title();persist();last=performance.now();acc=0;requestAnimationFrame(frame);
})().catch(error=>{console.error(error);const panel=document.querySelector('#error');panel.classList.remove('hidden');panel.innerHTML='<section class="card"><h2>Could not load this city</h2><p>Try reloading the game in a recent browser.</p><button onclick="location.reload()">Reload</button><a href="index.html">Choose a city</a></section>';});
