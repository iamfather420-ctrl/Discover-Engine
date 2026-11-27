import { Pool } from 'pg';
import type { Project } from './types.js';

export const DISCOVERY_STAGING_NEON_HOST = 'ep-rough-unit-aysyjj75.c-5.us-east-2.aws.neon.tech';

export interface PgQueryResult<Row = Record<string, unknown>> {
  rows: Row[];
  rowCount: number | null;
}
export interface PgClientLike {
  query<Row = Record<string, unknown>>(text: string, values?: unknown[]): Promise<PgQueryResult<Row>>;
  release(): void;
}
export interface PgPoolLike {
  connect(): Promise<PgClientLike>;
  end(): Promise<void>;
}

function asIso(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  const parsed = new Date(String(value ?? ''));
  if (!Number.isFinite(parsed.getTime())) throw new Error('Persisted project timestamp is invalid.');
  return parsed.toISOString();
}

function toProject(row: Record<string, any>): Project {
  return {
    id: String(row.id),
    query: String(row.query),
    domains: Array.isArray(row.domains) ? row.domains : [],
    status: row.status,
    stage: String(row.stage),
    ...(typeof row.error === 'string' && row.error ? { error: row.error } : {}),
    log: Array.isArray(row.log) ? row.log : [],
    discoveries: Array.isArray(row.discoveries) ? row.discoveries : [],
    evidenceClaims: Array.isArray(row.evidence_claims) ? row.evidence_claims : [],
    evidenceMeasurements: Array.isArray(row.evidence_measurements) ? row.evidence_measurements : [],
    components: Array.isArray(row.components) ? row.components : [],
    connections: Array.isArray(row.connections) ? row.connections : [],
    inventions: Array.isArray(row.inventions) ? row.inventions : [],
    createdAt: asIso(row.created_at),
    updatedAt: asIso(row.updated_at),
  };
}

/** Reject every database target except the explicitly inspected existing staging endpoint. */
export function validateDiscoveryDatabaseUrl(connectionString: string): string {
  let url: URL;
  try { url = new URL(connectionString); } catch { throw new Error('PERSISTENCE_CONFIG_INVALID: DATABASE_URL is not a valid PostgreSQL URL.'); }
  if (!['postgres:', 'postgresql:'].includes(url.protocol)) {
    throw new Error('PERSISTENCE_CONFIG_INVALID: DATABASE_URL must use the PostgreSQL protocol.');
  }
  const hostname = url.hostname.toLowerCase();
  const localTestDatabase = process.env.NODE_ENV === 'test' &&
    process.env.DISCOVERY_ALLOW_LOCAL_TEST_DATABASE === 'true' &&
    (hostname === '127.0.0.1' || hostname === 'localhost');
  if (localTestDatabase) return hostname;
  if (hostname !== DISCOVERY_STAGING_NEON_HOST) {
    throw new Error('PERSISTENCE_TARGET_REJECTED: Discover-Engine is pinned to the existing Neon staging branch; the configured database host does not match.');
  }
  return hostname;
}

/**
 * Connect only to the already-existing Neon staging branch. No schema DDL is
 * executed here. The service refuses to start if the owner has not configured
 * the staging URL/tenant or applied the reviewed RLS migration.
 */
export async function connectDb(): Promise<{ pool: PgPoolLike; tenantId: string }> {
  const connectionString = process.env.DATABASE_URL?.trim() ?? '';
  const tenantId = process.env.DISCOVERY_TENANT_ID?.trim() ?? '';
  if (!connectionString || !tenantId) {
    throw new Error('PERSISTENCE_REQUIRED: configure DATABASE_URL for the pinned Neon staging endpoint and DISCOVERY_TENANT_ID. In-memory fallback is disabled.');
  }
  if (!/^[A-Za-z0-9._:-]{3,128}$/.test(tenantId)) {
    throw new Error('PERSISTENCE_CONFIG_INVALID: DISCOVERY_TENANT_ID has an invalid format.');
  }
  validateDiscoveryDatabaseUrl(connectionString);
  const pool = new Pool({ connectionString, max: 5, connectionTimeoutMillis: 5000, idleTimeoutMillis: 30000 }) as unknown as PgPoolLike;
  try {
    const client = await pool.connect();
    try {
      const schema = await client.query<Record<string, any>>(
        'SELECT c.relrowsecurity AS rls_enabled, c.relforcerowsecurity AS rls_forced, ' +
        'pg_get_userbyid(c.relowner) AS table_owner, ' +
        'p.qual AS policy_using, p.with_check AS policy_check ' +
        'FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace ' +
        'LEFT JOIN pg_policies p ON p.schemaname = n.nspname AND p.tablename = c.relname ' +
        'AND p.policyname = \'daisy_projects_tenant_isolation\' ' +
        'WHERE n.nspname = \'public\' AND c.relname = \'daisy_projects\''
      );
      const row = schema.rows[0];
      const role = await client.query<{ rolname: string; rolbypassrls: boolean; rolsuper: boolean }>(
        'SELECT rolname, rolbypassrls, rolsuper FROM pg_roles WHERE rolname = current_user'
      );
      if (role.rows.length !== 1 || role.rows[0].rolbypassrls || role.rows[0].rolsuper) {
        throw new Error('PERSISTENCE_ROLE_NOT_RESTRICTED: runtime role must not be superuser or BYPASSRLS.');
      }
      if (String(row?.table_owner ?? '') === role.rows[0].rolname) {
        throw new Error('PERSISTENCE_ROLE_TABLE_OWNER: runtime role must not own the discovery project table.');
      }
      const columns = await client.query<{ column_name: string }>(
        'SELECT column_name FROM information_schema.columns ' +
        'WHERE table_schema = \'public\' AND table_name = \'daisy_projects\''
      );
      const required = [
        'id','tenant_id','query','domains','status','stage','error','log',
        'discoveries','evidence_claims','evidence_measurements','components',
        'connections','inventions','created_at','updated_at'
      ];
      const actual = new Set(columns.rows.map(item => item.column_name));
      const missing = required.filter(column => !actual.has(column));
      const usingPolicy = String(row?.policy_using ?? '');
      const checkPolicy = String(row?.policy_check ?? '');
      if (!row || row.rls_enabled !== true || row.rls_forced !== true ||
          !usingPolicy.includes("current_setting('app.tenant_id'") ||
          !checkPolicy.includes("current_setting('app.tenant_id'") || missing.length > 0) {
        throw new Error('PERSISTENCE_SCHEMA_NOT_READY: daisy_projects must have the reviewed typed columns and forced tenant RLS policy. Missing columns: ' + missing.join(', '));
      }
      await client.query('SELECT 1');
    } finally {
      client.release();
    }
    return { pool, tenantId };
  } catch (error) {
    await pool.end().catch(() => undefined);
    throw error;
  }
}

/** Tenant-scoped PostgreSQL repository. Every operation runs inside a transaction
 * with a transaction-local tenant context; PostgreSQL RLS is an additional guard.
 */
export class ProjectRepository {
  constructor(private readonly pool: PgPoolLike, private readonly tenantId: string) {
    if (!tenantId) throw new Error('PERSISTENCE_CONFIG_INVALID: a server-owned tenant ID is required.');
  }

  private async withTenant<T>(operation: (client: PgClientLike) => Promise<T>): Promise<T> {
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

  async healthCheck(): Promise<void> {
    await this.withTenant(async client => {
      const result = await client.query<{ tenant_id: string; connected: number }>(
        "SELECT current_setting('app.tenant_id', true) AS tenant_id, 1 AS connected"
      );
      if (result.rows[0]?.tenant_id !== this.tenantId || Number(result.rows[0]?.connected) !== 1) {
        throw new Error('PERSISTENCE_READINESS_CHECK_FAILED: tenant-scoped database query did not verify.');
      }
    });
  }

  async list(): Promise<Pick<Project, 'id' | 'query' | 'domains' | 'status' | 'stage' | 'createdAt'>[]> {
    return this.withTenant(async client => {
      const result = await client.query<Record<string, any>>(
        'SELECT id, query, domains, status, stage, created_at FROM public.daisy_projects ' +
        'WHERE tenant_id = current_setting(\'app.tenant_id\', true) ' +
        'ORDER BY updated_at DESC LIMIT 50'
      );
      return result.rows.map(row => ({
        id: String(row.id), query: String(row.query),
        domains: Array.isArray(row.domains) ? row.domains : [],
        status: row.status, stage: String(row.stage), createdAt: asIso(row.created_at)
      }));
    });
  }

  async get(id: string): Promise<Project | null> {
    return this.withTenant(async client => {
      const result = await client.query<Record<string, any>>(
        'SELECT * FROM public.daisy_projects ' +
        'WHERE tenant_id = current_setting(\'app.tenant_id\', true) AND id = $1 LIMIT 1', [id]
      );
      return result.rows[0] ? toProject(result.rows[0]) : null;
    });
  }

  async save(project: Project): Promise<Project> {
    project.updatedAt = new Date().toISOString();
    await this.withTenant(async client => {
      await client.query(
        'INSERT INTO public.daisy_projects (' +
        'id, tenant_id, query, domains, status, stage, error, log, discoveries, ' +
        'evidence_claims, evidence_measurements, components, connections, inventions, created_at, updated_at' +
        ') VALUES (' +
        '$1, current_setting(\'app.tenant_id\', true), $2, $3, $4, $5, $6, $7, ' +
        '$8::jsonb, $9::jsonb, $10::jsonb, $11::jsonb, $12::jsonb, $13::jsonb, ' +
        '$14::timestamptz, $15::timestamptz' +
        ') ON CONFLICT (tenant_id, id) DO UPDATE SET ' +
        'query = EXCLUDED.query, domains = EXCLUDED.domains, status = EXCLUDED.status, ' +
        'stage = EXCLUDED.stage, error = EXCLUDED.error, log = EXCLUDED.log, ' +
        'discoveries = EXCLUDED.discoveries, evidence_claims = EXCLUDED.evidence_claims, ' +
        'evidence_measurements = EXCLUDED.evidence_measurements, components = EXCLUDED.components, ' +
        'connections = EXCLUDED.connections, inventions = EXCLUDED.inventions, updated_at = EXCLUDED.updated_at',
        [
          project.id, project.query, project.domains, project.status, project.stage,
          project.error ?? null, project.log, JSON.stringify(project.discoveries),
          JSON.stringify(project.evidenceClaims ?? []), JSON.stringify(project.evidenceMeasurements ?? []),
          JSON.stringify(project.components), JSON.stringify(project.connections),
          JSON.stringify(project.inventions), project.createdAt, project.updatedAt
        ]
      );
    });
    return project;
  }

  async remove(id: string): Promise<void> {
    await this.withTenant(async client => {
      await client.query(
        'DELETE FROM public.daisy_projects WHERE tenant_id = current_setting(\'app.tenant_id\', true) AND id = $1',
        [id]
      );
    });
  }
}
