const TEST_URL = process.env.ARCADE_TEST_URL || 'http://127.0.0.1:8766';
import {launch} from '../helpers/cdp.mjs';import assert from 'node:assert/strict';import fs from 'node:fs';
const cities=JSON.parse(fs.readFileSync(new URL('../../public/games/city-flight/cities.json',import.meta.url)));
for(const c of cities){assert.equal(c.routeVersion,6);assert.equal(c.landmarks.length,25);assert.deepEqual(c.landmarks.map(l=>l.id).sort(),[...c.previousRouteIds].sort());for(let i=1;i<25;i++){const a=c.landmarks[i-1],b=c.landmarks[i],d=Math.hypot((a.lon-b.lon)*Math.cos((a.lat+b.lat)*Math.PI/360),a.lat-b.lat)*111.32;assert(d>=.75&&d<2.15,c.id+' adjacent cluster or distant detour');}}
const b=await launch({headed:true,args:['--headless=new','--ozone-platform=headless','--use-angle=gl-egl','--enable-gpu','--ignore-gpu-blocklist']});
await b.signIn(TEST_URL);
try{
 await b.addInit(fs.readFileSync(new URL('../helpers/fakepad.js',import.meta.url),'utf8'));
 await b.goto((TEST_URL + '/world-flight/index.html'));
 for(const [path,key,hook,version] of [['world-flight/game.html?city=venice&test','world-flight.venice.v1','FlightTest',5],['berlin-city-flight.html?test','berlin-city-flight.v1','BerlinTest',4]]){
  const old={tourVersion:version,current:0,profiles:[{name:'PILOT',music:false,best:25,resume:{x:20,z:30,y:150,heading:1,speed:0,next:8,free:false,stage:'air'}}]};
  await b.eval(`localStorage.setItem(${JSON.stringify(key)},${JSON.stringify(JSON.stringify(old))})`);
  async function load(){await b.goto((TEST_URL + '/')+path);for(let i=0;i<250&&!await b.eval('!!window.'+hook);i++)await b.sleep(100);assert(await b.eval('!!window.'+hook));}
  await load();let save=await b.eval(`${hook}.state.save`);assert.equal(save.name,'PILOT');assert.equal(save.best,25);assert.equal(save.music,false);assert.deepEqual(save.previousTours[version],{best:25,resume:old.profiles[0].resume});
  await b.eval(`${hook}.start(true);${hook}.set({mode:'pause'})`);let state=await b.eval(`${hook}.state`);assert.equal(state.next,0);assert.equal(state.x,20);assert.equal(state.z,30);assert.equal(state.y,150);
  const hoops=await b.eval(`${hook}.hoops`);assert.equal(hoops.length,25);for(let i=1;i<25;i++)assert(Math.hypot(hoops[i].x-hoops[i-1].x,hoops[i].z-hoops[i-1].z)>180,path+' actual hoops too close');
  await b.eval(`${hook}.set({...${hook}.hoops[0],mode:'flight',stage:'air',speed:0,next:0,free:false,invincible:0});${hook}.step(1);document.querySelector('#pause').click()`);assert.equal(await b.eval(`${hook}.state.next`),1);
  await load();await b.eval(`${hook}.start(true);${hook}.set({mode:'pause'})`);assert.equal(await b.eval(`${hook}.state.next`),1);const collected=await b.eval(`${hook}.hoops.map((p,i)=>{${hook}.set({...p,next:i,mode:'flight',stage:'air',free:false,speed:0,invincible:0});${hook}.step(1);return ${hook}.state.next===i+1;})`);assert(collected.every(Boolean),'all 25 reordered hoops collectible');console.log(path,'spaced hoops; pilot, best score and position kept; reordered save resumes correctly');
 }
 assert.deepEqual(b.errors(),[]);console.log('PASS: spaced route catalogs and both save migrations');
}finally{await b.close().catch(()=>{})}
