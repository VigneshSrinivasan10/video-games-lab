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
  await b.eval('CQ.startFree("free"); document.getElementById("btnGo").click()');
  await b.eval('CQ.showHint()');
  assert.equal(await b.eval('CQ.G.hintM'),null);
  assert.match(await b.eval('CQ.G.owl'),/Press Hint again/);
  await b.eval('CQ.showHint()');
  assert.ok(await b.eval('!!CQ.G.hintM'));
  await b.eval('CQ.playerMove(CQ.G.hintM)');
  await until('CQ.G.ply===2 && !CQ.G.thinking && !CQ.G.busy');
  await b.eval('CQ.secondLook()');
  assert.equal(await b.eval('CQ.G.ply'),0);
  assert.equal(await b.eval('CQ.G.pos.b.join("")'), 'rnbqkbnrpppppppp................................PPPPPPPPRNBQKBNR');
  await b.eval(`CQ.G.pos=CQ.posFromRows(['....k...','........','........','...r....','........','........','...Q....','....K...']).pos; CQ.inspectThreats()`);
  assert.ok(await b.eval('CQ.G.coachMarks.includes(51)'));
  assert.match(await b.eval('CQ.G.owl'),/rook can take your queen on d2/);
  // A rook pinned to its king cannot capture sideways.
  assert.equal(await b.eval(`CQ.captureThreats(CQ.posFromRows(['....k...','....rQ..','........','........','........','........','........','K...R...']).pos,'b').some(m=>m.from===12 && m.to===13)`),false);
  // A defended capture is not advertised as a loose piece.
  assert.equal(await b.eval(`CQ.looseCaptures(CQ.posFromRows(['....k...','........','..p.....','...p....','........','........','........','K..R....']).pos,'w').some(m=>m.to===27)`),false);
  await b.eval('CQ.startFree("two"); document.getElementById("btnGo").click(); CQ.playerMove(CQ.legalMoves(CQ.G.pos)[0])');
  await until('!CQ.G.busy');
  await b.eval('CQ.secondLook()');
  assert.equal(await b.eval('CQ.G.pos.turn'),'w');
  assert.equal(await b.eval('CQ.G.ply'),0);
  await b.screenshot('/tmp/chess-coach.png');
  assert.deepEqual(b.logs.filter(x=>x.startsWith('EXC')),[]);
  console.log('PASS chess coaching: staged hints, threats, pinned attackers, defended captures, one/two-player takebacks');
} finally { await b.close(); await server.stop(); }
