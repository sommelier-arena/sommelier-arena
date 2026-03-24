Contributing — Environment variables and local setup

This project uses per-service environment variable configuration to keep local development straightforward and production secure. Please read the notes below before changing environment variables.

Env precedence and workflow

- Runtime (CI, Docker build args, platform env) overrides any values defined in per-service `.env` files.
- Each service provides a `.env.example` that documents the local development defaults. Copy `.env.example` → `.env` (or `.env.local` for frontend) in that service folder for local development.
- Root `.env` is discouraged. Use per-service `.env` files instead.
- Never commit `.env` files containing secrets. Use CI/Platform secret stores for production values.

Service-specific notes

- Frontend (front/): copy `front/.env.local.example` → `front/.env.local`. For Mode A (local dev), set `PUBLIC_PARTYKIT_HOST=localhost:1999`. For Docker/Mode B builds, the Dockerfile and docker-compose inject the appropriate host (localhost:4321).
- Backend (back/): `back/.env.example` documents any backend-only envs. Durable Object bindings (KV, etc.) are defined in `wrangler.toml` and platform secrets should be set via `wrangler secret put` or CI.
- Docs (docs-site/): copy `docs-site/.env.example` → `docs-site/.env` to mirror production (`DOCS_BASE_URL=/docs`) or set to `/` for root serving.

Troubleshooting

- If builds fail due to missing env vars in CI, ensure the secrets are configured in the CI provider and passed into the build job.
- To inspect resolved env values for a service, consider adding a temporary script that prints key env variables (do not commit secrets in the output).

Thank you for contributing!