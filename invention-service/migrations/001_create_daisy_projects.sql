-- Discover-Engine persistent project storage.
-- Apply manually to the EXISTING Neon staging branch only:
-- project soft-grass-12820689 / branch br-late-fire-ayq1hxa0.
-- This migration is never executed automatically by the service.

CREATE TABLE IF NOT EXISTS public.daisy_projects (
  id UUID NOT NULL,
  tenant_id TEXT NOT NULL,
  query TEXT NOT NULL,
  domains TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  status TEXT NOT NULL CHECK (status IN ('running', 'ready', 'error')),
  stage TEXT NOT NULL,
  error TEXT,
  log TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  discoveries JSONB NOT NULL DEFAULT '[]'::JSONB,
  evidence_claims JSONB NOT NULL DEFAULT '[]'::JSONB,
  evidence_measurements JSONB NOT NULL DEFAULT '[]'::JSONB,
  components JSONB NOT NULL DEFAULT '[]'::JSONB,
  connections JSONB NOT NULL DEFAULT '[]'::JSONB,
  inventions JSONB NOT NULL DEFAULT '[]'::JSONB,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (tenant_id, id)
);

CREATE INDEX IF NOT EXISTS daisy_projects_tenant_updated_idx
  ON public.daisy_projects (tenant_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS daisy_projects_domains_gin_idx
  ON public.daisy_projects USING GIN (domains);

ALTER TABLE public.daisy_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daisy_projects FORCE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM pg_policies
     WHERE schemaname = 'public'
       AND tablename = 'daisy_projects'
       AND policyname = 'daisy_projects_tenant_isolation'
  ) THEN
    CREATE POLICY daisy_projects_tenant_isolation
      ON public.daisy_projects
      FOR ALL
      USING (tenant_id = current_setting('app.tenant_id', true))
      WITH CHECK (tenant_id = current_setting('app.tenant_id', true));
  END IF;
END
$$;
