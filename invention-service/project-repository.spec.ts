import { describe, it, expect } from 'vitest';
import { ProjectRepository, DISCOVERY_NEON_STAGING_HOST } from './project-repository.js';
import type { Project } from './types.js';

function fakePool() {
  const projects = new Map<string, Project>();
  const calls: Array<{ sql: string; values: unknown[] }> = [];
  let tenant = '';
  const client = {
    async query(sql: string, values: unknown[] = []) {
      calls.push({ sql, values });
      if (sql.includes("set_config('app.tenant_id'")) {
        tenant = String(values[0]);
        return { rows: [{ set_config: tenant }], rowCount: 1 };
      }
      if (sql.startsWith('INSERT INTO public.discovery_projects')) {
        const project = JSON.parse(String(values[1])) as Project;
        projects.set(String(values[0]), project);
        return { rows: [], rowCount: 1 };
      }
      if (sql.startsWith('SELECT project_json') && sql.includes('project_id=$1')) {
        const project = projects.get(String(values[0]));
        return { rows: project && tenant ? [{ project_json: project }] : [], rowCount: project && tenant ? 1 : 0 };
      }
      if (sql.startsWith('SELECT project_json')) {
        return { rows: tenant ? [...projects.values()].map(project => ({ project_json: project })) : [], rowCount: projects.size };
      }
      if (sql.startsWith('DELETE FROM public.discovery_projects')) {
        projects.delete(String(values[0]));
        return { rows: [], rowCount: 1 };
      }
      if (sql.includes('current_setting') && sql.includes('AS tenant_id')) {
        return { rows: [{ tenant_id: tenant, connected: 1 }], rowCount: 1 };
      }
      return { rows: [], rowCount: 0 };
    },
    release() {}
  };
  const pool = {
    async connect() { return client; },
    async end() {}
  };
  return { pool, calls, projects };
}

const project = (): Project => ({
  id: 'project-1',
  query: 'battery thermal management',
  domains: ['energy'],
  status: 'queued',
  stage: 'discover',
  log: [],
  discoveries: [],
  components: [],
  connections: [],
  inventions: [],
  createdAt: '2026-11-27T12:00:00.000Z',
  updatedAt: '2026-11-27T12:00:00.000Z'
});

describe('Neon-backed ProjectRepository', () => {
  it('requires explicit staging database, host, tenant, and environment configuration', async () => {
    await expect(ProjectRepository.connectFromEnvironment({})).rejects.toThrow(
      'DISCOVERY_DATABASE_URL_EXPECTED_HOST_TENANT_AND_SOLVEX_ENV_REQUIRED'
    );
  });

  it('refuses any database host other than the existing Neon staging branch', () => {
    const fake = fakePool();
    expect(() => new ProjectRepository(fake.pool as never, 'tenant-a', 'old-branch.neon.tech')).toThrow(
      'DISCOVERY_STORAGE_MUST_USE_EXISTING_NEON_STAGING_BRANCH'
    );
  });

  it('persists, lists, reads, deletes, and health-checks projects inside tenant transactions', async () => {
    const fake = fakePool();
    const repository = new ProjectRepository(fake.pool as never, 'tenant-a', DISCOVERY_NEON_STAGING_HOST);
    const saved = await repository.save(project());
    expect(saved.updatedAt).not.toBe(project().updatedAt);
    expect(await repository.get('project-1')).toEqual(saved);
    expect(await repository.list()).toEqual([{
      id: saved.id,
      query: saved.query,
      domains: saved.domains,
      status: saved.status,
      stage: saved.stage,
      createdAt: saved.createdAt
    }]);
    await repository.healthCheck();
    await repository.remove('project-1');
    expect(await repository.get('project-1')).toBeNull();
    expect(fake.calls.filter(call => call.sql === 'BEGIN').length).toBe(5);
    expect(fake.calls.every(call => !/CREATE TABLE|ALTER TABLE|CREATE POLICY/i.test(call.sql))).toBe(true);
    expect(fake.calls.some(call => call.sql.includes("set_config('app.tenant_id'") && call.values[0] === 'tenant-a')).toBe(true);
  });
});
