# Local monorepo runtime and legacy recovery

## Current workspace

Use `cipher-workbench/frontend` and `cipher-workbench/backend` for all new code.
Public deployment uses the root Dockerfile and `.github/workflows/`, as described
in [DEPLOYMENT.md](DEPLOYMENT.md). Frontend deployment recipes copied from the
older repository are retained for recovery; they do not manage the public runtime.

From the monorepo root:

```sh
docker compose up --build -d --wait
docker compose ps
curl --fail http://127.0.0.1:18081/api/health
docker compose stop
```

The default address is `127.0.0.1:18081`. Set `APP_HTTP_PORT` to change the host
port; the container still listens on 8000. Public mode enables all algorithms,
uses no database, and stores history in each browser for at most one hour.
SQLite history is not imported into the browser. `/api/release` identifies the
build when `GIT_SHA` is supplied to Compose.

## Preserved legacy state

The November 6, 2026 migration preserves both repositories, their private env
files, their existing backup directories, and these Docker volumes:

- `cipher-workbench-sqlite_history-data`: common operation history.
- `cipher-workbench-be_history-data`: RSA and Diffie–Hellman history.
- `cipher-workbench-sqlite-integration_history-data`: old integration data.

Consistent online SQLite snapshots of the two active databases and copies of
legacy env files are stored outside Git under
`../../Cipher-workbench-backups/20261106-125205-sync/` relative to the monorepo
root. Both database snapshots passed SQLite integrity checks.
Keep the backup directory private: its env files can contain signing keys.
The snapshots are recovery copies; the original volumes remain in Docker.

The stopped legacy containers can be inspected with `docker ps -a`. Do not use
`docker compose down --volumes`, delete the legacy directories, or remove their
volumes when cleaning up this migration.

## Explicit rollback to the old local application

Stop the monorepo container first to release port 18081. The retained legacy
containers can then be started without recreating volumes or changing their
original env configuration:

```sh
docker compose stop
docker start cipher-workbench-sqlite-backend-1 cipher-workbench-be-app-1
# Wait for both backends to become healthy before starting the frontend.
docker inspect --format '{{.Name}} {{.State.Health.Status}}' \
  cipher-workbench-sqlite-backend-1 cipher-workbench-be-app-1
docker start cipher-workbench-sqlite-backup-1 cipher-workbench-sqlite-frontend-1
```

This is a rollback procedure, not the normal development workflow. Before
returning to the monorepo, stop those four legacy containers and run the normal
monorepo command above. Existing browser history at the local origin is separate
from preserved SQLite records and remains subject to its expiry policy.
