import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import { InventionService } from './invention-service.js';
import { ProjectRepository, connectDb } from './project-repository.js';

type Handler = (req: Request, res: Response) => Promise<unknown>;

/** Wrap async handlers so errors return JSON errors instead of crashing. */
const wrap = (fn: Handler) => (req: Request, res: Response, _next: NextFunction) => {
  fn(req, res).catch((e: Error) => {
    console.error('[invention-service]', e.message);
    res.status(/not found/i.test(e.message) ? 404 : 400).json({ message: e.message });
  });
};

/** Start the invention service HTTP API. */
export async function run() {
  const app = express();
  const useDb = await connectDb();
  console.log(`[invention-service] storage: ${useDb ? 'MongoDB' : 'in-memory (MONGO_URL not set)'}`);
  const engine = InventionService.from(new ProjectRepository(useDb));
  const port = process.env.PORT || 3000;

  app.use(express.json({ limit: '1mb' }));

  app.get('/', (_req, res) => {
    res.json({ name: 'daisy-invention-engine', status: 'ok', storage: useDb ? 'mongodb' : 'memory' });
  });

  app.get('/projects', wrap(async (_req, res) => res.json(await engine.list())));

  app.post(
    '/projects',
    wrap(async (req, res) => {
      const { query, domains } = req.body || {};
      if (!query || typeof query !== 'string' || query.trim().length < 3) throw new Error('A query of at least 3 characters is required');
      res.status(201).json(await engine.start(query, Array.isArray(domains) ? domains : undefined));
    }),
  );

  app.get(
    '/projects/:id',
    wrap(async (req, res) => {
      const p = await engine.get(String(req.params.id));
      if (!p) throw new Error('Project not found');
      res.json(p);
    }),
  );

  app.delete(
    '/projects/:id',
    wrap(async (req, res) => {
      await engine.remove(String(req.params.id));
      res.status(204).end();
    }),
  );

  app.post(
    '/projects/:id/inventions',
    wrap(async (req, res) => res.status(201).json(await engine.inventFrom(String(req.params.id), req.body?.componentIds || []))),
  );

  // Permanently disabled: synthetic simulations are not experimental evidence.
  app.post('/projects/:id/inventions/:inv/experiments', (_req, res) => {
    res.status(410).json({ message: 'Simulation disabled: synthetic model output is not real experimental evidence.' });
  });

  app.get('/projects/:id/evaluation', wrap(async (req, res) => res.json(await engine.evaluate(String(req.params.id)))));

  app.get(
    '/projects/:id/inventions/:inv/spec',
    wrap(async (req, res) => {
      res.type('text/markdown').send(await engine.spec(String(req.params.id), String(req.params.inv)));
    }),
  );

  app.get(
    '/projects/:id/export',
    wrap(async (req, res) => {
      const ids = typeof req.query.inventions === 'string' ? req.query.inventions.split(',').filter(Boolean) : undefined;
      const { name, data } = await engine.exportPackage(String(req.params.id), ids);
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename="${name}"`);
      res.send(data);
    }),
  );

  const server = app.listen(port, () => {
    console.log(`🚀  Invention service ready at: http://localhost:${port}`);
  });

  return {
    port,
    stop: async () => {
      server.closeAllConnections();
      server.close();
    },
  };
}
