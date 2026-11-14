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
  await b.eval('document.getElementById("btnAcademy").click()');
  assert.equal(await b.eval('CQ.G.screen'),'academy');
  await b.eval('CQ.academy.start(1,1); CQ.G.speed=10');
  await until('CQ.academy.state.phase==="ready" && !CQ.G.locked && !CQ.G.busy');
  await b.eval('CQ.G.speed=1; CQ.playerMove(CQ.legalMoves(CQ.G.pos).find(m=>m.from===35&&m.to===21))');
  await until('CQ.academy.state.solved');
  assert.equal(await b.eval('CQ.academy.state.trade'),2);
  assert.equal(await b.eval('CQ.G.pos.b[21]'),'p');
  await b.eval('CQ.academy.start(1,0); CQ.G.speed=10');
  await until('CQ.academy.state.phase==="ready" && !CQ.G.locked && !CQ.G.busy');
  await b.eval('CQ.playerMove(CQ.legalMoves(CQ.G.pos).find(m=>m.from===59&&m.to===27))');
  await until('CQ.academy.state.phase==="ready" && !CQ.G.locked && !CQ.G.busy');
  assert.equal(await b.eval('CQ.academy.state.solved'),false);
  assert.equal(await b.eval('CQ.G.pos.b[59]'),'R');
  await b.screenshot('/tmp/chess-academy.png');
  assert.deepEqual(b.logs.filter(x=>x.startsWith('EXC')),[]);
  console.log('PASS bishop-for-rook wins after recapture; rook-for-pawn rewinds');
} finally { await b.close(); await server.stop(); }
