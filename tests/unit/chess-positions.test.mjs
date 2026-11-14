import fs from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import assert from 'node:assert/strict';
test('sixteen legal playable positions, including eight distinct late games',()=>{
 const engine=fs.readFileSync('public/games/chess-quest/game.js','utf8').split('/* ===== ENGINE END ===== */')[0];
 const positions=fs.readFileSync('public/games/chess-quest/positions.js','utf8').split("let positionOpponent")[0];
 vm.runInNewContext(engine+positions+`
 assert.equal(PRACTICE_POSITIONS.length,16);
 assert.equal(PRACTICE_POSITIONS.filter(p=>p.stage==='late').length,8);
 const seen=new Set();
 for(const {pos,name} of PRACTICE_POSITIONS){
  assert.equal(pos.b.filter(p=>p==='K').length,1,name);
  assert.equal(pos.b.filter(p=>p==='k').length,1,name);
  assert.equal(inCheck(pos,'b'),false,name+' opponent cannot start in check');
  assert.ok(legalMoves(pos).length,name);
  assert.ok(['ok','check'].includes(gameStatus(pos)),name);
  assert.ok(!seen.has(pos.b.join('')),name);seen.add(pos.b.join(''));
 }
 `,{assert});
});
