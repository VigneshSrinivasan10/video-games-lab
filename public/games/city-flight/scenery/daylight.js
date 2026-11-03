/* One daylight setup drives direct light, sky, metal reflections and water. */
window.CityDaylight={
 // NOAA fractional-year solar equations; dates are UTC, azimuth clockwise from
 // north. Our map has east +X and north -Z. This is a fixed authored afternoon.
 solarPosition({latitude,longitude,date}){
  const d=new Date(date),year=d.getUTCFullYear(),hour=d.getUTCHours()+d.getUTCMinutes()/60+d.getUTCSeconds()/3600;
  if(!Number.isFinite(d.getTime())||!Number.isFinite(latitude)||Math.abs(latitude)>90||!Number.isFinite(longitude)||Math.abs(longitude)>180)throw new Error('Invalid solar location or date');
  const leap=year%4===0&&(year%100!==0||year%400===0),day=Math.floor((d-Date.UTC(year,0,1))/86400000)+1;
  const g=2*Math.PI/(leap?366:365)*(day-1+(hour-12)/24),rad=Math.PI/180;
  const eq=229.18*(.000075+.001868*Math.cos(g)-.032077*Math.sin(g)-.014615*Math.cos(2*g)-.040849*Math.sin(2*g));
  const decl=.006918-.399912*Math.cos(g)+.070257*Math.sin(g)-.006758*Math.cos(2*g)+.000907*Math.sin(2*g)-.002697*Math.cos(3*g)+.00148*Math.sin(3*g);
  const ha=((hour*60+eq+4*longitude)/4-180)*rad,lat=latitude*rad;
  const elevation=Math.asin(Math.max(-1,Math.min(1,Math.sin(lat)*Math.sin(decl)+Math.cos(lat)*Math.cos(decl)*Math.cos(ha))));
  const azimuth=Math.atan2(Math.sin(ha),Math.cos(ha)*Math.sin(lat)-Math.tan(decl)*Math.cos(lat))+Math.PI;
  return {elevation:elevation/rad,azimuth:(azimuth/rad+360)%360,direction:[Math.sin(azimuth)*Math.cos(elevation),Math.sin(elevation),-Math.cos(azimuth)*Math.cos(elevation)]};
 },
 create({T,renderer,scene,style={}}){
 const illustrated=style.aesthetic==='illustrated',desert=style.desert,autumn=style.season==='autumn',soft=['berlin','paris','london'].includes(style.id);
 const solar=style.solar?window.CityDaylight.solarPosition(style.solar):null;
 const direction=solar?new T.Vector3(...solar.direction):new T.Vector3(-.52,desert?.92:soft?.76:.84,.38).normalize();
 const top=new T.Color(style.sky||'#7ba9cf'),bottom=new T.Color(style.haze||'#c6d8e5');
 const cloudColor=new T.Color(autumn?'#f9fbff':'#f1f4f7'),groundColor=new T.Color(desert?'#b3a797':autumn?'#92999e':'#8b908d');
 const sunColor=new T.Color(illustrated?'#ffffff':desert?'#fff4e5':autumn?'#ffffff':'#fff9ef'),cloudAmount=desert?.07:autumn?.16:soft?.48:.3;
 const horizonColor=new T.Color('#f0c78f'),horizonWarmth=0;
 const skyHeight=illustrated?.32:autumn?.45:.8,skyPower=illustrated?.65:autumn?.28:.48;
 const fogDensity=illustrated?.00045:desert?.00085:autumn?.00057:soft?.00078:.0007;
 renderer.toneMappingExposure=illustrated?1.02:autumn?1.06:.98;renderer.shadowMap.type=T.PCFShadowMap;
 const ambient=new T.HemisphereLight(illustrated?'#c3e0ff':autumn?'#d6e5f5':'#d6e6f7',desert?'#b7aa96':illustrated?'#bbc8cf':autumn?'#9fa4a8':'#a39f97',illustrated?.82:autumn?1.02:soft?1.02:.94);
 const sun=new T.DirectionalLight(sunColor,illustrated?3.15:desert?3.05:autumn?3.4:soft?2.65:2.85);
 sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.radius=desert?1.3:autumn?2:soft?2.3:1.8;
 Object.assign(sun.shadow.camera,{left:-330,right:330,top:330,bottom:-330,near:1,far:1800});
 // Leave enough depth separation for sloped roofs across the wide shadow map.
 sun.shadow.bias=autumn?-.00055:-.00035;sun.shadow.normalBias=autumn?.2:.15;scene.add(ambient,sun,sun.target);
 const right=new T.Vector3().crossVectors(new T.Vector3(0,1,0),direction).normalize(),up=new T.Vector3().crossVectors(direction,right).normalize();
 const focusPoint=new T.Vector3();let shadowRange=330;
 function update(focus,range=330){
  if(range!==shadowRange){Object.assign(sun.shadow.camera,{left:-range,right:range,top:range,bottom:-range});sun.shadow.camera.updateProjectionMatrix();shadowRange=range;}
  // Anchor the moving shadow camera to its light-space texel grid. Small plane
  // movements should not make a stationary building's shadow crawl over paving.
  focusPoint.set(focus.x,0,focus.z);const texel=range*2/sun.shadow.mapSize.x;
  const u=focusPoint.dot(right),v=focusPoint.dot(up);
  focusPoint.addScaledVector(right,Math.round(u/texel)*texel-u).addScaledVector(up,Math.round(v/texel)*texel-v);
  sun.target.position.copy(focusPoint);sun.position.copy(focusPoint).addScaledVector(direction,800);sun.target.updateMatrixWorld();
 }
 update({x:0,z:0});
 const smooth=(a,b,x)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);};
 const fract=x=>x-Math.floor(x),hash=(x,z)=>fract(Math.sin(x*127.1+z*311.7)*43758.5453);
 function noise(x,z){const ix=Math.floor(x),iz=Math.floor(z),u=smooth(0,1,x-ix),v=smooth(0,1,z-iz);return (hash(ix,iz)*(1-u)+hash(ix+1,iz)*u)*(1-v)+(hash(ix,iz+1)*(1-u)+hash(ix+1,iz+1)*u)*v;}
 function sampleSky(x,y,z,out){
  if(y<0)return out.copy(bottom).multiplyScalar(.7).lerp(groundColor,smooth(0,.5,-y));
  const h=Math.pow(smooth(0,skyHeight,y),skyPower),px=x/Math.max(.12,y)*2.3,pz=z/Math.max(.12,y)*2.3;
  const n=noise(px,pz)*.57+noise(px*2.03,pz*2.03)*.28+noise(px*4.07,pz*4.07)*.15;
  const cloud=smooth(.55,.78,n)*smooth(.04,.25,y)*cloudAmount;
  const toward=(x*direction.x+z*direction.z)/Math.max(.001,Math.hypot(x,z)*Math.hypot(direction.x,direction.z));
  const warmth=Math.pow(Math.max(0,toward),4)*Math.exp(-y*5)*horizonWarmth;
  out.copy(bottom).lerp(top,h).lerp(horizonColor,warmth).lerp(cloudColor,cloud);
  const dot=Math.max(0,x*direction.x+y*direction.y+z*direction.z),glow=Math.pow(dot,48)*.12+Math.pow(dot,512)*.3+smooth(.99992,.999985,dot)*8;
  out.r+=sunColor.r*glow;out.g+=sunColor.g*glow;out.b+=sunColor.b*glow;return out;
 }
 function environmentTexture(){
  // Linear HDR data retains the sun's brightness in metal reflections. The
  // azimuth, sky colours and cloud field are the same as the visible sky below.
  const width=512,height=256,data=new Uint16Array(width*height*4),color=new T.Color(),half=T.DataUtils.toHalfFloat;
  for(let y=0;y<height;y++){const theta=(y+.5)/height*Math.PI,sy=-Math.cos(theta),r=Math.sin(theta);for(let x=0;x<width;x++){
   const phi=((x+.5)/width-.5)*Math.PI*2,i=(y*width+x)*4;sampleSky(Math.cos(phi)*r,sy,Math.sin(phi)*r,color);data[i]=half(color.r);data[i+1]=half(color.g);data[i+2]=half(color.b);data[i+3]=half(1);
  }}
  const texture=new T.DataTexture(data,width,height,T.RGBAFormat,T.HalfFloatType);texture.mapping=T.EquirectangularReflectionMapping;texture.colorSpace=T.LinearSRGBColorSpace;texture.flipY=false;texture.minFilter=texture.magFilter=T.LinearFilter;texture.needsUpdate=true;return texture;
 }
 function skyMaterial(){return new T.ShaderMaterial({side:T.BackSide,toneMapped:false,depthWrite:false,
  uniforms:{top:{value:top},bottom:{value:bottom},sunDirection:{value:direction},sunColor:{value:sunColor},cloudColor:{value:cloudColor},cloudAmount:{value:cloudAmount},horizonColor:{value:horizonColor},horizonWarmth:{value:horizonWarmth},skyHeight:{value:skyHeight},skyPower:{value:skyPower}},
  vertexShader:'varying vec3 v;void main(){v=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
  fragmentShader:`varying vec3 v;uniform vec3 top,bottom,sunDirection,sunColor,cloudColor,horizonColor;uniform float cloudAmount,horizonWarmth,skyHeight,skyPower;
   float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
   float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1)),f.x),f.y);}
   void main(){vec3 dir=normalize(v);float h=pow(smoothstep(0.,skyHeight,dir.y),skyPower);vec3 col=mix(bottom,top,h);
    float toward=dot(dir.xz,sunDirection.xz)/max(.001,length(dir.xz)*length(sunDirection.xz));
    col=mix(col,horizonColor,pow(max(0.,toward),4.)*exp(-max(0.,dir.y)*5.)*horizonWarmth);
    vec2 p=dir.xz/max(.12,dir.y)*2.3;float n=noise(p)*.57+noise(p*2.03)*.28+noise(p*4.07)*.15;
    float cloud=smoothstep(.55,.78,n)*smoothstep(.04,.25,dir.y)*cloudAmount;col=mix(col,cloudColor,cloud);
    float light=max(0.,dot(dir,sunDirection));float glow=pow(light,48.)*.12+pow(light,512.)*.3+smoothstep(.99992,.999985,light)*8.;col+=sunColor*glow;
    gl_FragColor=vec4(col,1.);
    #include <colorspace_fragment>
   }`});}
 return {sun,ambient,direction,sunColor,solar,fogDensity,update,environmentTexture,skyMaterial};
}};
