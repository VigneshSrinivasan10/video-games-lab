# .tools — headless test harness for the games (no puppeteer on this machine)

- `run-server.sh` serves the project folder on http://127.0.0.1:8766 (snap Chromium cannot read /tmp).
- `cdp.mjs` launches snap Chromium with the DevTools protocol: `launch()`, `addInit()`, `goto()`, `eval()`, `fire()`, `press()`, `screenshot()`, `errors()`, `close()`.
- `fakepad.js` fakes the real GameSir Nova as Chromium sees it (raw "Zikway HID gamepad" layout). Inject with `addInit` before `goto`, then `__fake.tap('A')`, `__fake.set('left', true)`, `__fake.stick(x, y)`, `__fake.hold('B', 2400)`, `__fake.addPad()`.
- `example-test.mjs <game.html>` and `launcher-test.mjs` show the pattern. Write per-game tests in the session scratchpad, not here.
