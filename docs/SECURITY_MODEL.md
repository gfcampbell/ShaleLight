# Security Model

This project is designed for local and restricted-network operation. Security controls focus on access control, path safety, and predictable runtime boundaries.

## Core Assumptions

- Deployment is controlled by trusted operators.
- Host and filesystem permissions are managed at OS/container level.
- For strict local/air-gapped operation, Ollama is used as the AI provider.

## Authentication and Authorization

- Session cookie: `shale_session` (httpOnly, scoped, timed).
- JWT signed with required `JWT_SECRET` (no permissive fallback).
- Role-based checks (`admin`, `analyst`, `viewer`) enforced at route level.
- Middleware protects primary route surfaces and rejects unauthenticated access.

## Session Integrity

- Active session state is persisted in `sessions`.
- Session revocation path is supported through logout/session deletion.
- Middleware and route auth checks must remain aligned with DB session validity.

## Filesystem Safety

- Browse/discovery paths are restricted using `ALLOWED_FILE_ROOTS`.
- Path checks resolve canonical filesystem paths before access.
- Disallowed paths return explicit authorization errors.

## Input and Rendering Safety

- SQL is executed with parameterized queries.
- Chat markdown rendering is sanitized before display.
- Query size limits and rate limiting are applied on chat endpoints.

## Transport and Browser Controls

- Security headers include CSP, HSTS, frame denial, and nosniff behavior.
- Cookie settings and route protection reduce casual cross-context abuse.

## Provider Boundary

- Ollama keeps model traffic local.
- OpenAI/Anthropic require outbound connectivity and move data outside local boundary.
- Provider selection is an explicit security boundary decision.

## Operational Security Practices

- Use strong random `JWT_SECRET` values.
- Rotate admin credentials.
- Keep allowed file roots narrow.
- Backup DB regularly and verify restore path.
- Limit host-level access to deployment environment.
