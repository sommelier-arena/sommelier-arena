Sommelier Arena — quick start

Environment files

This repository uses per-service `.env` files for local development (see `front/.env.local.example`, `back/.env.example`, `docs-site/.env.example`).

To avoid accidentally committing secrets, a local Git hook is recommended. Enable the provided hooks with:

  git config core.hooksPath .githooks

Once enabled, the pre-commit hook will prevent committing `.env` or `.env.local` files.

Frontend local setup

  cd front
  cp .env.local.example .env.local
  # edit as needed, then run the dev server
  npm ci
  npm run dev

Docs local setup

  cd docs-site
  cp .env.example .env
  npm ci
  npm run start:local

For full environment guidance see docs-site/docs/env.md
