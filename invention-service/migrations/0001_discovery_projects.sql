-- Additive durable storage for Discover-Engine project records.
-- Manual owner-reviewed migration only. The application never runs DDL.
-- Apply to the existing SolveX Neon STAGING branch only.

CREATE TABLE IF NOT EXISTS public.discovery_projects (
  tenant_id TEXT NOT NULL CHECK (length(tenant_id) BETWEEN 1 AND 128),
  project_id TEXT NOT NULL CHECK (length(project_id) BETWEEN 1 AND 160),
  project_json JSONB NOT NULL CHECK (jsonb_typeof(project_json) = 'object'),
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (tenant_id, project_id)
);

CREATE INDEX IF NOT EXISTS discovery_projects_tenant_created_idx
  ON public.discovery_projects (tenant_id, created_at DESC);

ALTER TABLE public.discovery_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discovery_projects FORCE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
     WHERE schemaname='public'
       AND tablename='discovery_projects'
       AND policyname='discovery_projects_tenant_isolation'
  ) THEN
    CREATE POLICY discovery_projects_tenant_isolation
      ON public.discovery_projects FOR ALL
      USING (tenant_id = current_setting('app.tenant_id', true))
      WITH CHECK (tenant_id = current_setting('app.tenant_id', true));
  END IF;
END
$$;
