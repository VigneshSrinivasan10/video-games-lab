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
  await b.eval('CQ.positions.open()');
  assert.equal(await b.eval('document.querySelectorAll(".position-card").length'),16);
  await b.screenshot('/tmp/chess-positions.png');
  for(let i=0;i<16;i++) {
    await b.eval(`CQ.positions.start(${i}); CQ.G.speed=8`);
    assert.ok(await b.eval('CQ.legalMoves(CQ.G.pos).length>0'));
    assert.ok(await b.eval('CQ.G.pos.b.filter(p=>p==="K").length===1 && CQ.G.pos.b.filter(p=>p==="k").length===1'));
    await b.eval('CQ.playerMove(CQ.legalMoves(CQ.G.pos)[0])');
    await until('CQ.G.ply===2 && !CQ.G.busy && !CQ.G.thinking');
    await b.eval('document.getElementById("btnPause").click();document.getElementById("btnRestart").click()');
    assert.equal(await b.eval('CQ.G.positionIndex'),i);
    assert.equal(await b.eval('CQ.G.ply'),0);
    assert.equal(await b.eval('CQ.G.pos.b.join("")'),await b.eval(`CQ.positions.list[${i}].pos.b.join("")`));
  }
  await b.eval('CQ.positions.start(0,"two");CQ.playerMove(CQ.legalMoves(CQ.G.pos)[0])');
  await until('!CQ.G.busy');
  assert.equal(await b.eval('CQ.G.pos.turn'),'b');
  assert.equal(await b.eval('CQ.G.thinking'),false);
  await b.eval('CQ.startFree("free")');
  assert.equal(await b.eval('CQ.G.positionIndex'),null);
  assert.deepEqual(b.logs.filter(x=>x.startsWith('EXC')),[]);
  console.log('PASS sixteen playable positions, AI replies, restarts, two-player turns, normal-game reset');
} finally { await b.close(); await server.stop(); }
