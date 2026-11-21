# Kiểm tra phiên bản thư viện và phần mềm — 21/11/2026

## Kết quả

Kiểm tra monorepo chính tại commit `d7a7f9a`, đối chiếu trực tiếp npm registry, PyPI JSON API và GitHub Releases API ngày 21/11/2026. Không sửa manifest/lockfile, không cài dependency vào dự án, không commit/push/deploy.

- `npm audit`: **0 advisory**; báo cáo cây dependency gồm 306 mục theo npm.
- `pip-audit 2.10.1`: **42 package Python khóa phiên bản, 0 lỗ hổng đã biết**. Requirements được dựng từ `backend/uv.lock`, kèm hash, kiểm tra bằng `--require-hashes --disable-pip`; gồm cả dev và package theo nền tảng.
- **11/21 dependency trực tiếp npm** và **28/42 package Python** có phiên bản stable mới hơn (xem bảng; không tính ứng dụng nội bộ và công cụ uv/pip-audit).
- Không xác nhận lỗi bảo mật mức cao/trung bình từ hai lần quét này. Có bản mới không đồng nghĩa bản đang dùng có lỗ hổng.

Phạm vi là kiểm tra phiên bản và advisory, không phải rà soát lại toàn bộ mã nguồn. Chưa quét OS/OpenSSL/system packages trong image production bằng Trivy/Grype, chưa xác minh digest base image và phiên bản runtime đang chạy trên Render. Kết quả audit không bảo đảm không có lỗ hổng chưa công bố. Phiên bản latest dưới đây là ứng viên cập nhật, chưa qua dependency resolution hoặc test tương thích của dự án.

## Phát hiện và thứ tự đề xuất

### 01 — Thấp: cập nhật tự động mới bao phủ GitHub Actions

Bằng chứng: `.github/dependabot.yml:3` chỉ khai báo `package-ecosystem: github-actions`. Chưa cấu hình lịch npm, uv hay Docker. CI đã có npm audit và pip-audit (`.github/workflows/checks.yml:24`, `:42`), nhưng chỉ chạy khi workflow được kích hoạt.

Đề xuất thêm kiểm tra định kỳ và cập nhật có kiểm soát cho frontend, backend, base image. Việc kiểm tra Dependabot security updates trong GitHub Settings nằm ngoài phạm vi đọc file này.

### 02 — Thông tin: có cập nhật thư viện và công cụ

Nguồn phiên bản thực dùng là `frontend/package-lock.json`, `backend/uv.lock`; không dùng số tối thiểu trong manifest làm phiên bản cài đặt. Vite `8.3.8`, ESLint `10.15.0`, Preact `11.2.0` và cryptography `50.0.2` hiện đã khớp latest.

Thứ tự thực hiện khi nâng cấp:

1. Patch và công cụ nhỏ: uv 0.13.9, React/React DOM 19.3.1, Vitest 5.1.1, Alembic 1.20.1, python-multipart 0.0.34, SQLAlchemy 2.1.9 cùng các package tương thích do resolver chọn. Certifi có bản mới nhưng audit hiện không báo advisory.
2. Backend framework: nâng FastAPI/Starlette/Pydantic theo một bộ dependency được resolver chấp nhận; không ép riêng `pydantic-core` vì phải khớp Pydantic. Kiểm tra schema/OpenAPI, lỗi validation, multipart, middleware và timeout/PEM worker.
3. Frontend tooling: Playwright 1.65.1 rồi cài browser tương ứng. TypeScript 7, jsdom 31 và jest-dom 8 là các nâng cấp major, cần đọc migration notes và xử lý trong nhóm riêng.
4. GitHub Actions: xem release notes, yêu cầu runner và thay đổi input/output; tiếp tục pin bằng SHA commit đã xác minh. Không thay SHA bằng tag nổi.
5. Runtime: giữ patch mới nhất trên Node 22/Python 3.12 hiện tại, sau đó lên kế hoạch chuyển nhánh riêng. Python hiện bị ràng buộc `>=3.12,<3.13` (`backend/pyproject.toml:5`), nên đổi sang 3.14/3.15 cần sửa ràng buộc và kiểm thử đầy đủ.

Sau cập nhật: lint/typecheck, unit test frontend/backend, test deploy tools, build public image và Playwright với API thật; staging đạt rồi mới promote cùng digest sang production theo `docs/DEPLOYMENT.md`.

## Frontend — dependency trực tiếp

Frontend dùng Preact qua `@preact/preset-vite` (`frontend/vite.config.ts:2`); React/React DOM cũng có trong manifest, không suy diễn mọi package đó đều được ship vào browser.

| Package | Locked | Latest stable | Nhóm |
|---|---|---|---|
| [preact](https://www.npmjs.com/package/preact) | 11.2.0 | 11.2.0 | runtime/compat |
| [react](https://www.npmjs.com/package/react) | 19.3.0 | 19.3.1 | runtime/compat |
| [react-dom](https://www.npmjs.com/package/react-dom) | 19.3.0 | 19.3.1 | runtime/compat |
| [@eslint/js](https://www.npmjs.com/package/@eslint/js) | 10.0.1 | 10.0.1 | dev/test/build |
| [@playwright/test](https://www.npmjs.com/package/@playwright/test) | 1.63.0 | 1.65.1 | dev/test/build |
| [@preact/preset-vite](https://www.npmjs.com/package/@preact/preset-vite) | 2.10.6 | 2.10.6 | dev/test/build |
| [@testing-library/jest-dom](https://www.npmjs.com/package/@testing-library/jest-dom) | 7.0.1 | 8.0.0 | dev/test/build |
| [@testing-library/react](https://www.npmjs.com/package/@testing-library/react) | 16.3.3 | 16.3.3 | dev/test/build |
| [@testing-library/user-event](https://www.npmjs.com/package/@testing-library/user-event) | 14.6.7 | 14.6.13 | dev/test/build |
| [@types/react](https://www.npmjs.com/package/@types/react) | 19.3.0 | 19.3.0 | dev/test/build |
| [@types/react-dom](https://www.npmjs.com/package/@types/react-dom) | 19.3.0 | 19.3.0 | dev/test/build |
| [eslint](https://www.npmjs.com/package/eslint) | 10.15.0 | 10.15.0 | dev/test/build |
| [eslint-plugin-react-hooks](https://www.npmjs.com/package/eslint-plugin-react-hooks) | 7.1.1 | 7.1.1 | dev/test/build |
| [eslint-plugin-react-refresh](https://www.npmjs.com/package/eslint-plugin-react-refresh) | 0.5.7 | 0.5.8 | dev/test/build |
| [globals](https://www.npmjs.com/package/globals) | 17.12.0 | 17.14.0 | dev/test/build |
| [jsdom](https://www.npmjs.com/package/jsdom) | 29.1.1 | 31.0.1 | dev/test/build |
| [prettier](https://www.npmjs.com/package/prettier) | 3.9.7 | 3.10.1 | dev/test/build |
| [typescript](https://www.npmjs.com/package/typescript) | 6.0.3 | 7.0.2 | dev/test/build |
| [typescript-eslint](https://www.npmjs.com/package/typescript-eslint) | 8.73.0 | 8.73.0 | dev/test/build |
| [vite](https://www.npmjs.com/package/vite) | 8.3.8 | 8.3.8 | dev/test/build |
| [vitest](https://www.npmjs.com/package/vitest) | 5.1.0 | 5.1.1 | dev/test/build |

## Python — toàn bộ lockfile

Nhóm runtime được tính theo dependency graph gốc, bao gồm dependency điều kiện cho nền tảng khác; `--no-dev` trong Dockerfile gốc loại dev khỏi production.

| Package | Locked | Latest stable | Nhóm |
|---|---|---|---|
| [aiosqlite](https://pypi.org/project/aiosqlite/) | 0.22.1 | 0.22.1 | runtime |
| [alembic](https://pypi.org/project/alembic/) | 1.20.0 | 1.20.1 | runtime |
| [annotated-doc](https://pypi.org/project/annotated-doc/) | 0.0.5 | 0.0.7 | runtime |
| [annotated-types](https://pypi.org/project/annotated-types/) | 0.8.0 | 0.8.0 | runtime |
| [anyio](https://pypi.org/project/anyio/) | 4.15.1 | 4.16.0 | runtime |
| [asyncpg](https://pypi.org/project/asyncpg/) | 0.31.0 | 0.32.0 | runtime |
| [certifi](https://pypi.org/project/certifi/) | 2026.10.23 | 2026.11.20 | dev/test |
| [cffi](https://pypi.org/project/cffi/) | 2.1.1 | 2.1.1 | runtime |
| [click](https://pypi.org/project/click/) | 8.5.0 | 8.5.1 | runtime |
| [colorama](https://pypi.org/project/colorama/) | 0.4.6 | 0.4.6 | dev/test |
| [coverage](https://pypi.org/project/coverage/) | 7.16.1 | 7.17.4 | dev/test |
| [cryptography](https://pypi.org/project/cryptography/) | 50.0.2 | 50.0.2 | runtime |
| [fastapi](https://pypi.org/project/fastapi/) | 0.141.1 | 0.165.0 | runtime |
| [greenlet](https://pypi.org/project/greenlet/) | 3.5.6 | 3.5.6 | dev/test |
| [h11](https://pypi.org/project/h11/) | 0.16.0 | 0.16.0 | runtime |
| [httpcore](https://pypi.org/project/httpcore/) | 1.0.9 | 1.0.9 | dev/test |
| [httptools](https://pypi.org/project/httptools/) | 0.8.0 | 0.9.0 | dev/test |
| [httpx](https://pypi.org/project/httpx/) | 0.28.1 | 0.28.1 | dev/test |
| [idna](https://pypi.org/project/idna/) | 3.19 | 3.20 | runtime |
| [iniconfig](https://pypi.org/project/iniconfig/) | 2.3.0 | 2.3.1 | dev/test |
| [mako](https://pypi.org/project/mako/) | 1.4.3 | 1.4.3 | runtime |
| [markupsafe](https://pypi.org/project/markupsafe/) | 3.0.3 | 3.0.4 | runtime |
| [packaging](https://pypi.org/project/packaging/) | 26.3 | 26.3 | dev/test |
| [pluggy](https://pypi.org/project/pluggy/) | 1.6.0 | 1.7.0 | dev/test |
| [pycparser](https://pypi.org/project/pycparser/) | 3.0 | 3.12 | runtime |
| [pydantic](https://pypi.org/project/pydantic/) | 2.13.5 | 2.14.4 | runtime |
| [pydantic-core](https://pypi.org/project/pydantic-core/) | 2.46.5 | 2.50.5 | runtime |
| [pygments](https://pypi.org/project/pygments/) | 2.21.0 | 2.21.0 | dev/test |
| [pytest](https://pypi.org/project/pytest/) | 9.1.1 | 9.2.0 | dev/test |
| [pytest-cov](https://pypi.org/project/pytest-cov/) | 7.1.0 | 7.1.0 | dev/test |
| [python-dotenv](https://pypi.org/project/python-dotenv/) | 1.2.3 | 1.2.4 | dev/test |
| [python-multipart](https://pypi.org/project/python-multipart/) | 0.0.32 | 0.0.34 | runtime |
| [pyyaml](https://pypi.org/project/pyyaml/) | 6.0.3 | 6.0.4 | dev/test |
| [ruff](https://pypi.org/project/ruff/) | 0.16.7 | 0.17.6 | dev/test |
| [sqlalchemy](https://pypi.org/project/sqlalchemy/) | 2.1.1 | 2.1.9 | runtime |
| [starlette](https://pypi.org/project/starlette/) | 1.6.0 | 1.10.0 | runtime |
| [typing-extensions](https://pypi.org/project/typing-extensions/) | 4.16.0 | 4.16.0 | runtime |
| [typing-inspection](https://pypi.org/project/typing-inspection/) | 0.4.4 | 0.4.5 | runtime |
| [uvicorn](https://pypi.org/project/uvicorn/) | 0.53.0 | 0.54.0 | runtime |
| [uvloop](https://pypi.org/project/uvloop/) | 0.22.1 | 0.23.0 | dev/test |
| [watchfiles](https://pypi.org/project/watchfiles/) | 1.2.0 | 1.3.0 | dev/test |
| [websockets](https://pypi.org/project/websockets/) | 17.1 | 17.4 | dev/test |

## Runtime và phần mềm

| Thành phần | Cấu hình / đo local | Bản đối chiếu | Đánh giá |
|---|---|---|---|
| Node.js | Docker/CI nhánh 22; local 22.23.5 | 22.23.5; 24.22.3; 26.13.1 | Local mới nhất nhánh 22; nhánh 22 vẫn LTS |
| npm | Local 12.2.3 | 12.2.3 | Đã khớp latest; npm trong image/CI có thể khác |
| Python | Docker/CI nhánh 3.12; backend venv và container local 3.12.16 | 3.12.16; Python.org ghi 3.15 là nhánh tính năng mới | Khớp patch 3.12; chỉ còn cập nhật bảo mật đến 10/2028 |
| uv | Public Docker/CI 0.13.7 | 0.13.9 | Có patch mới |
| pip-audit | CI 2.10.1 | 2.10.1 | Đã khớp latest |
| Docker Engine | Local 29.10.0 | Moby docker-v29.10.0 | Khớp release upstream; chưa audit Docker Desktop |
| Docker Compose | Local 5.7.1 | 5.8.0 | Công cụ local, không chạy trong image production |
| Debian base | Public `bookworm-slim` | Chưa xác minh digest/package OS mới nhất | Tag không chứng minh image đã chứa mọi bản vá |

Dockerfile public: `Dockerfile:1`, `:9`, `:10`, `:17`. Các tag base image hiện chưa pin digest; cần rebuild/pull và scan image để xác minh bản vá thực tế, không chỉ đọc tag.

Dockerfile tách riêng là đường phục hồi/local theo tài liệu, không phải bản public: `backend/Dockerfile:5` còn uv **0.12.15**, `frontend/Dockerfile:22` còn nginx-unprivileged **1.27-alpine**. Không gán các phiên bản này cho production, và không coi chúng đã được audit OS trong lượt này.

Nguồn: [Node release schedule](https://nodejs.org/en/about/previous-releases), [Node distribution index](https://nodejs.org/dist/index.json), [Python 3.12.16](https://www.python.org/downloads/release/python-31216/), [uv 0.13.9](https://github.com/astral-sh/uv/releases/tag/0.13.9), [Moby releases](https://github.com/moby/moby/releases), [Compose releases](https://github.com/docker/compose/releases), [npm registry](https://registry.npmjs.org/npm/latest).

## GitHub Actions

Đang pin SHA; nhánh phiên bản bên dưới lấy từ chú thích cạnh SHA, chưa đánh giá mọi breaking change hay chứng minh SHA là bản patch mới nhất trong nhánh cũ. Vị trí: `.github/workflows/checks.yml:17`, `:18`, `:35`; `.github/workflows/staging.yml:35`; `.github/workflows/production.yml:51`.

| Action | Nhánh đang ghi | Latest stable |
|---|---|---|
| [actions/checkout](https://github.com/actions/checkout/releases/tag/v7.0.1) | v5 | v7.0.1 |
| [actions/setup-node](https://github.com/actions/setup-node/releases/tag/v7.1.0) | v6 | v7.1.0 |
| [actions/upload-artifact](https://github.com/actions/upload-artifact/releases/tag/v7.0.2) | v6 | v7.0.2 |
| [astral-sh/setup-uv](https://github.com/astral-sh/setup-uv/releases/tag/v10.4.0) | v6 | v10.4.0 |
| [docker/setup-buildx-action](https://github.com/docker/setup-buildx-action/releases/tag/v4.4.1) | v3 | v4.4.1 |
| [docker/login-action](https://github.com/docker/login-action/releases/tag/v4.8.0) | v3 | v4.8.0 |
| [docker/build-push-action](https://github.com/docker/build-push-action/releases/tag/v7.4.0) | v6 | v7.4.0 |
