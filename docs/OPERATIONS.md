# Operations Runbook

This runbook covers routine setup and maintenance for local/on-prem ShaleLight deployments.

## Initial Setup

1. Start database:
   - `docker compose up -d postgres`
2. Configure environment:
   - `cp .env.example .env.local`
   - set `JWT_SECRET` to a strong value
3. Bootstrap:
   - `npm run setup`
4. Apply migrations:
   - `npm run migrate`
5. Start app:
   - `npm run dev` (or full compose flow)

## Health Checks

- Liveness: `GET /api/health`
- Readiness: `GET /api/health/ready`

Use readiness for operational checks because it includes dependency status.

## Routine Maintenance

- Re-run crawl/ingest jobs when source data changes.
- Monitor job statuses in admin pipeline views.
- Run migrations before deploying updated builds.
- Periodically purge/rotate old logs and verify disk usage.

## Backup and Restore

At minimum, back up:

- PostgreSQL data volume.
- `.env.local` (securely, with access controls).

Restore should be tested regularly to verify:

- app can start,
- migrations are up-to-date,
- health endpoints return expected status.

## Upgrade Process

1. Pull new code.
2. Install dependencies.
3. Run migrations.
4. Restart app.
5. Verify `/api/health/ready`.
6. Run smoke tests (login, chat, admin pages, pipeline run).

## Air-Gapped Notes

- Stage required dependencies/images before transfer.
- Confirm Ollama availability on target host.
- Keep provider mode as `ollama` for strict local boundary operation.

## Incident Basics

- If DB unavailable: app readiness should report degraded/error.
- If jobs stall: inspect pipeline status table and rerun targeted jobs.
- If auth fails broadly: verify `JWT_SECRET`, cookies, and DB connectivity.
