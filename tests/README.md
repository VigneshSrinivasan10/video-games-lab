# Tests

## Refactor regression checks

```sh
node --test tests/server/*.test.mjs
node tests/browser/refactor-smoke.mjs
node tests/browser/flight-smoke.mjs
node tests/browser/multiplayer-smoke.mjs
```

These suites launch disposable servers through `helpers/server.mjs`. Credentials and player data are generated in a temporary directory and removed at shutdown. Production `.hosting/` is never read or written. Browser checks require Chromium and use `helpers/cdp.mjs` plus the controller simulator in `helpers/fakepad.js`.

The multiplayer suite checks creating and joining chess and kitchen rooms, both embedded games, readiness, controls, disconnection, and returning to the arcade.

The custom-game suite exercises gameplay, inputs, saving, and return-to-launcher behavior. It accepts an optional comma-separated game list. The flight suite checks all packaged cities plus Berlin.

## Existing targeted checks

Start an isolated development server in another terminal:

```sh
./scripts/test-server.sh
```

Existing scenarios such as `node tests/browser/launcher-test.mjs` and `node tests/browser/test-world-flight-ui.mjs` default to port 8766. Set `ARCADE_TEST_URL` to another isolated server when needed. They sign into a temporary player profile before testing.

Map performance checks in `test-world-flight.mjs` require hardware graphics access. Software rendering is suitable for functional checks, but its frame timings are not representative of gameplay on a GPU. The stored city validation fixture is a historical artifact, not a new performance result.
