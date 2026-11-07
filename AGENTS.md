# Canonical workspace

Make all new application changes in this repository: `frontend/` for React,
`backend/` for FastAPI, and root `deploy/` for public releases. The sibling
`cipher-workbench-fe` and `cipher-workbench-be` repositories are legacy recovery
copies. Do not copy their source over the newer monorepo or use their deployment
scripts for normal local development or public releases.

Read `README.md`, `docs/LOCAL_MIGRATION.md`, and `docs/DEPLOYMENT.md` for the
runtime and release process. Local Docker runs at http://127.0.0.1:18081 with
`docker compose up --build -d --wait`; production uses the tested staging digest.

Preserve legacy SQLite volumes, backups, and private environment files. Do not
import server history into browser history automatically. Do not commit private
configuration, database snapshots, generated outputs, or unrelated document drafts.

Project documentation is centralized under `docs/`; start with `docs/README.md`.
Current FE/BE algorithm scopes are indexed in `docs/scopes/README.md`.
