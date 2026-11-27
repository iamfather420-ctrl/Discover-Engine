# Discover-Engine persistent storage

## Current deployment boundary

The deployed Render service is on the free plan and has no configured persistent disk. Its previous MongoDB adapter silently fell back to a process-local `Map` when `MONGO_URL` was absent. That fallback is removed in this branch.

The replacement uses standard PostgreSQL transactions through the `pg` driver and pins production-like configuration to the existing Neon staging branch only. The same repository code is exercised against a disposable local PostgreSQL service in CI:

- Neon project: `soft-grass-12820689`
- Staging branch: `br-late-fire-ayq1hxa0`
- Expected host: `ep-rough-unit-aysyjj75.c-5.us-east-2.aws.neon.tech`
- Database: `neondb`

The code rejects any other database host in Render. A localhost/127.0.0.1 exception is allowed only when both `NODE_ENV=test` and `DISCOVERY_ALLOW_LOCAL_TEST_DATABASE=true` are set; the GitHub Actions workflow uses a disposable PostgreSQL container. It does not create a Neon project, branch, compute, or paid resource.

## Required Render environment

Configure these values on the Discover-Engine Render service before merging/deploying this branch:

- `DATABASE_URL`: connection string for the existing staging branch above. Do not use the production branch.
- `DISCOVERY_TENANT_ID`: stable server-owned tenant identifier for this service. It must not come from request bodies or query parameters.
- `DISCOVERY_API_TOKEN`: existing service-to-service bearer secret (at least 32 characters).
- The PostgreSQL role in `DATABASE_URL` must be a restricted runtime role: not a superuser, not `BYPASSRLS`, and not the table owner. Grant only the required SELECT/INSERT/UPDATE/DELETE privileges.

Do not put connection strings or tokens in source control, PR comments, logs, or client responses.

## Manual schema step

The service never runs migrations automatically. CI applies the same SQL to its disposable PostgreSQL container before running the end-to-end pipeline test. Review and apply:

`migrations/001_create_daisy_projects.sql`

to the existing staging branch only. The migration creates typed columns for project identity, lifecycle, arrays, evidence claims/measurements, discoveries, components, connections, and inventions. It enables and forces row-level security with a transaction-local tenant policy.

At startup, `connectDb()` verifies the expected host, required table columns, forced RLS, the tenant isolation policy, and that the current database role is neither superuser nor `BYPASSRLS`. If any requirement is missing, startup fails closed. No in-memory fallback exists.

The service exposes `/healthz` for process liveness and `/readyz` for a real tenant-scoped database query. Configure Render's health-check path to `/readyz` only after the migration and restricted role are in place.

## Transaction isolation

Every repository operation starts a transaction, sets `app.tenant_id` with transaction-local scope, and uses explicit tenant predicates. PostgreSQL row-level security independently applies the same tenant predicate. The API never accepts a tenant ID from the caller.

## Validation

`npm run typecheck` and `npm test` validate compilation and repository tenant scoping. These tests do not prove the deployed Render service has been configured or that the staging migration has been applied. After owner configuration, the service must be tested with a real project write/read, restart, and cross-tenant denial test before it can be called durable or enterprise-ready.

## Deployment safety

This is a draft code change only. Do not merge into the Render-tracked branch until the environment values and staging migration have been completed and verified. The current deployed service remains unchanged until then.
