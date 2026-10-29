const TEST_URL = process.env.ARCADE_TEST_URL || 'http://127.0.0.1:8766';
// Example: node example-test.mjs <game.html path relative to the project folder>
// Start the test server with .tools/run-server.sh from the project folder.
import fs from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { launch } from '../helpers/cdp.mjs';
const rel = process.argv[2] || 'index.html';
const b = await launch({});
await b.signIn(TEST_URL);
await b.addInit(fs.readFileSync(new URL('../helpers/fakepad.js', import.meta.url), 'utf8'));
await b.goto((TEST_URL + '/') + rel);
await b.sleep(1200);
console.log('GamepadStd present:', await b.eval('!!window.GamepadStd'));
console.log('normalized A index 0 pressed after raw press:', await b.eval('(__fake.set("A", true), navigator.getGamepads()[0].buttons[0].pressed)'));
await b.eval('__fake.set("A", false)');
console.log('normalized dpad left from hat:', await b.eval('(__fake.set("left", true), navigator.getGamepads()[0].buttons[14].pressed)'));
await b.eval('__fake.set("left", false)');
await b.eval('__fake.tap("A")');            // should act like Space/Enter on the title screen
await b.sleep(600);
await b.screenshot(join(tmpdir(), 'video-games-lab-example.png'));
console.log('errors:', b.errors());
await b.close();
