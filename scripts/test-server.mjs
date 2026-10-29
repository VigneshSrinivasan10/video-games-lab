import { startTestServer } from '../tests/helpers/server.mjs';
const server = await startTestServer({ port: Number(process.env.ARCADE_TEST_PORT || 8766) });
console.log(`Isolated test arcade: ${server.base}`);
console.log('Credentials and saves are temporary and removed on exit.');
let stopping = false;
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, async () => {
  if (stopping) return; stopping = true; await server.stop(); process.exit(0);
});
