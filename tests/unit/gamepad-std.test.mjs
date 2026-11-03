import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import vm from 'node:vm';

const fake = readFileSync(new URL('../helpers/fakepad.js', import.meta.url), 'utf8');
const source = readFileSync(new URL('../../public/shared/gamepad-std.js', import.meta.url), 'utf8');
function controller(keys, keys2) {
  const events = [], frames = [];
  const context = vm.createContext({
    navigator: {}, URL, URLSearchParams, setTimeout,
    location: { href: 'http://localhost/game.html', search: '' },
    performance: { now: () => 1000 },
    requestAnimationFrame: fn => frames.push(fn),
    KeyboardEvent: class { constructor(type, props) { Object.assign(this, { type }, props); } },
    document: {
      currentScript: { dataset: { noExit: '1', keys: JSON.stringify(keys), keys2: JSON.stringify(keys2) } },
      activeElement: { tagName: 'DIV', dispatchEvent: e => events.push([e.type, e.code]) },
    },
  });
  context.window = context;
  vm.runInContext(fake, context);
  vm.runInContext(source, context);
  return { pad: context.__fake, api: context.GamepadStd, events, frame: () => frames.shift()() };
}
const slots = pads => Array.from(pads, p => p?.index ?? null);

test('solo replacement takes over from a held original and stays selected at neutral', () => {
  const { pad, api } = controller();
  pad.addPad(); pad.set('A', true, 0);
  assert.equal(api.readActive('solo').index, 0);
  pad.stick(.4, 0, 1);
  assert.equal(api.readActive('solo').index, 1);
  pad.stick(0, 0, 1);
  assert.equal(api.readActive('solo').index, 1);
  pad.disconnect(0); pad.disconnect(1);
  assert.equal(api.readActive('solo'), null);
  pad.pads[1].connected = true; pad.set('A', true, 1);
  assert.equal(api.readActive('solo').just.A, true);
});

test('co-op replacement fills the disconnected player without moving the survivor', () => {
  const { pad, api } = controller();
  pad.addPad();
  assert.deepEqual(slots(api.readPlayers('coop', 2)), [0, 1]);
  pad.pads[0] = null;
  assert.deepEqual(slots(api.readPlayers('coop', 2)), [null, 1]);
  pad.addPad();
  assert.deepEqual(slots(api.readPlayers('coop', 2)), [2, 1]);
  pad.disconnect(1);
  assert.deepEqual(slots(api.readPlayers('coop', 2)), [2, null]);
  pad.addPad();
  assert.deepEqual(slots(api.readPlayers('coop', 2)), [2, 3]);
});

test('an unjoined spare can replace player 1 instead of becoming player 2', () => {
  const { pad, api } = controller();
  pad.addPad();
  assert.deepEqual(slots(api.readPlayers('joinable', 2, 1)), [0, 1]);
  pad.disconnect(0);
  assert.deepEqual(slots(api.readPlayers('joinable', 2, 1)), [1, null]);
});

test('changing from solo to co-op preserves the selected player 1 controller', () => {
  const { pad, api } = controller();
  pad.addPad(); pad.set('A', true, 1);
  assert.deepEqual(slots(api.readPlayers('mode', 1)), [1]);
  assert.deepEqual(slots(api.readPlayers('mode', 2)), [1, 0]);
});

test('synthetic keys release on handover and disconnection', () => {
  const { pad, events, frame } = controller({ A: 'Space' });
  pad.set('A', true); pad.set('right', true); frame();
  assert.deepEqual(events.splice(0), [['keydown', 'Space'], ['keydown', 'ArrowRight']]);
  pad.addPad(); pad.set('left', true, 1); frame();
  assert.deepEqual(events.splice(0), [['keyup', 'Space'], ['keyup', 'ArrowRight'], ['keydown', 'ArrowLeft']]);
  pad.disconnect(0); pad.disconnect(1); frame();
  assert.deepEqual(events.splice(0), [['keyup', 'ArrowLeft']]);
});

test('buttons sharing a keyboard mapping do not release each other', () => {
  const { pad, events, frame } = controller({ A: 'Space', X: 'Space' });
  pad.set('A', true); pad.set('X', true); frame();
  assert.deepEqual(events.splice(0), [['keydown', 'Space']]);
  pad.set('A', false); frame();
  assert.deepEqual(events.splice(0), []);
  pad.set('X', false); frame();
  assert.deepEqual(events.splice(0), [['keyup', 'Space']]);
});

test('two keyboard maps retain player 2 keys when player 1 disconnects', () => {
  const { pad, events, frame } = controller({ A: 'Space' }, { A: 'KeyW' });
  pad.addPad(); pad.set('A', true, 1); frame();
  assert.deepEqual(events.splice(0), [['keydown', 'KeyW']]);
  pad.disconnect(0); frame();
  assert.deepEqual(events.splice(0), []);
  pad.addPad(); pad.set('A', true, 2); frame();
  assert.deepEqual(events.splice(0), [['keydown', 'Space']]);
});

test('controller selectors honor the profile dialog input guard', () => {
  const { pad, api } = controller();
  pad.set('A', true);
  api.read = () => [];
  assert.equal(api.readActive('guard'), null);
  assert.deepEqual(slots(api.readPlayers('guard', 2)), [null, null]);
});
