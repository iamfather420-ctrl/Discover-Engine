# Discover-Engine persistent storage

## Current deployment boundary

The deployed Render service is on the free plan and has no configured persistent disk. Its previous MongoDB adapter silently fell back to a process-local `Map` when `MONGO_URL` was absent. That fallback is removed in this branch.

The replacement uses the existing Neon PostgreSQL staging branch only:

- Neon project: `soft-grass-12820689`
- Staging branch: `br-late-fire-ayq1hxa0`
- Expected host: `ep-rough-unit-aysyjj75.c-5.us-east-2.aws.neon.tech`
- Database: `neondb`

The code rejects any other database host. It does not create a Neon project, branch, compute, or paid resource.

## Required Render environment

Configure these values on the Discover-Engine Render service before merging/deploying this branch:

- `DATABASE_URL`: connection string for the existing staging branch above. Do not use the production branch.
- `DISCOVERY_TENANT_ID`: stable server-owned tenant identifier for this service. It must not come from request bodies or query parameters.
- `DISCOVERY_API_TOKEN`: existing service-to-service bearer secret (at least 32 characters).

Do not put connection strings or tokens in source control, PR comments, logs, or client responses.

## Manual schema step

The service never runs migrations automatically. Review and apply:

`migrations/001_create_daisy_projects.sql`

to the existing staging branch only. The migration creates typed columns for project identity, lifecycle, arrays, evidence claims/measurements, discoveries, components, connections, and inventions. It enables and forces row-level security with a transaction-local tenant policy.

At startup, `connectDb()` verifies the expected host, required table columns, forced RLS, and the tenant isolation policy. If any requirement is missing, startup fails closed. No in-memory fallback exists.

## Transaction isolation

Every repository operation starts a transaction, sets `app.tenant_id` with transaction-local scope, and uses explicit tenant predicates. PostgreSQL row-level security independently applies the same tenant predicate. The API never accepts a tenant ID from the caller.

## Validation

`npm run typecheck` and `npm test` validate compilation and repository tenant scoping. These tests do not prove the deployed Render service has been configured or that the staging migration has been applied. After owner configuration, the service must be tested with a real project write/read, restart, and cross-tenant denial test before it can be called durable or enterprise-ready.

## Deployment safety

This is a draft code change only. Do not merge into the Render-tracked branch until the environment values and staging migration have been completed and verified. The current deployed service remains unchanged until then.
