# Troubleshooting

Common issues and practical fixes.

## Setup fails at `npm run setup`

Symptoms:

- setup reports missing Docker, Node, or Ollama.

Checks:

- `docker --version`
- `node --version`
- `ollama --version`

Fix:

- Install/start missing dependency and rerun setup.

## Database connection failures

Symptoms:

- API errors mention database connection.
- readiness endpoint returns degraded/error for database.

Checks:

- `docker compose ps`
- verify `DATABASE_URL` in `.env.local`.
- test DB container is healthy.

Fix:

- start/restart postgres service,
- correct `DATABASE_URL`,
- rerun migrations if schema mismatch is suspected.

## Migration errors

Symptoms:

- `npm run migrate` fails.

Checks:

- DB reachable,
- migration SQL syntax,
- migration already partially applied.

Fix:

- resolve failing SQL,
- rerun migrate after correction,
- verify `_migrations` table state.

## Chat works poorly or no relevant hits

Symptoms:

- empty or weak answers.

Checks:

- crawl and ingest completed,
- embeddings exist for chunks,
- source paths point to expected files.

Fix:

- rerun crawl -> ingest -> embed pipeline,
- verify allowed root paths and file types,
- check provider health in readiness endpoint.

## Path denied while browsing files

Symptoms:

- file browse endpoint returns path not allowed errors.

Checks:

- `ALLOWED_FILE_ROOTS` value,
- actual source path location.

Fix:

- include intended root path in `ALLOWED_FILE_ROOTS`,
- restart app after env change.

## Login/session issues

Symptoms:

- repeated unauthorized responses.

Checks:

- `JWT_SECRET` configured and consistent,
- session rows exist and are not expired,
- cookie present in browser.

Fix:

- reset session by logging out/in,
- verify auth env and DB state,
- clear stale browser cookies if needed.
