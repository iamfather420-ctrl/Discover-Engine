import { Pool } from '@neondatabase/serverless';
import type { Project } from './types.js';

export const DISCOVERY_NEON_STAGING_HOST = 'ep-rough-unit-aysyjj75.c-5.us-east-2.aws.neon.tech';

interface QueryResult<Row = Record<string, unknown>> {
  rows: Row[];
  rowCount: number | null;
}
interface PgClient {
  query<Row = Record<string, unknown>>(sql: string, values?: unknown[]): Promise<QueryResult<Row>>;
  release(): void;
}
interface PgPool {
  connect(): Promise<PgClient>;
  end(): Promise<void>;
}

function blocked(reason: string): never {
  throw new Error('DISCOVERY_STORAGE_BLOCKED:' + reason);
}

function parseProject(value: unknown): Project {
  const parsed = typeof value === 'string' ? JSON.parse(value) : value;
  if (!parsed || typeof parsed !== 'object' || typeof (parsed as Project).id !== 'string') {
    blocked('PERSISTED_PROJECT_DOCUMENT_INVALID');
  }
  return parsed as Project;
}

/**
 * Durable tenant-scoped project storage on the existing SolveX Neon staging branch.
 * No in-memory fallback, no automatic schema creation, and no production database
 * access are permitted by this service.
 */
export class ProjectRepository {
  constructor(
    private readonly pool: PgPool,
    private readonly tenantId: string,
    private readonly expectedHost: string
  ) {
    if (!tenantId.trim()) blocked('DISCOVERY_TENANT_ID_REQUIRED');
    if (expectedHost !== DISCOVERY_NEON_STAGING_HOST) {
      blocked('DISCOVERY_STORAGE_MUST_USE_EXISTING_NEON_STAGING_BRANCH');
    }
  }

  public static async connectFromEnvironment(env: NodeJS.ProcessEnv = process.env): Promise<ProjectRepository> {
    const connectionString = env.DISCOVERY_DATABASE_URL;
    const expectedHost = env.DISCOVERY_EXPECTED_DB_HOST;
    const tenantId = env.DISCOVERY_TENANT_ID;
    const solvexEnv = env.SOLVEX_ENV;
    if (!connectionString || !expectedHost || !tenantId || !solvexEnv) {
      blocked('DISCOVERY_DATABASE_URL_EXPECTED_HOST_TENANT_AND_SOLVEX_ENV_REQUIRED');
    }
    if (!['staging', 'sandbox', 'development'].includes(solvexEnv)) {
      blocked('DISCOVERY_SERVICE_MUST_RUN_IN_NON_PRODUCTION_ENVIRONMENT');
    }

    let actualHost: string;
    try {
      actualHost = new URL(connectionString).hostname.toLowerCase();
    } catch {
      blocked('DISCOVERY_DATABASE_URL_INVALID');
    }
    if (actualHost !== expectedHost.toLowerCase()) {
      blocked('DISCOVERY_DATABASE_HOST_MISMATCH');
    }
    if (expectedHost !== DISCOVERY_NEON_STAGING_HOST) {
      blocked('DISCOVERY_DATABASE_HOST_NOT_IN_EXISTING_STAGING_ALLOWLIST');
    }

    const pool = new Pool({
      connectionString,
      max: 5,
      connectionTimeoutMillis: 5000,
      idleTimeoutMillis: 30000
    }) as unknown as PgPool;
    const repository = new ProjectRepository(pool, tenantId, expectedHost);
    try {
      await repository.verifySchema();
      return repository;
    } catch (error) {
      await pool.end().catch(() => undefined);
      throw error;
    }
  }

  private async withTenant<T>(operation: (client: PgClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query("SELECT set_config('app.tenant_id', $1, true)", [this.tenantId]);
      const result = await operation(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK').catch(() => undefined);
      throw error;
    } finally {
      client.release();
    }
  }

  private async verifySchema(): Promise<void> {
    const client = await this.pool.connect();
    try {
      const ping = await client.query<{ connected: number }>('SELECT 1 AS connected');
      if (Number(ping.rows[0]?.connected) !== 1) blocked('DATABASE_CONNECTIVITY_PROBE_FAILED');

      const role = await client.query<{ rolbypassrls: boolean; rolsuper: boolean }>(
        'SELECT rolbypassrls, rolsuper FROM pg_roles WHERE rolname = current_user'
      );
      if (role.rows.length !== 1 || role.rows[0].rolbypassrls || role.rows[0].rolsuper) {
        blocked('DATABASE_ROLE_MUST_NOT_BYPASS_ROW_LEVEL_SECURITY');
      }

      const columns = await client.query<{ column_name: string }>(
        "SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='discovery_projects'"
      );
      const required = ['tenant_id', 'project_id', 'project_json', 'created_at', 'updated_at'];
      const present = new Set(columns.rows.map(row => row.column_name));
      for (const name of required) {
        if (!present.has(name)) blocked('DISCOVERY_SCHEMA_MISSING_COLUMN:' + name);
      }

      const policies = await client.query<{
        rls_enabled: boolean;
        rls_forced: boolean;
        policy_name: string | null;
        policy_qual: string | null;
        policy_check: string | null;
      }>(
        "SELECT c.relrowsecurity AS rls_enabled, c.relforcerowsecurity AS rls_forced, p.policyname AS policy_name, p.qual AS policy_qual, p.with_check AS policy_check FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace LEFT JOIN pg_policies p ON p.schemaname=n.nspname AND p.tablename=c.relname WHERE n.nspname='public' AND c.relname='discovery_projects'"
      );
      const isolated = policies.rows.find(row => row.policy_name === 'discovery_projects_tenant_isolation');
      if (!isolated || isolated.rls_enabled !== true || isolated.rls_forced !== true ||
          !isolated.policy_qual?.includes("current_setting('app.tenant_id'") ||
          !isolated.policy_check?.includes("current_setting('app.tenant_id'")) {
        blocked('DISCOVERY_FORCED_TENANT_RLS_POLICY_MISSING');
      }
    } finally {
      client.release();
    }
  }

  public async healthCheck(): Promise<void> {
    await this.withTenant(async client => {
      const result = await client.query<{ tenant_id: string; connected: number }>(
        "SELECT current_setting('app.tenant_id', true) AS tenant_id, 1 AS connected"
      );
      if (result.rows[0]?.tenant_id !== this.tenantId || Number(result.rows[0]?.connected) !== 1) {
        blocked('TENANT_SCOPED_DATABASE_READINESS_PROBE_FAILED');
      }
    });
  }

  /** List projects, newest first (summary fields only). */
  public async list(): Promise<Pick<Project, 'id' | 'query' | 'domains' | 'status' | 'stage' | 'createdAt'>[]> {
    return this.withTenant(async client => {
      const result = await client.query<{ project_json: unknown }>(
        "SELECT project_json FROM public.discovery_projects WHERE tenant_id=current_setting('app.tenant_id', true) ORDER BY created_at DESC LIMIT 50"
      );
      return result.rows.map(row => parseProject(row.project_json)).map(project => ({
        id: project.id,
        query: project.query,
        domains: project.domains,
        status: project.status,
        stage: project.stage,
        createdAt: project.createdAt
      }));
    });
  }

  /** Get a full project. */
  public async get(id: string): Promise<Project | null> {
    return this.withTenant(async client => {
      const result = await client.query<{ project_json: unknown }>(
        "SELECT project_json FROM public.discovery_projects WHERE tenant_id=current_setting('app.tenant_id', true) AND project_id=$1",
        [id]
      );
      return result.rows[0] ? parseProject(result.rows[0].project_json) : null;
    });
  }

  /** Insert or replace a project. */
  public async save(project: Project): Promise<Project> {
    const persisted: Project = { ...project, updatedAt: new Date().toISOString() };
    await this.withTenant(async client => {
      await client.query(
        "INSERT INTO public.discovery_projects (tenant_id, project_id, project_json, created_at, updated_at) VALUES (current_setting('app.tenant_id', true), $1, $2::jsonb, $3::timestamptz, $4::timestamptz) ON CONFLICT (tenant_id, project_id) DO UPDATE SET project_json=EXCLUDED.project_json, updated_at=EXCLUDED.updated_at",
        [persisted.id, JSON.stringify(persisted), persisted.createdAt, persisted.updatedAt]
      );
    });
    return persisted;
  }

  /** Delete a project. */
  public async remove(id: string): Promise<void> {
    await this.withTenant(async client => {
      await client.query(
        "DELETE FROM public.discovery_projects WHERE tenant_id=current_setting('app.tenant_id', true) AND project_id=$1",
        [id]
      );
    });
  }

  public async close(): Promise<void> {
    await this.pool.end();
  }
}

export async function connectDb(): Promise<ProjectRepository> {
  return ProjectRepository.connectFromEnvironment();
}
