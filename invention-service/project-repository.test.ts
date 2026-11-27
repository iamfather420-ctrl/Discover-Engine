import { describe, expect, it, vi } from 'vitest';
import type { Project } from './types.js';
import {
  DISCOVERY_STAGING_NEON_HOST,
  ProjectRepository,
  validateDiscoveryDatabaseUrl,
  type PgClientLike,
  type PgPoolLike,
} from './project-repository.js';

function makePool(rows: Record<string, unknown>[] = []) {
  const queries: { text: string; values?: unknown[] }[] = [];
  const client: PgClientLike = {
    async query<Row = Record<string, unknown>>(text: string, values?: unknown[]) {
      queries.push({ text, values });
      return { rows: rows as Row[], rowCount: rows.length };
    },
    release: vi.fn(),
  };
  const pool: PgPoolLike = {
    connect: async () => client,
    end: async () => undefined,
  };
  return { pool, client, queries };
}

const project: Project = {
  id: '7b6f8b8a-9f7a-4d1c-8b3d-13d7e4b2a610',
  query: 'solid-state battery thermal interface',
  domains: ['materials science', 'thermal engineering'],
  status: 'running',
  stage: 'discover',
  log: ['started'],
  discoveries: [],
  evidenceClaims: [],
  evidenceMeasurements: [],
  components: [],
  connections: [],
  inventions: [],
  createdAt: '2026-11-26T12:00:00.000Z',
  updatedAt: '2026-11-26T12:00:00.000Z',
};

describe('Discover-Engine Neon persistence boundary', () => {
  it('accepts only the inspected staging Neon endpoint', () => {
    const url = 'postgresql://service:secret@' + DISCOVERY_STAGING_NEON_HOST + '/neondb?sslmode=require';
    expect(validateDiscoveryDatabaseUrl(url)).toBe(DISCOVERY_STAGING_NEON_HOST);
    expect(() => validateDiscoveryDatabaseUrl('postgresql://service:secret@production.example.com/neondb'))
      .toThrow(/PERSISTENCE_TARGET_REJECTED/);
    expect(() => validateDiscoveryDatabaseUrl('mongodb://localhost/discovery'))
      .toThrow(/PERSISTENCE_CONFIG_INVALID/);
  });

  it('sets a transaction-local tenant before every read and filters by that tenant', async () => {
    const { pool, queries, client } = makePool([{
      id: project.id, query: project.query, domains: project.domains,
      status: project.status, stage: project.stage, created_at: project.createdAt,
    }]);
    const repository = new ProjectRepository(pool, 'tenant-alpha');
    const listed = await repository.list();
    expect(listed).toHaveLength(1);
    expect(queries.map(item => item.text)).toEqual([
      'BEGIN',
      "SELECT set_config('app.tenant_id', $1, true)",
      expect.stringContaining('WHERE tenant_id = current_setting'),
      'COMMIT',
    ]);
    expect(queries[1].values).toEqual(['tenant-alpha']);
    expect(client.release).toHaveBeenCalledOnce();
  });

  it('writes all project domains through tenant-scoped, parameterized upsert', async () => {
    const { pool, queries } = makePool();
    const repository = new ProjectRepository(pool, 'tenant-alpha');
    await repository.save({ ...project, discoveries: [{ id: 'source-1' } as any] });
    const insert = queries.find(item => item.text.includes('INSERT INTO public.daisy_projects'));
    expect(insert).toBeDefined();
    expect(insert?.text).toContain("current_setting('app.tenant_id', true)");
    expect(insert?.text).toContain('ON CONFLICT (tenant_id, id) DO UPDATE');
    expect(insert?.values?.[0]).toBe(project.id);
    expect(insert?.values?.[1]).toBe(project.query);
    expect(insert?.values?.[7]).toBe('[{"id":"source-1"}]');
  });

  it('scopes get and delete operations to the server-owned tenant context', async () => {
    const { pool, queries } = makePool();
    const repository = new ProjectRepository(pool, 'tenant-alpha');
    await repository.get(project.id);
    await repository.remove(project.id);
    const read = queries.find(item => item.text.startsWith('SELECT * FROM public.daisy_projects'));
    const deletion = queries.find(item => item.text.startsWith('DELETE FROM public.daisy_projects'));
    expect(read?.text).toContain("tenant_id = current_setting('app.tenant_id', true)");
    expect(deletion?.text).toContain("tenant_id = current_setting('app.tenant_id', true)");
    expect(read?.values).toEqual([project.id]);
    expect(deletion?.values).toEqual([project.id]);
  });
});
