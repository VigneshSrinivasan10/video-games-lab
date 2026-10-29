import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { launch } from '../helpers/cdp.mjs';
import { startTestServer } from '../helpers/server.mjs';
const server=await startTestServer(), b=await launch({args:['--window-size=800,600']});
const cities=JSON.parse(await fs.readFile(new URL('../../public/games/city-flight/cities.json',import.meta.url)));
const selected=process.argv[2]?.split(',');
const cases=[...cities.map(c=>[c.id,'world-flight/game.html?city='+c.id+'&test','FlightTest']),['berlin','berlin-city-flight.html?test','BerlinTest']].filter(([id])=>!selected||selected.includes(id));
const report=[];
async function until(expression,timeout=180000){let last=Date.now();const end=last+timeout;while(Date.now()<end){if(await b.eval(expression))return;await b.sleep(300);if(Date.now()-last>20000){console.log('Waiting for scene:',await b.eval('document.querySelector("#loading-status")?.textContent'));last=Date.now();}}throw Error('Timed out: '+expression);}
try{
 await b.addInit(await fs.readFile(new URL('../helpers/fakepad.js',import.meta.url),'utf8'));
 await b.signIn(server.base,'flight-check');await b.goto(server.base+'/index.html');
 await b.eval('ArcadeProfile.storage.setItem("world-flight.graphics","Performance");ArcadeProfile.storage.setItem("berlin-city-flight.graphics","Performance");ArcadeProfile.sync()');
 await b.goto(server.base+'/world-flight/index.html');assert.equal(await b.eval('document.querySelectorAll(".fly").length'),17);
 for(const [id,page,hook] of cases){
  console.log('Testing flight:',id);const begin=b.logs.length;
  await b.goto(server.base+'/'+page);
  await until(`!!window.${hook} && ${hook}.state.startup.ready`);
  assert.equal(await b.eval(`${hook}.hoops.length`),25,id);
  await b.eval('document.querySelector("#play").click()');
  await until(`${hook}.state.mode==='flight'`,10000);
  await b.eval('document.querySelector("#pause").click()');
  await b.eval('document.querySelector("#scenic").click()');
  const heading=await b.eval(`${hook}.state.heading`);
  await b.eval('__fake.stick(.8,0)');await b.sleep(600);await b.eval('__fake.stick(0,0)');
  assert.notEqual(await b.eval(`${hook}.state.heading`),heading,id+' controller steering');
  await b.eval('document.querySelector("#pause").click()');await b.eval('ArcadeProfile.sync()');
  assert.deepEqual(b.logs.slice(begin).filter(x=>x.startsWith('EXC')),[],id);
  await b.fire('__fake.hold("B",2400)');await until('location.pathname==="/index.html"',12000);
  assert.ok(await b.eval('Object.keys(ArcadeBootstrap.saves).some(k=>k.includes('+JSON.stringify(id)+'))'),id+' saved progress');
  report.push({id,status:'passed'});console.log('PASS',id,'map load, 25 stops, flight, steering, pause/save, return');
 }
}finally{await fs.writeFile('/tmp/video-games-lab-flight-tests.json',JSON.stringify(report,null,2));try{await b.close();}finally{await server.stop();}}
