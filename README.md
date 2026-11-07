# Cipher Workbench

Private monorepo for the React frontend, FastAPI backend, and manual release pipeline.

Educational cryptography workspace for Caesar, Vigenère, Playfair, Affine,
Columnar Transposition, Hill, DES, RSA, and Diffie–Hellman.

- [Production](https://cipher-workbench.onrender.com)
- [Staging](https://cipher-workbench-staging.onrender.com)
- [Frontend guide](frontend/README.md) · [Backend reference](backend/README.md)

This is the canonical workspace for new changes. The sibling `cipher-workbench-fe`
and `cipher-workbench-be` repositories are retained for recovery only; edit
`frontend/` and `backend/` here. See [local migration and recovery](docs/LOCAL_MIGRATION.md).

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
cp .env.example .env.local
npm run dev
```

Backend, in a second terminal:

```sh
cd backend
uv sync --locked
PUBLIC_MODE=true uv run uvicorn app.main:app --host 127.0.0.1 --port 8000
```

For frontend feature flags and the development API proxy, see [frontend configuration](frontend/.env.example). The release Docker image enables Hill, DES, RSA, and Diffie–Hellman.
If using the Docker backend instead of the standalone backend, set
`BACKEND_DEV_URL=http://127.0.0.1:18081` in `frontend/.env.local`.

To run the complete public container:

```sh
docker compose up --build -d --wait
docker compose ps
curl --fail http://127.0.0.1:18081/api/health
```

Then open http://127.0.0.1:18081. The local container runs the same public mode as
production: no server database, with history kept in the browser for one hour.
Use `APP_HTTP_PORT=18082 docker compose up --build -d --wait` to choose another
port. Local and production browser histories are separate.

To stop the local container, run `docker compose stop` from the repository root.
To include the current commit in `/api/release`, build with
`GIT_SHA=$(git rev-parse HEAD) docker compose up --build -d --wait`.

## Brand assets

The header logo is the React SVG component
[`CipherMark.tsx`](frontend/src/shared/components/CipherMark.tsx); its animation
is defined in [`styles.css`](frontend/src/app/styles.css). The browser tab uses
the static [`favicon.svg`](frontend/public/favicon.svg), declared in
[`index.html`](frontend/index.html). Vite copies that public asset into the build.

## Algorithm scopes and specifications

All algorithm scopes, frontend specifications, and reference demos are indexed in
[docs/scopes/README.md](docs/scopes/README.md).
The complete documentation index is [docs/README.md](docs/README.md).

## Checks

Run frontend checks from `frontend/`:

```sh
npm run lint
npm run typecheck
npm test
npm run build
```

Run backend and release-tool checks from `backend/` after `uv sync --locked`:

```sh
uv run ruff check .
uv run pytest
python3 -m unittest discover -s ../deploy/tests -v
```

With the root Docker container running, run the public browser suite from `frontend/`:

```sh
npx playwright install chromium
PLAYWRIGHT_BASE_URL=http://127.0.0.1:18081 npx playwright test --config playwright.public.config.ts
```

## Migration

Both original repositories were imported without squashing their Git histories. Existing uncommitted frontend work was copied into a separate migration commit; the original application code and private runtime data were preserved. The legacy repositories now contain pointers to this monorepo. Preserve original authors and license notices. Historical deployment recipes under `frontend/` refer to older VPS setups; use the root deployment guide for this release.
