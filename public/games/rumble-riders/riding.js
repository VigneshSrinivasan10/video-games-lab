/* Ballistic flight and course surfaces, independent of rendering. */
(() => {
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 const ramps={simple:{length:44,rise:34,velocity:410},flip:{length:62,rise:50,velocity:530}};
 function rampHeight(kind,t){return ramps[kind||'simple'].rise*Math.pow(clamp(t,0,1),2.4)}
 function launch(kind,speed){const r=ramps[kind]||ramps.simple,height=r.rise*4.9,velocity=r.velocity+clamp(speed-76,0,40)*.25;return {height,velocity,duration:(velocity+Math.sqrt(velocity*velocity+1200*height))/600}}
 function step(height,velocity,dt,gravity=600,groundDelta=0){const y=height+velocity*dt-.5*gravity*dt*dt-groundDelta,v=velocity-gravity*dt;return {height:Math.max(0,y),velocity:y<=0?0:v,landed:y<=0,impact:y<=0?Math.max(0,-v):0}}
 function rotation(age,duration,height,velocity){let t=clamp(age/duration,0,1);if(velocity<0&&height<40)t=Math.max(t,1-height/220);return (t*t*(3-2*t))*Math.PI*2}
 const banks=[[],[[800,1900,9],[3800,5000,-10]],[],[[2700,3600,7]],[[1800,3100,-9]],[[2200,3300,10]],[[3500,4500,8]],[],[[1100,2400,-11],[4200,5500,11]],[[2400,3400,12],[5400,6400,-12]]];
 const dirt=[[],[[2600,3550]],[],[[0,6840]],[[4000,4800]],[],[[4600,5400]],[],[[700,2100],[3600,5200]],[[3600,4400]]];
 function bank(index,d){let value=0;for(const [a,b,angle] of banks[index])if(d>a&&d<b)value+=Math.sin(Math.PI*(d-a)/(b-a))**2*angle;return value}
 function surface(index,d){return dirt[index].some(([a,b])=>d>=a&&d<=b)?'dirt':'road'}
 globalThis.RumbleRiding={ramps,rampHeight,launch,step,rotation,bank,surface,dirt};
})();
