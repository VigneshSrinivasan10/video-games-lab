import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { launch } from '../helpers/cdp.mjs';
import { startTestServer } from '../helpers/server.mjs';

const server = await startTestServer();
const selected = process.argv[2]?.split(',');
let b;
async function until(expression, timeout = 180000) {
  const end = Date.now() + timeout;
  while (Date.now() < end) {
    if (await b.eval(expression)) return;
    await b.sleep(200);
  }
  throw Error('Timed out: ' + expression);
}
try {
  b = await launch({ headed: true, args: ['--headless=new', '--ozone-platform=headless', '--use-angle=gl-egl', '--enable-gpu', '--ignore-gpu-blocklist', '--window-size=800,600'] });
  await b.addInit(await fs.readFile(new URL('../helpers/fakepad.js', import.meta.url), 'utf8'));
  await b.signIn(server.base, 'controller-switch-check');
  await b.goto(server.base + '/index.html');
  await b.eval('ArcadeProfile.storage.setItem("world-flight.graphics","Performance"); ArcadeProfile.storage.setItem("berlin-city-flight.graphics","Performance"); ArcadeProfile.storage.setItem("berlin-district.graphics","Performance"); ArcadeProfile.sync()');
  await b.goto(server.base + '/world-flight/index.html');
  await until('document.querySelectorAll(".fly").length > 1');

  // Exercise handover in one task so the atlas does not consume these presses.
  assert.deepEqual(await b.eval(`(() => {
    const results = [], read = () => GamepadStd.readActive('switch-check');
    results.push(read().index);
    __fake.addPad(); __fake.set('A', true, 0); read();
    __fake.set('X', true, 1); results.push(read().index);
    __fake.set('X', false, 1); results.push(read().index); // old A still held
    __fake.set('A', false, 0); __fake.stick(.4, 0, 0); results.push(read().index);
    __fake.stick(0, 0, 0); read();
    __fake.stick(.4, 0, 1); results.push(read().index); // below digital direction threshold
    __fake.stick(0, 0, 1); __fake.disconnect(0); results.push(read().index);
    __fake.pads[0] = null; results.push(read().index); // browser leaves an empty slot
    __fake.set('A', true, 1); results.push(read().just.A);
    __fake.disconnect(1); results.push(read());
    __fake.pads[1].connected = true; results.push(read().just.A);
    __fake.set('A', false, 1); read();
    return results;
  })()`), [0, 1, 1, 0, 1, 1, 1, true, null, true]);

  await b.sleep(400);
  await b.eval('__fake.tap("right", 100, 1)');
  assert.equal(await b.eval('document.activeElement.dataset.city'), 'paris', 'replacement selects a city with slot 0 empty');
  // Returning with A held must still require release and a deliberate selection.
  await b.eval('__fake.set("A", true, 1); dispatchEvent(new PageTransitionEvent("pageshow", {persisted:true}))');
  await b.sleep(400);
  assert.equal(await b.eval('location.pathname'), '/world-flight/index.html');
  assert.equal(await b.eval('document.activeElement.tagName'), 'H1');
  await b.eval('__fake.set("A", false, 1)');
  await b.sleep(400);
  await b.eval('__fake.tap("A", 100, 1)');
  assert.equal(await b.eval('location.pathname'), '/world-flight/index.html');
  await b.eval('__fake.tap("right", 100, 1)');
  await b.eval('__fake.tap("left", 100, 1)');
  await b.eval('document.querySelector(".fly.focus").href += "&test"');
  await b.fire('__fake.tap("A", 100, 1)');
  await until('location.pathname === "/world-flight/game.html"', 10000);
  console.log('PASS controller handover, empty slots, reconnect edges, atlas navigation and held-A guard');

  for (const [name, page, hook] of [
    ['Paris', null, 'FlightTest'],
    ['Berlin', '/berlin-city-flight.html?test', 'BerlinTest'],
    ['Berlin District', '/games/berlin-district/index.html?test', 'BerlinDistrictTest'],
  ].filter(([name]) => !selected || selected.includes(name))) {
    console.log('Testing replacement controller:', name);
    if (page) await b.goto(server.base + page);
    await until(`!!window.${hook} && ${hook}.state.startup.ready`);
    await b.eval('__fake.addPad()');
    await b.eval('__fake.tap("A", 160, 1)');
    await until(`${hook}.state.mode === 'flight'`, 10000);
    await b.eval('__fake.tap("B", 160, 1)');
    assert.equal(await b.eval(`${hook}.state.mode`), 'pause');
    await b.eval('__fake.tap("down", 160, 1)');
    assert.equal(await b.eval(`${hook}.state.focus`), 'restart');
    await b.eval('__fake.tap("down", 160, 1)');
    assert.equal(await b.eval(`${hook}.state.focus`), 'scenic');
    await b.eval('__fake.tap("A", 160, 1)');
    assert.equal(await b.eval(`${hook}.state.free`), true);
    await b.eval(`__fake.stick(.8, 0, 0); ${hook}.step(120)`);
    assert.ok(await b.eval(`${hook}.state.turn > .5`), name + ': original controller steers');
    // Leave the original stick held: the replacement must take over and stay active.
    await b.eval(`__fake.stick(-.8, 0, 1); ${hook}.step(120)`);
    assert.ok(await b.eval(`${hook}.state.turn < -.5`), name + ': replacement steers while original is still connected');
    await b.eval(`__fake.stick(0, 0, 1); ${hook}.step(240)`);
    assert.ok(await b.eval(`Math.abs(${hook}.state.turn) < .01`), name + ': old held stick cannot steal control');
    await b.eval(`__fake.disconnect(0); __fake.pads[0] = null; __fake.stick(.8, 0, 1); ${hook}.step(120)`);
    assert.ok(await b.eval(`${hook}.state.turn > .5`), name + ': replacement steers after battery disconnection');
    await b.eval(`__fake.disconnect(1); ${hook}.step(240)`);
    assert.ok(await b.eval(`Math.abs(${hook}.state.turn) < .01`), name + ': disconnection releases steering');
    await b.eval('__fake.pads[1].connected = true; __fake.stick(0, 0, 1)');
    await b.eval('__fake.tap("start", 160, 1)');
    assert.equal(await b.eval(`${hook}.state.mode`), 'pause', name + ': replacement can pause after reconnect');
    await b.eval('__fake.tap("A", 160, 1)');
    assert.equal(await b.eval(`${hook}.state.mode`), 'flight', name + ': replacement can resume');
    console.log('PASS', name, 'replacement start, menus, live handover, disconnect, reconnect and resume');
  }
  assert.deepEqual(b.errors(), []);
} finally {
  try { if (b) await b.close(); } finally { await server.stop(); }
}
