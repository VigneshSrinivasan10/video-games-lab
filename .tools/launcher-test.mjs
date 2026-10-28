import fs from 'node:fs';
import { launch } from './cdp.mjs';
const b = await launch({});
await b.addInit(fs.readFileSync(new URL('./fakepad.js', import.meta.url), 'utf8'));
await b.goto('http://127.0.0.1:8766/index.html');
await b.sleep(800);
const sel = () => b.eval('document.querySelector(".tile.sel, .tile.focus, .tile[aria-selected=true]")?.getAttribute("href") || document.activeElement?.getAttribute("href") || document.querySelector(".tile.active")?.getAttribute("href")');
console.log('initial:', await sel());
await b.eval('__fake.tap("right")'); console.log('after right:', await sel());
await b.eval('__fake.tap("down")'); console.log('after down:', await sel());
await b.eval('__fake.stick(-1, 0)'); await b.sleep(150); await b.eval('__fake.stick(0, 0)'); await b.sleep(100); console.log('after stick left:', await sel());
// hold B must NOT exit from the launcher itself
await b.eval('__fake.hold("B", 2400)'); console.log('url after hold B on launcher:', await b.eval('location.pathname'));
await b.fire('__fake.tap("A")'); await b.sleep(1500); console.log('url after A:', await b.eval('location.pathname'));
await b.fire('__fake.hold("B", 2400)'); await b.sleep(3400); console.log('url after hold B in game:', await b.eval('location.pathname'));
await b.screenshot('launcher.png');
console.log('errors:', b.errors());
await b.close();
