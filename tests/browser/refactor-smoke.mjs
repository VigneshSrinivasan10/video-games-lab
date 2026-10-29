import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { launch } from '../helpers/cdp.mjs';
import { startTestServer } from '../helpers/server.mjs';

const server = await startTestServer();
const b = await launch({});
const report = [], only = process.argv[2]?.split(',');
async function until(expression, timeout = 15000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) { if (await b.eval(expression)) return; await b.sleep(100); }
  throw Error('Timed out: ' + expression);
}
async function tap(button='A') { await b.eval(`__fake.tap(${JSON.stringify(button)})`); await b.sleep(350); }
async function click(id) { await b.eval(`document.getElementById(${JSON.stringify(id)}).click()`); await b.sleep(250); }
async function playUntil(expression) {
  for (let i=0;i<20;i++) { if (await b.eval(expression)) return; await tap(); }
  throw Error('Could not enter gameplay: '+expression);
}
const cases = [
 ['sudoku-safari','sudoku-kids/',async()=>{await until('typeof board!=="undefined" && board.length===16');const before=await b.eval('board.filter(Boolean).length');await click('hint');await click('hint');assert.ok(await b.eval('board.filter(Boolean).length')>before);}],
 ['sudoku','sudoku.html',async()=>{await until('typeof board!=="undefined" && !!board && !loading');const before=await b.eval('board.values.filter(Boolean).length');await click('hint');await click('applyHint');assert.ok(await b.eval('board.values.filter(Boolean).length')>before);}],
 ['nonograms','nonograms.html',async()=>{await until('document.querySelectorAll(".ncell").length===25');await b.eval('document.querySelector(".ncell").click()');assert.equal(await b.eval('document.querySelectorAll(".ncell.mark").length'),1);await click('undo');assert.equal(await b.eval('document.querySelectorAll(".ncell.mark").length'),0);}],
 ['mahjong','mahjong.html',async()=>{await until('document.querySelectorAll("#board .tile").length>0');const before=await b.eval('document.querySelectorAll("#board .tile").length');await click('hint');const pair=await b.eval('Array.from(document.querySelectorAll(".tile.hinted"),t=>t.dataset.index)');assert.equal(pair.length,2);for(const id of pair)await b.eval(`document.querySelector('[data-index="${id}"]').click()`);await until(`document.querySelectorAll('#board .tile').length===${before-2}`);}],
 ['reversi','reversi.html',async()=>{await until('document.querySelectorAll(".rcell.legal").length>0');await b.eval('document.querySelector(".rcell.legal").click()');await until('document.querySelectorAll(".disc").length>=6');}],
 ['beat-safari','beat-safari.html',async()=>{await until('!!window.BeatSafari');await playUntil('BeatSafari.state.mode==="play"');await tap();assert.equal(await b.eval('BeatSafari.state.mode'),'play');}],
 ['chess-quest','chess-quest.html',async()=>{await until('!!window.CQ');await click('btnFree');await click('btnGo');assert.equal(await b.eval('CQ.G.mode'),'free');await b.press('Enter','Enter');await b.press('ArrowUp','ArrowUp');await b.press('Enter','Enter');await until('CQ.G.ply>0');}],
 ['super-mario','super-mario.html',async()=>{await click('btnPlay');await until('S.mode==="game"');await playUntil('S.phase!=="intro"');const x=await b.eval('S.player.x');await b.eval('__fake.hold("right",600)');assert.ok(await b.eval('S.player.x')>x);}],
 ['brick-ninja-quest','brick-ninja-quest.html',async()=>{for(const id of ['btn-new','btn-begin-story','btn-story-begin','btn-level-play'])await click(id);assert.equal(await b.eval('document.querySelectorAll(".screen:not(.hidden)").length'),0);assert.equal(await b.eval('document.querySelector("#hud").classList.contains("hidden")'),false);await b.eval('__fake.hold("right",600)');await tap();}],
 ['rocket-pals','rocket-pals.html',async()=>{await click('btnPlay1');await click('btnGo');await until('RP.S.mode==="race"',15000);await b.eval('__fake.hold("A",1000)');assert.ok(await b.eval('RP.S.karts.length')>0);}],
 ['pip-and-the-moonstone','pip-and-the-moonstone.html',async()=>{await until('!!window.PM');await playUntil('PM.S.mode==="play"');const x=await b.eval('PM.S.ship.x');await b.eval('__fake.hold("right",600)');assert.notEqual(await b.eval('PM.S.ship.x'),x);}],
 ['cheese-chase','cheese-chase.html',async()=>{await until('!!window.__CC');await playUntil('__CC.S.mode==="playing"');await b.eval('__fake.hold("right",700)');assert.equal(await b.eval('!!window.__CC_err'),false);}],
 ['orchard-catch','orchard-catch.html',async()=>{await until('!!window.OC');await playUntil('OC.S.mode==="playing"');const x=await b.eval('OC.players[0].x');await b.eval('__fake.hold("right",600)');assert.notEqual(await b.eval('OC.players[0].x'),x);}],
 ['kitchen-pals','kitchen-pals.html',async()=>{await until('!!window.KP');await playUntil('KP.S.mode==="play"');await b.eval('__fake.hold("right",600)');await tap();assert.ok(await b.eval('KP.S.players.length')>0);}],
];
try {
 await b.addInit(await fs.readFile(new URL('../helpers/fakepad.js',import.meta.url),'utf8'));
 await b.signIn(server.base,'refactor-player');
 for(const [name,page,exercise] of cases) {
  if(only&&!only.includes(name))continue;
  const logStart=b.logs.length;
  try {
   await b.goto(server.base+'/'+page);await until('!!window.GamepadStd && !!window.ArcadeProfile');
   assert.equal(await b.eval('new URL(GamepadStd.exitUrl,location.href).pathname'),'/index.html');
   await exercise();
   await b.eval('window.dispatchEvent(new Event("arcade-exit")); ArcadeProfile.sync()');
   await b.fire('__fake.hold("B",2400)');await until('location.pathname==="/index.html"',8000);
   assert.deepEqual(b.logs.slice(logStart).filter(x=>x.startsWith('EXC')),[],name);
   report.push({name,status:'passed'});console.log('PASS',name,'gameplay, controls, save synchronization, hold-B return');
  } catch(error) {
   report.push({name,status:'failed',error:error.message,errors:b.logs.slice(logStart).filter(x=>/^(EXC|ERR|LOG error)/.test(x))});
   console.log('FAIL',name,error.message,JSON.stringify(report.at(-1).errors));
   await b.screenshot('/tmp/reorg-'+name+'.png');
  }
 }
} finally {
 await fs.writeFile('/tmp/video-games-lab-game-tests.json',JSON.stringify(report,null,2));
 try { await b.close(); } finally { await server.stop(); }
}
assert.equal(report.filter(x=>x.status==='failed').length,0,JSON.stringify(report.filter(x=>x.status==='failed')));
