import { run } from './server.js';

run().catch((e) => {
  console.error('[invention-service] failed to start:', e);
  process.exit(1);
});
