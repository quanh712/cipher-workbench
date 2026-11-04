# Cipher Workbench

Private monorepo for the React frontend, FastAPI backend, and manual release pipeline.

```text
frontend/     React + TypeScript + Vite
backend/      Python 3.12 + FastAPI
deploy/       Render release and verification tools
.github/      checks, staging builds, and production promotion
```

## Development and release

Work on `feature/*` branches, verify locally, then merge into `dev`. Promote to `staging` only after checks pass. Test the deployed staging image before merging into `main`; production promotion is manual and reuses the verified image digest. See [deployment instructions](docs/DEPLOYMENT.md) for account setup, commands, release gates, and rollback.

The public image serves both the UI and `/api/*` from one origin. It runs without a database, and uses process-wide resource limits suitable for a small educational demo. This is an educational cryptography tool; its algorithms and demonstrations are not a replacement for production cryptographic protocols.

History is stored only in the current browser, expires after one hour, and does not retain private keys or original uploaded file contents. Clearing site data removes it. Staging and production use different origins and therefore separate browser histories.

## Local prerequisites

- Node.js 22 and npm
- Python 3.12 and [uv](https://docs.astral.sh/uv/)
- Docker only for testing the complete container locally

Frontend:

```sh
cd frontend
npm ci
npm run dev
```

Backend, in a second terminal:

```sh
cd backend
uv sync --locked
PUBLIC_MODE=true uv run uvicorn app.main:app --host 127.0.0.1 --port 8000
```

For frontend feature flags and the development API proxy, see [frontend configuration](frontend/.env.example). The release Docker image enables Hill, DES, RSA, and Diffie–Hellman.

To run the complete public container:

```sh
docker compose up --build
```

Then open http://localhost:8000.

## Migration

Both original repositories were imported without squashing their Git histories. Existing uncommitted frontend work was copied into a separate migration commit; the original workspaces were left untouched. Preserve original authors and license notices. Historical deployment recipes under `frontend/` refer to older VPS setups; use the root deployment guide for this release.
