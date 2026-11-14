import assert from 'node:assert/strict';
import { launch } from '../helpers/cdp.mjs';
import { startTestServer } from '../helpers/server.mjs';
const server = await startTestServer();
const b = await launch({});
async function until(expr) {
  for (let i=0;i<100;i++) { if(await b.eval(expr)) return; await b.sleep(100); }
  throw Error('Timed out: '+expr);
}
try {
  await b.signIn(server.base,'chess-coach-test');
  await b.goto(server.base+'/chess-quest.html');
  await until('!!window.CQ');
  await until('!!CQ.academy');
  await until('!!CQ.positions');
  for(const [from,to] of [[0,1],[3,8],[15,4],[6,7]]) {
    await b.eval(`CQ.positions.start(${from}); CQ.G.speed=10; CQ.gameOverCard("Finished!","")`);
    await until(`CQ.G.positionIndex===${to} && CQ.G.screen==="play"`);
  }
  await b.eval('CQ.positions.start(7);CQ.G.speed=10;CQ.gameOverCard("Finished!","")');
  await until('CQ.G.screen==="positions"');
  await b.eval('CQ.positions.start(2,"two");CQ.G.speed=1;CQ.gameOverCard("Finished!","");document.getElementById("btnNext").click()');
  assert.equal(await b.eval('CQ.G.positionIndex'),3);
  assert.equal(await b.eval('CQ.G.mode'),'two');
  await b.eval('CQ.gameOverCard("Finished!","");document.getElementById("btnReplayPosition").click()');
  assert.equal(await b.eval('CQ.G.positionIndex'),3);
  assert.equal(await b.eval('CQ.G.timers.length'),0);
  await b.eval('CQ.startFree("free");CQ.gameOverCard("Finished!","")');
  assert.equal(await b.eval('CQ.G.clearNext'),'again');
  assert.equal(await b.eval('CQ.G.timers.length'),0);
  assert.deepEqual(b.logs.filter(x=>x.startsWith('EXC')),[]);
  console.log('PASS position auto-advance, displayed order, final picker, manual next/replay, regular game unchanged');
} finally { await b.close(); await server.stop(); }
