import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { launch } from '../helpers/cdp.mjs';
import { startTestServer } from '../helpers/server.mjs';

const server = await startTestServer();
let b;
async function until(expression) {
  const end = Date.now() + 15000;
  while (Date.now() < end) {
    if (await b.eval(expression)) return;
    await b.sleep(100);
  }
  throw Error('Timed out: ' + expression);
}
async function open(page) {
  await b.goto(server.base + '/' + page);
  await until('!!window.GamepadStd');
}
try {
  b = await launch({});
  await b.addInit(await fs.readFile(new URL('../helpers/fakepad.js', import.meta.url), 'utf8'));
  await b.addInit('__fake.addPad()');
  await b.signIn(server.base, 'handover-check');
  await open('index.html');
  await until('!!document.querySelector(".tile.focus")');
  await b.eval('__fake.set("left",true,0)'); await b.sleep(150);
  await b.eval('__fake.tap("right",100,1)');
  const tile = await b.eval('document.querySelector(".tile.focus").href');
  await b.sleep(500);
  assert.equal(await b.eval('document.querySelector(".tile.focus").href'), tile, 'old held direction cannot steal launcher focus');
  await b.eval('ArcadeProfile.account()');
  await b.eval('__fake.tap("A",100,1)');
  assert.equal(await b.eval('location.pathname'), '/index.html', 'profile dialog blocks game activation');
  console.log('PASS launcher handover and profile dialog input guard');

  await open('brick-ninja-quest.html');
  for (const id of ['btn-new', 'btn-begin-story', 'btn-story-begin', 'btn-level-play']) await b.eval(`document.getElementById(${JSON.stringify(id)}).click()`);
  await b.eval('__fake.set("A",true,0)'); await until('input.jump');
  await b.eval('__fake.set("right",true,1)'); await until('input.right && !input.jump');
  await b.eval('__fake.disconnect(0);__fake.disconnect(1)');
  await until('!input.left && !input.right && !input.jump');
  console.log('PASS Brick Ninja replacement clears held jump and disconnect clears movement');

  await open('orchard-catch.html');
  await b.eval('OC.startGame(true)'); await b.sleep(100);
  const baskets = await b.eval('OC.players.map(p=>p.x)');
  await b.eval('__fake.pads[0]=null;__fake.set("right",true,1)'); await b.sleep(250);
  let positions = await b.eval('OC.players.map(p=>p.x)');
  assert.equal(positions[0], baskets[0]); assert.ok(positions[1] > baskets[1]);
  await b.eval('__fake.set("right",false,1);__fake.addPad();__fake.set("left",true,2)'); await b.sleep(250);
  assert.ok(await b.eval('OC.players[0].x') < baskets[0]);
  console.log('PASS Orchard Catch keeps player 2 assigned and replaces player 1');

  await open('cheese-chase.html');
  await b.eval('__CC.S.players=[true,true]'); await b.sleep(100);
  await b.eval('__fake.pads[0]=null;__fake.set("right",true,1)');
  assert.deepEqual(await b.eval('__CC.readInputs().map(p=>p.dx)'), [0, 1]);
  await b.eval('__fake.addPad();__fake.set("left",true,2)');
  assert.deepEqual(await b.eval('__CC.readInputs().map(p=>p.dx)'), [-1, 1]);
  console.log('PASS Cheese Chase keeps each mouse assigned during replacement');

  await open('kitchen-pals.html');
  await b.eval('KP.S.team=true;KP.startLevel(0);KP.show("play")'); await b.sleep(100);
  const chefs = await b.eval('KP.S.players.map(p=>p.c)');
  await b.eval('__fake.pads[0]=null;__fake.set("right",true,1)'); await b.sleep(250);
  positions = await b.eval('KP.S.players.map(p=>p.c)');
  assert.equal(positions[0], chefs[0]); assert.ok(positions[1] > chefs[1]);
  await b.eval('__fake.set("right",false,1);__fake.addPad();__fake.set("right",true,2)'); await b.sleep(250);
  assert.ok(await b.eval('KP.S.players[0].c') > chefs[0]);
  console.log('PASS Kitchen Pals keeps each chef assigned during replacement');

  await open('rocket-pals.html');
  await b.eval('document.getElementById("btnPlay2").click();document.getElementById("btnGo").click()');
  await until('RP.S.mode==="race"');
  await b.eval('__fake.pads[0]=null;__fake.set("A",true,1);__fake.set("right",true,1)');
  await until('RP.S.karts.find(k=>k.human===1).in.gas===1');
  assert.equal(await b.eval('RP.S.karts.find(k=>k.human===0).in.gas'), 0);
  await b.eval('__fake.addPad();__fake.set("A",true,2);__fake.set("left",true,2)');
  await until('RP.S.karts.find(k=>k.human===0).in.gas===1 && RP.S.karts.find(k=>k.human===0).in.steer<0');
  assert.ok(await b.eval('RP.S.karts.find(k=>k.human===1).in.steer>0'));
  console.log('PASS Rocket Pals keeps each racer assigned during replacement');
  assert.deepEqual(b.logs.filter(x => x.startsWith('EXC')), []);
} finally {
  try { if (b) await b.close(); } finally { await server.stop(); }
}
