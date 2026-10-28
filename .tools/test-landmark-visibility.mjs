import {launch} from './cdp.mjs';import fs from 'node:fs';import assert from 'node:assert/strict';
const cities=JSON.parse(fs.readFileSync(new URL('../world-flight/cities.json',import.meta.url),'utf8'));
const b=await launch({headed:true,args:['--headless=new','--ozone-platform=headless','--use-angle=gl-egl','--enable-gpu','--ignore-gpu-blocklist']});const report=[];
try{await b.addInit(fs.readFileSync(new URL('fakepad.js',import.meta.url),'utf8'));await b.send('Emulation.setDeviceMetricsOverride',{width:1920,height:1080,deviceScaleFactor:1,mobile:false});
for(const city of (process.argv[2]?cities.filter(c=>process.argv[2].split(',').includes(c.id)):cities)){await b.goto('http://127.0.0.1:8777/world-flight/game.html?city='+city.id+'&test');for(let i=0;i<200&&!await b.eval('!!window.FlightTest');i++)await b.sleep(100);assert(await b.eval('!!window.FlightTest'),city.id+' loaded');
 await b.eval('FlightTest.start(false)');const initial=await b.eval('(()=>{const s=FlightTest.state;FlightTest.look(0);return s;})()');const checks=[];
 for(let i=0;i<city.landmarks.length;i++){
  await b.eval(`FlightTest.look(${i});FlightTest.render();FlightTest.step(120);FlightTest.render()`);const s=await b.eval('FlightTest.state'),bounds=await b.eval(`FlightTest.landmarkBounds(${i})`);
  assert.equal(s.mode,'landmark');assert.equal(s.x,initial.x);assert.equal(s.y,initial.y);assert.equal(s.z,initial.z);assert.equal(s.next,initial.next);assert.equal(s.geometryCount,initial.geometryCount,city.id+' no geometry upload');assert.equal(s.shaderPrograms,initial.shaderPrograms,city.id+' no shader compile');
  assert(bounds.left>-.95&&bounds.right<.95&&bounds.top<.95&&bounds.bottom>-.8,city.name+' '+city.landmarks[i].name+' framed '+JSON.stringify(bounds));
  checks.push({landmark:city.landmarks[i].name,...bounds});if(['rome','venice','bengaluru'].includes(city.id)){await b.screenshot('/tmp/landmark-'+city.id+'-'+i+'.png');}
 }
 await b.eval('__fake.tap("B")');assert.equal(await b.eval('FlightTest.state.mode'),'flight');await b.eval('__fake.tap("Y")');assert.equal(await b.eval('FlightTest.state.mode'),'landmark');await b.eval('__fake.tap("A")');assert.equal(await b.eval('FlightTest.state.mode'),'flight');
 report.push({city:city.id,checks});console.log(city.id,checks.length,'landmarks framed; flight paused and restored');
}
await b.send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:2,mobile:true});await b.eval('FlightTest.look(0)');await b.screenshot('/tmp/landmark-mobile.png');assert(await b.eval('document.documentElement.scrollWidth<=innerWidth'));assert.deepEqual(b.errors(),[]);fs.writeFileSync((process.argv[3]||'/tmp/landmark-visibility-validation.json'),JSON.stringify({report,errors:b.errors()},null,2));
}finally{await b.close().catch(()=>{})}
