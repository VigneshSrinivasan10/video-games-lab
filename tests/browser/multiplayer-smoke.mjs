import assert from 'node:assert/strict';
import { launch } from '../helpers/cdp.mjs';
import { startTestServer } from '../helpers/server.mjs';
const server=await startTestServer(),host=await launch({}),guest=await launch({});
async function until(b,expression){const end=Date.now()+30000;while(Date.now()<end){if(await b.eval(expression))return;await b.sleep(150);}throw Error('Timed out: '+expression);}
try{
 await host.signIn(server.base,'host-check');await guest.signIn(server.base,'guest-check');
 for(const game of ['chess','kitchen']){
  const h=host.logs.length,g=guest.logs.length;
  await host.goto(server.base+'/family-room.html');await guest.goto(server.base+'/family-room.html');
  await host.eval(`document.querySelector('[data-game="${game}"]').click()`);
  await host.eval('document.querySelector("#createDoor").click()');
  await until(host,'FamilyRoom.role==="host" && !!FamilyRoom.adapter');
  await guest.eval(`document.querySelector('[data-game="${game}"]').click()`);
  await until(guest,'document.querySelectorAll("#doorList button").length>0');
  await guest.eval('document.querySelector("#doorList button").click()');
  await until(guest,'FamilyRoom.ready && !!FamilyRoom.adapter');await until(host,'FamilyRoom.ready');
  assert.equal(await guest.eval('FamilyRoom.role'),'guest');
  await host.press('Space',' ');await host.press('ArrowRight','ArrowRight',500);await guest.press('Space',' ');
  assert.ok(await host.eval('document.querySelector("#game").contentWindow.ArcadeProfile'));
  assert.ok(await guest.eval('document.querySelector("#game").contentWindow.ArcadeProfile'));
  assert.deepEqual(host.logs.slice(h).filter(x=>x.startsWith('EXC')),[],game+' host');
  assert.deepEqual(guest.logs.slice(g).filter(x=>x.startsWith('EXC')),[],game+' guest');
  await guest.eval('document.querySelector("#leave").click()');await until(guest,'location.pathname==="/index.html"');
  await until(host,'!FamilyRoom.ready');
  await host.eval('document.querySelector("#leave").click()');await until(host,'location.pathname==="/index.html"');
  console.log('PASS multiplayer',game,'create/join, both game frames, readiness, input, disconnect and leave');
 }
}finally{try{await host.close();await guest.close();}finally{await server.stop();}}
