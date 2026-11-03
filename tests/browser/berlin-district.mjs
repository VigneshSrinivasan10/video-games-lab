import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { launch } from '../helpers/cdp.mjs';
import { startTestServer } from '../helpers/server.mjs';

const output = path.resolve('.local/berlin-district');
await fs.mkdir(output, { recursive: true });
const server = await startTestServer();
const browser = await launch({ headed: true, args: ['--headless=new', '--ozone-platform=headless', '--use-angle=gl-egl', '--enable-gpu', '--ignore-gpu-blocklist'] });
const report = {};
const originalBerlin = JSON.stringify({ tourVersion: 5, current: 0, profiles: [{ name: 'berlin-district-check', best: 7, resume: null, music: false }] });
async function until(expression, timeout = 180000) {
  const end = Date.now() + timeout;
  while (Date.now() < end) {
    if (await browser.eval(expression)) return;
    assert.equal(await browser.eval('document.querySelector("#error")?.classList.contains("hidden")'), true, 'scene loads without an error panel');
    await browser.sleep(250);
  }
  throw new Error('Timed out: ' + expression);
}
try {
  await browser.addInit(await fs.readFile(new URL('../helpers/fakepad.js', import.meta.url), 'utf8'));
  await browser.signIn(server.base, 'berlin-district-check');
  await browser.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  await browser.goto(server.base + '/index.html');
  await browser.eval(`ArcadeProfile.storage.setItem('berlin-city-flight.v1',${JSON.stringify(originalBerlin)});ArcadeProfile.storage.setItem('berlin-city-flight.graphics','Performance');ArcadeProfile.sync()`);
  assert.equal(await browser.eval('ArcadeProfile.storage.getItem("berlin-city-flight.v1")'), originalBerlin, 'original Berlin fixture is saved before launching the district');
  await browser.goto(server.base + '/index.html');
  assert.equal(await browser.eval(`document.querySelectorAll('a[href="/games/berlin-district/index.html"]').length`), 1, 'arcade lists the new game once');
  assert.equal(await browser.eval(`document.querySelectorAll('a[href="world-flight/index.html"]').length`), 1, 'original City Flight remains in the arcade');
  await browser.eval('(()=>{const tile=Array.from(document.querySelectorAll(".tile")).find(t=>t.getAttribute("href")==="/games/berlin-district/index.html");tile.href+="?test";tile.dispatchEvent(new MouseEvent("mouseenter"));})()');
  await browser.press('Enter', 'Enter');
  await until('!!window.BerlinDistrictTest && BerlinDistrictTest.state.startup.ready');
  assert.equal(await browser.eval('BerlinDistrictTest.state.quality'), 'Balanced', 'district graphics settings are independent');
  report.startup = await browser.eval('BerlinDistrictTest.state.startup');
  report.district = await browser.eval('BerlinDistrictTest.state.district');
  report.geometryAudit = await browser.eval('BerlinDistrictTest.auditGeometry()');
  assert.deepEqual(report.geometryAudit.invalid, [], 'scene geometry and shading attributes are finite and aligned');
  report.renderer = await browser.eval(`(()=>{const gl=document.querySelector('#view').getContext('webgl2'),ext=gl.getExtension('WEBGL_debug_renderer_info');return ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER)})()`);
  console.log('District loaded', report.district, report.renderer);
  const allocations = await browser.eval('({geometry:BerlinDistrictTest.state.geometryCount,programs:BerlinDistrictTest.state.shaderPrograms})');
  await browser.screenshot(path.join(output, 'title.png'));
  assert.equal(await browser.eval('BerlinDistrictTest.state.focus'), 'district-fly');
  await browser.eval('document.querySelector("#district-look").click()');
  const cameras = [], viewCount = report.district.viewCount;
  assert.equal(viewCount, 10);
  assert(report.district.aerial.roofs > 1500, "central Berlin has a varied roofscape");
  assert(report.district.aerial.styles.every(count => count > 100), "all six roof styles appear across the central blocks");
  assert(report.district.architecture.bridges >= 10, "central mapped bridges have structural models");
  assert.equal(report.district.crossings, 2); assert.equal(report.district.parkedCars, 4);
  assert(report.district.architecture.banks > 50, "mapped central riverbanks have masonry quays");
  assert.equal(report.district.waterLevel, -1.15, "river sits below the quays");
  for (let i = 0; i < viewCount; i++) {
    assert.equal(await browser.eval('BerlinDistrictTest.state.mode'), 'district');
    assert.equal(await browser.eval('BerlinDistrictTest.state.district.view'), i);
    await browser.sleep(200);
    cameras.push(await browser.eval('BerlinDistrictTest.motion().camera'));
    await browser.screenshot(path.join(output, `view-${i}.png`));
    await browser.eval('document.querySelector("#district-next").click()');
  }
  assert.equal(new Set(cameras.map(JSON.stringify)).size, viewCount, 'inspection views show distinct positions');
  await browser.press('Escape', 'Escape');
  assert.equal(await browser.eval('BerlinDistrictTest.state.mode'), 'title');
  // Start through the controller-facing primary action, then check real input.
  await browser.eval('__fake.set("A",true);BerlinDistrictTest.step(1);__fake.set("A",false);BerlinDistrictTest.step(1)'); await until('BerlinDistrictTest.state.mode==="flight"', 5000);
  assert.equal(await browser.eval('BerlinDistrictTest.state.free'), true);
  const before = await browser.eval('BerlinDistrictTest.state');
  await browser.eval('__fake.stick(.55,0)'); await browser.sleep(700); await browser.eval('__fake.stick(0,0)');
  assert.notEqual(await browser.eval('BerlinDistrictTest.state.heading'), before.heading, 'controller steers district flight');
  assert(await browser.eval('BerlinDistrictTest.state.district.windTime') > before.district.windTime, 'foliage animation advances during flight');
  await browser.eval('BerlinDistrictTest.startDistrict()'); await browser.sleep(1000);
  await browser.screenshot(path.join(output, 'flight.png'));
  // Hold a steady boulevard approach while sampling the actual render loop.
  await browser.eval('BerlinDistrictTest.set({x:125,y:23,z:134,heading:-1.45,speed:14,free:true,mode:"flight",stage:"air"})');
  report.flight = await browser.eval(`new Promise(resolve=>{const deltas=[];let last=performance.now(),start=last;function tick(now){deltas.push(now-last);last=now;if(now-start<8000)requestAnimationFrame(tick);else{deltas.shift();const sorted=[...deltas].sort((a,b)=>a-b);resolve({fps:1000/(deltas.reduce((a,b)=>a+b,0)/deltas.length),p95:sorted[Math.floor(sorted.length*.95)],max:Math.max(...deltas),drawCalls:BerlinDistrictTest.state.drawCalls,triangles:BerlinDistrictTest.state.triangles});}}requestAnimationFrame(tick);})`);
  assert.deepEqual(await browser.eval('({geometry:BerlinDistrictTest.state.geometryCount,programs:BerlinDistrictTest.state.shaderPrograms})'), allocations, 'district views and flying allocate no new graphics resources');
  await browser.eval('document.querySelector("#pause").click(); ArcadeProfile.sync()');
  const saved = await browser.eval('({...BerlinDistrictTest.state.save.resume})');
  assert.equal(saved.free, true, 'district flight is saved as scenic flight');
  await browser.eval('document.querySelector("#district-pause").click()');
  await browser.press('Escape', 'Escape');
  await browser.eval('document.querySelector("#play").click()');
  assert.equal(await browser.eval('BerlinDistrictTest.state.free'), true);
  assert(Math.abs((await browser.eval('BerlinDistrictTest.state.y')) - saved.y) < .5, 'saved district altitude survives inspection');
  await browser.eval('document.querySelector("#pause").click()');
  for (const quality of ['High', 'Performance', 'Balanced']) {
    await browser.eval('document.querySelector("#graphics").click();BerlinDistrictTest.render()');
    assert.equal(await browser.eval('BerlinDistrictTest.state.quality'), quality);
  }
  assert.deepEqual(await browser.eval('({geometry:BerlinDistrictTest.state.geometryCount,programs:BerlinDistrictTest.state.shaderPrograms})'), allocations, 'quality changes reuse prepared graphics resources');
  const clearance = await browser.eval('(()=>{BerlinDistrictTest.set({x:8,y:8,z:177,heading:0,mode:"flight",stage:"air",speed:0,free:true,vy:0,turn:0,invincible:0});BerlinDistrictTest.step(1);const first=BerlinDistrictTest.state.y;BerlinDistrictTest.step(119);return {first,after:BerlinDistrictTest.state.y};})()');
  assert(clearance.first >= 8 && clearance.first < 8.1 && clearance.after > clearance.first, 'new district roofs trigger gradual clearance without teleporting');
  // Added roofs must not prevent any of the existing tour checkpoints.
  const hoops = await browser.eval('BerlinDistrictTest.hoops.map((p,i)=>{BerlinDistrictTest.set({...p,next:i,mode:"flight",stage:"air",speed:0,free:false,invincible:0});BerlinDistrictTest.step(1);return BerlinDistrictTest.state.next===i+1;})');
  assert.equal(hoops.length, 25); assert(hoops.every(Boolean), 'all 25 tour checkpoints are still collectible');
  await browser.eval('BerlinDistrictTest.startDistrict();document.querySelector("#pause").click();document.querySelector("#restart").click()');
  assert.equal(await browser.eval('BerlinDistrictTest.state.stage'), 'ground', 'full tour still starts on the runway');
  // Narrow screens still expose every introduction action without horizontal overflow.
  await browser.eval('BerlinDistrictTest.showDistrict(0)'); await browser.press('Escape', 'Escape');
  await browser.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await browser.sleep(250); await browser.screenshot(path.join(output, 'mobile.png'));
  assert(await browser.eval('Array.from(document.querySelectorAll(".district-intro button")).every(b=>{const r=b.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight})'), 'district actions fit a phone screen');
  assert(await browser.eval('(()=>{const a=document.querySelector(".district-intro").getBoundingClientRect(),b=document.querySelector("#arcade-profile-bar").getBoundingClientRect();return b.bottom<=a.top||b.top>=a.bottom||b.right<=a.left||b.left>=a.right;})()'), 'profile switcher does not cover the introduction on mobile');
  await browser.eval('BerlinDistrictTest.startDistrict();document.querySelector("#pause").click();ArcadeProfile.sync()');
  assert.equal(await browser.eval('ArcadeProfile.storage.getItem("berlin-city-flight.v1")'), originalBerlin, 'district flight does not overwrite the original Berlin save');
  assert.equal(await browser.eval('ArcadeProfile.storage.getItem("berlin-city-flight.graphics")'), 'Performance', 'district quality changes do not overwrite original Berlin settings');
  assert(await browser.eval('!!JSON.parse(ArcadeProfile.storage.getItem("berlin-district.v1")).profiles[0].resume'), 'district has its own saved flight');
  await browser.fire('document.querySelector("#arcade").click()');
  for (let i = 0; i < 100 && !await browser.eval('location.pathname==="/index.html"'); i++) await browser.sleep(100);
  assert.equal(await browser.eval('location.pathname'), '/index.html', 'pause menu returns to the arcade');
  assert.deepEqual(browser.logs.filter(s => s.startsWith('EXC') || /THREE.WebGLProgram: Shader Error/.test(s)), []);
  report.status = 'passed'; console.log(JSON.stringify(report, null, 2));
} finally {
  await fs.writeFile(path.join(output, 'validation.json'), JSON.stringify(report, null, 2));
  try { await browser.close(); } finally { await server.stop(); }
}
