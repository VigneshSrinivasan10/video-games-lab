import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { startTestServer } from '../helpers/server.mjs';

test('monitoring protects data, distinguishes sources, tracks visits and levels, and persists history', async () => {
  const key='test-monitor-key-not-a-production-secret';
  const old=process.env.ARCADE_MONITOR_KEY;process.env.ARCADE_MONITOR_KEY=key;
  const server=await startTestServer();
  if(old===undefined)delete process.env.ARCADE_MONITOR_KEY;else process.env.ARCADE_MONITOR_KEY=old;
  try {
    assert.equal((await fetch(server.backend+'/api/monitoring')).status,401);
    assert.equal((await fetch(server.base+'/api/monitoring')).status,401);
    assert.equal((await fetch(server.base+'/api/monitoring',{headers:{Authorization:'Bearer wrong'}})).status,401);
    const login=await fetch(server.base+'/api/profile/login',{method:'POST',body:JSON.stringify({name:'monitor-test'})});
    const cookie=login.headers.get('set-cookie').split(';')[0];
    const page=await fetch(server.base+'/rocket-pals.html',{headers:{cookie}});
    assert.match(await page.text(),/src="\/shared\/monitoring.js"/);
    const beat={id:'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',path:'/rocket-pals.html',level:'Track 4',visible:true};
    assert.equal((await fetch(server.base+'/api/monitoring/heartbeat',{method:'POST',headers:{cookie},body:JSON.stringify(beat)})).status,200);
    assert.equal((await fetch(server.base+'/api/monitoring/heartbeat',{method:'POST',headers:{cookie},body:JSON.stringify(beat)})).status,429);
    assert.equal((await fetch(server.base+'/api/monitoring/heartbeat',{method:'POST',headers:{cookie},body:'null'})).status,400);
    assert.equal((await fetch(server.base+'/api/monitoring/heartbeat',{method:'POST',headers:{cookie,origin:'https://untrusted.example'},body:JSON.stringify(beat)})).status,403);
    await fetch(server.base+'/api/profile/save',{method:'POST',headers:{cookie},body:JSON.stringify({name:'monitor-test',key:'game',revision:0,value:'{"unlocked":7,"score":120}'})});
    await fetch(server.backend+'/login',{headers:{'x-forwarded-for':'198.51.100.99','x-arcade-local':'forged'}});
    const response=await fetch(server.base+'/api/monitoring',{headers:{Authorization:'Bearer '+key}});
    const data=await response.json();
    assert.equal(response.status,200);
    assert.equal(data.sessions[0].source,'localhost');assert.equal(data.sessions[0].level,'Track 4');assert.equal(data.sessions[0].player,'monitor-test');assert.equal(data.sessions[0].status,'active');
    assert.ok(data.visits.some(v=>v.player==='monitor-test'&&v.path==='/rocket-pals.html'&&v.source==='localhost'));
    assert.ok(data.visits.some(v=>v.path==='/login'&&v.source==='direct / hosted'&&v.ip==='127.0.0.1'));
    assert.ok(!data.visits.some(v=>v.ip==='198.51.100.99'));
    assert.equal(data.progress.find(p=>p.game==='game').stats.find(s=>s.field==='unlocked').value,'7');
    const disk=JSON.parse(await readFile(server.directory+'/monitoring.json'));
    assert.ok(disk.visits.some(v=>v.player==='monitor-test'));
    assert.equal((await fetch(server.base+'/.hosting/monitoring.json')).status,404);
    assert.equal((await fetch(server.base+'/monitor/')).status,200);
  } finally {await server.stop();}
});

test('explicit trusted proxy header is validated and local proxy ignores it', async () => {
  const savedKey=process.env.ARCADE_MONITOR_KEY,savedHeader=process.env.ARCADE_CLIENT_IP_HEADER;
  const key='trusted-proxy-monitoring-test-key';process.env.ARCADE_MONITOR_KEY=key;process.env.ARCADE_CLIENT_IP_HEADER='x-forwarded-for';
  const server=await startTestServer();
  if(savedKey===undefined)delete process.env.ARCADE_MONITOR_KEY;else process.env.ARCADE_MONITOR_KEY=savedKey;
  if(savedHeader===undefined)delete process.env.ARCADE_CLIENT_IP_HEADER;else process.env.ARCADE_CLIENT_IP_HEADER=savedHeader;
  try {
    await fetch(server.backend+'/login',{headers:{'x-forwarded-for':'198.51.100.25'}});
    await fetch(server.backend+'/login',{headers:{'x-forwarded-for':'198.51.100.99, 127.0.0.1'}});
    await fetch(server.base+'/login',{headers:{'x-forwarded-for':'198.51.100.77'}});
    const data=await (await fetch(server.base+'/api/monitoring',{headers:{Authorization:'Bearer '+key}})).json();
    assert.ok(data.visits.some(v=>v.ip==='198.51.100.25'));
    assert.ok(data.visits.some(v=>v.ip==='127.0.0.1'&&v.source==='localhost'));
    assert.ok(!data.visits.some(v=>v.ip.includes('198.51.100.99')||v.ip==='198.51.100.77'));
  }finally{await server.stop();}
});
