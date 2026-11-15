import assert from 'node:assert/strict';
import { launch } from '../helpers/cdp.mjs';
import { startTestServer } from '../helpers/server.mjs';
process.env.ARCADE_MONITOR_KEY='browser-test-monitoring-secret';
const server=await startTestServer();let b;
try {
 b=await launch();
 await b.goto(server.base+'/monitor/');
 assert.equal(await b.eval(`fetch('/api/profile/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:'dashboard-test'})}).then(r=>r.status)`),200);
 await b.goto(server.base+'/sudoku-kids/');
 await b.sleep(16000);
 await b.goto(server.base+'/monitor/');
 await b.eval(`document.getElementById('key').value='browser-test-monitoring-secret';document.getElementById('login').requestSubmit()`);
 await b.sleep(1000);
 assert.equal(await b.eval(`document.getElementById('data').hidden`),false);
 assert.ok(await b.eval(`document.getElementById('sessionRows').textContent.includes('Level 1 / puzzle 1')`));
 assert.ok(await b.eval(`document.getElementById('visitRows').textContent.includes('dashboard-test')`));
 await b.screenshot('/tmp/arcade-monitor-desktop.png');
 await b.send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
 await b.screenshot('/tmp/arcade-monitor-mobile.png');
 assert.equal(await b.eval('document.documentElement.scrollWidth <= innerWidth'),true);
 await b.eval(`document.getElementById('search').value='no-such-player';document.getElementById('search').dispatchEvent(new Event('input'))`);
 assert.ok(await b.eval(`document.getElementById('sessionRows').textContent.includes('No matching')`));
 await b.eval(`document.getElementById('lock').click()`);
 assert.equal(await b.eval(`document.getElementById('data').hidden`),true);
 assert.deepEqual(b.errors(),[]);
 console.log('PASS: actual game heartbeat, level, dashboard, filtering, mobile layout, lock; no browser errors.');
} finally {if(b)await b.close();await server.stop();}
