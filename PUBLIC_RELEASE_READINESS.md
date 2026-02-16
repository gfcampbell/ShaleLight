# ShaleLight Public Release Readiness

This document is intended for public-facing release preparation and operator guidance.

## Release Positioning

ShaleLight is a local-first, air-gappable RAG platform intended for on-premises and restricted environments.

> **Critical provider guidance:** Ollama is required for local/air-gapped operation. OpenAI/Anthropic are optional external-provider modes for environments where outbound model traffic is acceptable.

## Operator Quick Start (Air-Gapped Friendly)

1. Start PostgreSQL/pgvector:
   - `docker compose up -d postgres`
2. Configure runtime environment:
   - `cp .env.example .env.local`
   - Set a strong `JWT_SECRET`
3. Bootstrap:
   - `npm run setup`
4. Apply schema updates:
   - `npm run migrate`
5. Run application:
   - `npm run dev` (or containerized app flow)

## Verification Checklist

- `npm run test`
- `npm run lint`
- `npm run typecheck`
- `npm run build`
- `curl http://localhost:3000/api/health`
- `curl http://localhost:3000/api/health/ready`

## Operational Guidance

- Keep `ALLOWED_FILE_ROOTS` restricted to intended data paths.
- Rotate admin credentials and JWT secrets per environment policy.
- Back up and verify restore for PostgreSQL data volume.
- Run migrations before promoting new builds.
- Track release notes and schema changes between versions.

## Public Launch Checklist

- `LICENSE` present and clear.
- `README.md` quick start and deployment steps validated on a clean machine.
- `SECURITY.md` present with vulnerability reporting path.
- `CHANGELOG.md` updated for first public release.
- Tags/releases follow a clear versioning scheme.

## Scope Notes

- Air-gapped/local operation is a primary design target.
- Hosted CI requirements are optional and not required for deployment model fit.
