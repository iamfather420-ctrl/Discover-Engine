import express from 'express';
import { existsSync } from 'node:fs';
import { GithubPublisher } from './github-publisher.js';

/** Files and folders from the workspace that make up the repository. */
const ENTRIES = ['daisy-engine', 'workspace.jsonc', '.bitmap', 'package.json', 'tsconfig.json', '.oxlintrc.json', '.prettierrc.cjs', 'README.md', '.gitignore'];

function workspaceRoot(): string {
  const candidates = [process.env.WORKSPACE_ROOT, process.cwd(), '/home/user/invention-engine'].filter(Boolean) as string[];
  return candidates.find((c) => existsSync(`${c}/workspace.jsonc`)) || process.cwd();
}

/** Start the publisher service: POST /publish uploads the workspace source to GitHub. */
export function run() {
  const app = express();
  const publisher = GithubPublisher.from();
  const port = process.env.PORT || 3000;
  app.use(express.json());

  app.get('/', (_req, res) => {
    res.json({ name: 'github-publisher', tokenConfigured: Boolean(process.env.HOPE_ANYTHING_AI_TOKEN), root: workspaceRoot() });
  });

  app.get('/preview', async (_req, res) => {
    const files = await publisher.collect(workspaceRoot(), ENTRIES);
    res.json({ count: files.length, files: files.map((f) => `${f.path} (${f.content.length}b)`) });
  });

  app.post('/publish', async (req, res) => {
    try {
      const token = process.env.HOPE_ANYTHING_AI_TOKEN;
      if (!token) throw new Error('HOPE_ANYTHING_AI_TOKEN is not set');
      const { owner, repo, message, branch } = req.body || {};
      if (!owner || !repo) throw new Error('owner and repo are required');
      const files = await publisher.collect(workspaceRoot(), ENTRIES);
      const result = await publisher.publish({ owner, repo, token, branch, files, message: message || 'Publish from Bit workspace' });
      res.json(result);
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  const server = app.listen(port, () => {
    console.log(`🚀  GitHub publisher ready at: http://localhost:${port}`);
  });

  return {
    port,
    stop: async () => {
      server.closeAllConnections();
      server.close();
    },
  };
}
