import fs from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import assert from 'node:assert/strict';
const engine=fs.readFileSync('public/games/chess-quest/game.js','utf8').split('/* ===== ENGINE END ===== */')[0];
const academy=fs.readFileSync('public/games/chess-quest/academy.js','utf8').split('SCREENS.push')[0];
const context=vm.createContext({assert});
vm.runInContext(engine+`;function squareName(sq){return 'abcdefgh'[sq&7]+(8-(sq>>3));}\n`+academy,context);
test('48 distinct solvable positions, legal opponent replies, and real forks',()=>{
vm.runInContext(`
const seen=new Set();
for(const l of ACADEMY)for(const [i,t] of l.tasks.entries()){
 let p=academyPosition(t), key=p.b.join('')+t.type;
 assert.ok(!seen.has(key),'duplicate '+l.name+i);seen.add(key);
 assert.ok(!inCheck(p,'w')&&!inCheck(p,'b'),'initial check '+l.name+i);
 if(t.type==='safe'||t.type==='defense')assert.ok(captureThreats(p,'b').some(m=>m.to===academySq(t.from)));
 if(t.type==='capture'){
 const trap=legalMoves(p).find(m=>m.from===academySq(t.from)&&m.to===academySq(t.proposed));
 assert.ok(trap,'legal tempting capture');assert.ok(captureThreats(makeMove(p,trap),'b').some(m=>m.to===trap.to),'real defender');
 }
 if(t.line)for(const [j,[f,to]] of t.line.entries()){
 const m=legalMoves(p).find(m=>m.from===academySq(f)&&m.to===academySq(to));assert.ok(m,l.name+' '+i+' '+f+to);p=makeMove(p,m);
 if(t.type==='fork'&&j===0){assert.ok(inCheck(p,'b'));assert.ok(captureThreats(p,'w').some(m=>m.from===academySq(to)&&m.cap==='r'));}
 }
 const from=t.line?academySq(t.line[0][1]):academySq(t.from);
 if(t.type==='defense')assert.ok(captureThreats(p,'b').some(m=>m.to===from),'second real threat');
 const wins=legalMoves(p).filter(m=>m.from===from&&(!(t.type==='capture'||t.type==='fork')||m.cap)&&!captureThreats(makeMove(p,m),'b').some(r=>r.to===m.to));
 assert.ok(wins.length,'solution '+l.name+i);
}
assert.equal(seen.size,48);
`,context);
});
test('winning exchanges count material gained, not just recaptures',()=>{
 vm.runInContext(`
 assert.equal(academyTradeGain({piece:'B',cap:'r'}),2);
 assert.equal(academyTradeGain({piece:'N',cap:'r'}),2);
 assert.equal(academyTradeGain({piece:'P',cap:'b'}),2);
 assert.equal(academyTradeGain({piece:'R',cap:'p'}),-4);
 assert.equal(academyTradeGain({piece:'Q',cap:'r'}),-4);
 assert.equal(academyTradeGain({piece:'B',cap:'n'}),0);
 `,context);
});
