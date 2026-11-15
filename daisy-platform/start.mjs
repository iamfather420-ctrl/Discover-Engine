import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const isWin = process.platform === 'win32';
const npm = isWin ? 'npm.cmd' : 'npm';

const service = spawn(npm, ['start'], { cwd: join(root, 'invention-service'), stdio: 'inherit', env: { ...process.env, PORT: '4000' } });
const app = spawn(npm, ['run', 'dev'], { cwd: join(root, 'daisy-app'), stdio: 'inherit', env: { ...process.env, BACKEND_URL: 'http://localhost:4000' } });

const stop = () => {
  service.kill();
  app.kill();
  process.exit(0);
};
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
