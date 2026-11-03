/* Mapped street planting. Reuse the city's spatial batches and approved colours. */
window.CityStreetscape={build({T,environment,features,planting,tree,box,stamp,strip,cityId='berlin',focuses=[],exclude=()=>false}){
 const stats={streetTrees:0,plantingBeds:0,flowerBeds:0,lamps:0,laneDashes:0,cycleLanes:0};
 const shrub=new T.IcosahedronGeometry(1,1),petal=new T.SphereGeometry(1,6,4),pole=new T.CylinderGeometry(1,1,1,8);
 const M=environment.materials,flowers=[environment.surface('#e9bd43'),environment.surface('#e74635'),M.ivory];
 for(const [i,p] of planting.avenues.entries()){
  const {x,z,dx,dz}=p,angle=-Math.atan2(dz,dx);
  box(x,.24,z,3.65,.25,1.35,M.concrete,angle);box(x,.38,z,3.35,.06,1.08,M.lawn,angle,false);
  tree(x,z,p.h,p.variant);stats.streetTrees++;stats.plantingBeds++;
  for(const side of [-1,1]){
   const xx=x+dx*side*1.12,zz=z+dz*side*1.12;
   stamp(shrub,M.leaves[2],xx,.62,zz,.63,.34,.46,angle,0,0,false);
   if(i%3===0)for(let j=0;j<3;j++){
    const off=(j-1)*.3;stamp(petal,flowers[(i+j)%3],xx+dx*off-dz*.08,.91,zz+dz*off+dx*.08,.18,.12,.18,0,0,0,false);
   }
  }
  if(i%3===0)stats.flowerBeds++;
  if(i%6===0){
   const xx=x-dx*1.55,zz=z-dz*1.55;
   stamp(pole,M.dark,xx,1.9,zz,.055,3.3,.055);
   box(xx,3.52,zz,.72,.1,.36,M.dark,angle);box(xx,3.4,zz,.52,.16,.25,M.ivory,angle,false);stats.lamps++;
  }
 }
 const district=(x,z)=>cityId==='berlin'&&x>-100&&x<160&&z>90&&z<230;
 const near=(x,z)=>focuses.length?focuses.some(p=>Math.hypot(x-p.x,z-p.z)<450):x>=-1300&&x<=1100&&z>=-700&&z<=950;
 for(const f of features){
  if(f.k!=='road'||f.bridge||f.noMarkings||cityId==='venice'||![4.2,5,6,7].includes(f.w))continue;
  for(let i=1;i<f.p.length;i++){
   const a=f.p[i-1],b=f.p[i],length=Math.hypot(b[0]-a[0],b[1]-a[1]),x=(a[0]+b[0])/2,z=(a[1]+b[1])/2;
   if(length<20||!near(x,z)||district(x,z)||exclude(x,z))continue;
   const dx=(b[0]-a[0])/length,dz=(b[1]-a[1])/length;
   const point=(d,side=0)=>[a[0]+dx*d-dz*side,a[1]+dz*d+dx*side];
   for(let d=7;d<length-9;d+=5.5){strip(point(d),point(d+2.2),.12,.185,'#f3f4e9');stats.laneDashes++;}
   if(f.w>=6)for(const side of [-1,1]){
    const offset=side*(f.w/2-.52);strip(point(6,offset),point(length-6,offset),.64,.18,'#be806b');
    strip(point(6,offset-side*.38),point(length-6,offset-side*.38),.07,.185,'#f3f4e9');stats.cycleLanes++;
   }
  }
 }
 return {stats};
}};
