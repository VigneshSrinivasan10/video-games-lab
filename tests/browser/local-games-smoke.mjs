import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { launch } from '../helpers/cdp.mjs';
import { startTestServer } from '../helpers/server.mjs';
const names=['astray','hextris','infinite-mario','neverball','platforms','tetris'];
const selected=process.argv[2]?.split(',')||names;
for(const name of selected)await fs.access(new URL('../../local-games/'+name+'/',import.meta.url));
const server=await startTestServer(),b=await launch({}),report=[];
async function until(expression,timeout=60000){const end=Date.now()+timeout;while(Date.now()<end){if(await b.eval(expression))return;await b.sleep(200);}throw Error('Timed out: '+expression);}
try{
 await b.addInit(await fs.readFile(new URL('../helpers/fakepad.js',import.meta.url),'utf8'));await b.signIn(server.base,'local-game-check');
 for(const name of selected){
  console.log('Testing optional game:',name);const start=b.logs.length;
  try{
   const page=name==='infinite-mario'?'main.html':name==='platforms'?'game.html':'index.html';
   await b.goto(server.base+'/'+name+'/'+page);await until('!!window.GamepadStd');
   if(name==='astray'){
    await until('typeof gameState!=="undefined" && gameState==="play"');
    const before=await b.eval('JSON.stringify(ballMesh.position)');await b.eval('__fake.hold("right",900)');
    assert.notEqual(await b.eval('JSON.stringify(ballMesh.position)'),before);
   }else if(name==='hextris'){
    await b.eval('__fake.tap("A")');await until('gameState===1');const before=await b.eval('MainHex.position');
    await b.eval('__fake.tap("right")');assert.notEqual(await b.eval('MainHex.position'),before);
   }else if(name==='infinite-mario'){
    await until('!!window.MarioApp && !!MarioApp.stateContext?.State');
    await b.eval('__fake.tap("A")');await until('MarioApp.stateContext.State instanceof Mario.MapState');
    for(let step=0;step<20;step++) {
      await until('MarioApp.stateContext.State.MoveTime===0');
      const direction=await b.eval(`(()=>{const m=MarioApp.stateContext.State,x=Math.round(m.XMario/16),y=Math.round(m.YMario/16);if(m.Level[x][y]===Mario.MapTile.Level&&m.Data[x][y]>0)return 'enter';const queue=[[x,y,[]]],seen=new Set([x+','+y]);while(queue.length){const[a,b,route]=queue.shift();if(route.length&&m.Level[a][b]===Mario.MapTile.Level&&m.Data[a][b]>0)return route[0];for(const[dx,dy,key]of [[-1,0,'left'],[1,0,'right'],[0,-1,'up'],[0,1,'down']]){const nx=a+dx,ny=b+dy,k=nx+','+ny,t=m.Level[nx]?.[ny];if(!seen.has(k)&&(t===Mario.MapTile.Road||t===Mario.MapTile.Level)){seen.add(k);queue.push([nx,ny,[...route,key]]);}}}return null;})()`);
      assert.ok(direction,'reachable first level');
      if(direction==='enter'){await b.eval('__fake.tap("A")');break;}
      await b.eval(`__fake.tap(${JSON.stringify(direction)},60)`);await b.sleep(400);
    }
    await until('MarioApp.stateContext.State instanceof Mario.LevelState');
    await b.eval('__fake.hold("right",600)');await b.eval('__fake.tap("A")');
   }else if(name==='neverball'){
    await until('!!window.Neverball && !document.getElementById("run-button").disabled');
    await b.eval('document.getElementById("run-button").click()');
    await until('!!Neverball._module && document.body.classList.contains("in-game")',120000);
    await b.press('Enter','Enter');await b.sleep(500);await b.press('Enter','Enter');await b.sleep(500);await b.eval('__fake.hold("right",600)');
    assert.ok(await b.eval('Neverball._module.HEAPU8.length>0 && document.querySelector("canvas").width>0'));
   }else if(name==='platforms'){
    await until('!!window.gameInstance && document.querySelectorAll("canvas").length>0');
    await b.press('Enter','Enter');await b.eval('__fake.hold("up",700)');await b.eval('__fake.tap("A")');
    assert.ok(await b.eval('!!gameInstance.loop'));
   }else if(name==='tetris'){
    await until('!!document.querySelector(".app")?.__vue__ && !document.querySelector(".app").__vue__.$store.state.lock');await b.sleep(1200);
    await b.eval('__fake.tap("A",500)');await until('!!document.querySelector(".app").__vue__.$store.state.cur');await b.eval('__fake.tap("left")');await b.eval('__fake.tap("X")');await until('!!document.querySelector(".app").__vue__.$store.state.cur');
    const playing=await b.eval('(()=>{const v=document.querySelector(".app").__vue__;return {keys:Object.keys(v.$store.state),cur:!!v.$store.state.cur};})()');
    assert.ok(playing.cur,JSON.stringify(playing));
   }
   await b.eval('window.dispatchEvent(new Event("arcade-exit"));ArcadeProfile.sync()');
   assert.deepEqual(b.logs.slice(start).filter(x=>x.startsWith('EXC')),[],name);
   await b.fire('__fake.hold("B",2400)');await until('location.pathname==="/index.html"',15000);
   report.push({name,status:'passed'});console.log('PASS',name,'load, start, controller input, save sync, return');
  }catch(e){const errors=b.logs.slice(start).filter(x=>/^(EXC|ERR|LOG error)/.test(x));report.push({name,status:'failed',error:e.message,errors});console.log('FAIL',name,e.message,JSON.stringify(errors));await b.screenshot('/tmp/reorg-'+name+'.png');}
 }
}finally{await fs.writeFile('/tmp/video-games-lab-local-tests.json',JSON.stringify(report,null,2));try{await b.close();}finally{await server.stop();}}
assert.equal(report.filter(x=>x.status==='failed').length,0,JSON.stringify(report.filter(x=>x.status==='failed')));
