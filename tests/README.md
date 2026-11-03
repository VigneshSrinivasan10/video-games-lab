# Tests

## Refactor regression checks

```sh
node --test tests/server/*.test.mjs
node --test tests/unit/*.test.mjs
node tests/browser/refactor-smoke.mjs
node tests/browser/flight-smoke.mjs
node tests/browser/city-flight-controllers.mjs
node tests/browser/controller-handover.mjs
node tests/browser/multiplayer-smoke.mjs
```

These suites launch disposable servers through `helpers/server.mjs`. Credentials and player data are generated in a temporary directory and removed at shutdown. Production `.hosting/` is never read or written. Browser checks require Chromium and use `helpers/cdp.mjs` plus the controller simulator in `helpers/fakepad.js`.

The multiplayer suite checks creating and joining chess and kitchen rooms, both embedded games, readiness, controls, disconnection, and returning to the arcade.

The custom-game suite exercises gameplay, inputs, saving, and return-to-launcher behavior. It accepts an optional comma-separated game list. The flight suite checks all packaged cities plus Berlin.

The flight controller check covers replacing a controller in the atlas, Paris, Berlin, and Berlin District, including an empty first slot, an old controller still connected, disconnection, reconnection, and the held-A return guard. The handover suite checks launcher focus, the profile dialog guard, releasing held inputs, and keeping both local players assigned in all four co-op games. Shared-input tests also cover keyboard emulation and spare controllers before player 2 joins.

Run the arcade and installed-game smoke suites with the original controller missing and a replacement in browser slot 1:

```sh
ARCADE_TEST_PAD=replacement node tests/browser/refactor-smoke.mjs
ARCADE_TEST_PAD=replacement node tests/browser/local-games-smoke.mjs
```

The Still puzzle games currently use keyboard/mouse for gameplay; their smoke checks cover that gameplay and controller hold-B return. The installed-game suite requires the six local installations. Changes inside `local-games/` stay local and are ignored by Git.

## Existing targeted checks

Start an isolated development server in another terminal:

```sh
./scripts/test-server.sh
```

Existing scenarios such as `node tests/browser/launcher-test.mjs` and `node tests/browser/test-world-flight-ui.mjs` default to port 8766. Set `ARCADE_TEST_URL` to another isolated server when needed. They sign into a temporary player profile before testing.

Map performance checks in `test-world-flight.mjs` require hardware graphics access. Software rendering is suitable for functional checks, but its frame timings are not representative of gameplay on a GPU. The stored city validation fixture is a historical artifact, not a new performance result.
