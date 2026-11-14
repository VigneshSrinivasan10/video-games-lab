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
  // Solve the last exercise of each section through the actual move/animation flow.
  for(let section=0;section<4;section++) {
    await b.eval(`CQ.academy.start(${section},CQ.academy.lessons[${section}].tasks.length-1); CQ.G.speed=8`);
    await until('CQ.academy.state.phase==="ready" && !CQ.G.locked && !CQ.G.busy');
    if(section>=2) {
      await b.eval('CQ.academy.hint(); CQ.playerMove(CQ.G.hintM)');
      await until('CQ.academy.state.stage===1 && !CQ.G.locked && !CQ.G.busy');
    }
    await b.eval('CQ.academy.hint(); CQ.playerMove(CQ.G.hintM)');
    if(section<3) {
      await until(`CQ.academy.state.lesson===${section+1} && CQ.academy.state.step===0`);
      assert.equal(await b.eval('CQ.G.screen'),'play');
    } else {
      await until('CQ.G.screen==="academy"');
      assert.equal(await b.eval('document.querySelectorAll("#academyChoices .academy-choice").length'),4);
    }
    assert.equal(await b.eval(`CQ.SAVE().academyV2[${section}][11]`),true);
  }
  assert.deepEqual(b.logs.filter(x=>x.startsWith('EXC')),[]);
  console.log('PASS automatic progression across all four sections and final return to section picker');
} finally { await b.close(); await server.stop(); }
