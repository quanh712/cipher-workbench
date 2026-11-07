# Tài liệu Cipher Workbench

Mục lục chung cho tài liệu dự án. Các file Markdown giữ riêng để dễ cập nhật,
review và dẫn liên kết; không ghép thành một file dài.

## Bắt đầu

- [Scope hiện hành của đủ 9 thuật toán](scopes/README.md).
- [Phạm vi chung FE/BE, file, API và lịch sử](scopes/COMMON_SCOPE.md).
- [Chạy local, migration và phục hồi](LOCAL_MIGRATION.md).
- [Ví dụ chữ ký RSA PEM: khóa, văn bản, file và API](examples/rsa-pem/README.md).
- [Phát hành staging/production](DEPLOYMENT.md).
- [Tài liệu pháp lý](legal/) và [bằng chứng audit](audits/).

## Quy ước quản lý

`scopes/` chứa scope/spec và tài liệu thuật toán. `frontend/`, `backend/`,
`contracts/` và `agents/` là các nhóm tài liệu được gom từ các thư mục source cũ.
Các lệnh trong tài liệu cũ vẫn cần chạy từ thư mục FE/BE mà tài liệu chỉ định;
việc chuyển file không đổi working directory của các lệnh đó.

Tài liệu có ngày rollout, SQLite/PostgreSQL, VPS/Nginx hoặc spec cũ là nguồn truy
vết/phục hồi, không tự động mô tả production hiện hành. Xem scope hiện hành và
hướng dẫn deploy ở trên trước khi vận hành.

`README.md` cạnh source, `AGENTS.md`, skill, OpenSpec và bản backup vẫn ở vị trí
công cụ cần dùng. Không xóa hoặc gộp archive/backup vào tài liệu hiện hành.
Ví dụ code API vẫn ở [backend/repo_docs/examples](../backend/repo_docs/examples/).

## Tài liệu frontend và các đợt rollout cũ

- [BACKEND_CONTRACT.md](frontend/BACKEND_CONTRACT.md).
- [BACKGROUND_RESEARCH.md](frontend/BACKGROUND_RESEARCH.md).
- [DEPLOYMENT.md](frontend/DEPLOYMENT.md).
- [DIFFIE_HELLMAN_BE_INTEGRATION.md](frontend/DIFFIE_HELLMAN_BE_INTEGRATION.md).
- [DIFFIE_HELLMAN_UI_QA.md](frontend/DIFFIE_HELLMAN_UI_QA.md).
- [FE_RELEASE_20261008.md](frontend/FE_RELEASE_20261008.md).
- [POSTGRES_BE_BRANCH_FINDINGS.md](frontend/POSTGRES_BE_BRANCH_FINDINGS.md).
- [POSTGRES_FE_ROADMAP.md](frontend/POSTGRES_FE_ROADMAP.md).
- [POSTGRES_REMOVAL_20261008.md](frontend/POSTGRES_REMOVAL_20261008.md).
- [SQLITE_COMPOSE.md](frontend/SQLITE_COMPOSE.md).
- [SQLITE_DB_FIXES_20261008.md](frontend/SQLITE_DB_FIXES_20261008.md).
- [SQLITE_EMPTY_HISTORY_CUTOVER.md](frontend/SQLITE_EMPTY_HISTORY_CUTOVER.md).
- [SQLITE_INTEGRATION_20261007.md](frontend/SQLITE_INTEGRATION_20261007.md).
- [TAILSCALE_RSA_RECOVERY_20261011.md](frontend/TAILSCALE_RSA_RECOVERY_20261011.md).

## Tài liệu backend và phục hồi dữ liệu

- [QA_FEATURE_SUMMARY.md](backend/QA_FEATURE_SUMMARY.md).
- [acceptance.md](backend/acceptance.md).
- [dh-engineering-evidence.md](backend/dh-engineering-evidence.md).
- [rsa-signatures-private-history.md](backend/rsa-signatures-private-history.md).
- [sqlite-history-engineering-rehearsal.md](backend/sqlite-history-engineering-rehearsal.md).
- [sqlite-history-evidence-template.md](backend/sqlite-history-evidence-template.md).
- [sqlite-history-local-rollout-20261007.md](backend/sqlite-history-local-rollout-20261007.md).
- [sqlite-history-runbook.md](backend/sqlite-history-runbook.md).

## API contract / consumer guide

- [dh-frontend-contract.md](contracts/dh-frontend-contract.md).
- [frontend-integration.md](contracts/frontend-integration.md).
- [rsa-frontend-contract.md](contracts/rsa-frontend-contract.md).

## Hướng dẫn làm việc cho agent

- [domain.md](agents/domain.md).
- [issue-tracker.md](agents/issue-tracker.md).
- [triage-labels.md](agents/triage-labels.md).
