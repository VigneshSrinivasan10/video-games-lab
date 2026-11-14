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
  for(let lesson=0;lesson<4;lesson++) for(let step=0;step<12;step++) {
    await b.eval(`CQ.academy.start(${lesson},${step}); CQ.G.speed=20`);
    await until('CQ.academy.state.phase==="ready" && !CQ.academy.state.demonstrating && !CQ.G.locked && !CQ.G.busy');
    assert.equal(await b.eval('CQ.G.owl'),'');
    if(lesson===1 && step===0) {
      await b.eval('CQ.playerMove(CQ.legalMoves(CQ.G.pos).find(m=>m.from===59&&m.to===27))');
      await until('CQ.academy.state.phase==="ready" && !CQ.G.locked && !CQ.G.busy');
      assert.equal(await b.eval('CQ.academy.state.solved'),false);
      assert.equal(await b.eval('CQ.G.pos.b[59]'),'R');
    }
    if(lesson>=2) {
      await b.eval('CQ.academy.hint(); CQ.playerMove(CQ.G.hintM)');
      await until('CQ.academy.state.stage===1 && !CQ.G.busy && !CQ.G.locked');
      assert.equal(await b.eval('CQ.academy.state.solved'),false);
    }
    await b.eval('CQ.G.speed=1; CQ.academy.hint(); CQ.playerMove(CQ.G.hintM)');
    await until('CQ.academy.state.solved');
  }
  assert.equal(await b.eval('Object.values(CQ.SAVE().academyV2).reduce((n,v)=>n+Object.keys(v).length,0)'),48);
  await b.eval('CQ.academy.open()');
  assert.equal(await b.eval('document.querySelectorAll("#academyChoices button").length'),4);
  await b.eval('document.querySelectorAll("#academyChoices button")[2].click()');
  assert.equal(await b.eval('document.querySelectorAll("#academyChoices button").length'),13);
  await b.screenshot('/tmp/chess-academy-map.png');
  await b.eval('CQ.academy.start(2,5)');
  await b.screenshot('/tmp/chess-academy.png');
  assert.deepEqual(b.logs.filter(x=>x.startsWith('EXC')),[]);
  console.log('PASS 48 exercises, two-turn plans, demonstrations, retries, exercise picker and progress');
} finally { await b.close(); await server.stop(); }
