# Cipher Workbench Frontend

Frontend đang phát triển tại `cipher-workbench/frontend/`, thuộc monorepo cùng
[`backend/`](../backend/). Mọi lệnh Docker và phát hành chạy từ gốc monorepo;
xem [README chính](../README.md) và [quy trình deploy](../docs/DEPLOYMENT.md).
Hai checkout `cipher-workbench-fe` và `cipher-workbench-be` cũ giữ để phục hồi.

Ứng dụng web phục vụ học tập và thực hành mật mã: mã hóa, giải mã, trao đổi khóa,
ký số và xem các bước xử lý. Frontend dùng React, TypeScript và Vite, kết nối
Backend thật qua API cùng origin.

## Tính năng

- Thực hành chín thuật toán trong cùng một workspace.
- Nhập văn bản hoặc file `.txt`, xem trước, sao chép và tải kết quả.
- Xem phân tích và các bước tính theo khả năng của từng thuật toán.
- Sinh hoặc nhập khóa RSA, mã hóa/giải mã số và văn bản, ký/kiểm tra chữ ký số nguyên.
- Kiểm tra hoặc sinh tham số Diffie–Hellman, tạo cặp khóa, tính bí mật chung,
  trao đổi khóa A/B và thực hành Caesar bằng khóa chung.
- Xem lịch sử thao tác, lọc theo thuật toán và thao tác tương ứng, tải thêm và làm mới.
  Lịch sử chữ ký RSA hỗ trợ xem chi tiết, dùng lại để kiểm tra và xóa bản ghi.
- Giao diện responsive, hỗ trợ bàn phím, screen reader và giao diện sáng/tối.

| Thuật toán     | Khả năng chính                                                | File `.txt` |
| -------------- | ------------------------------------------------------------- | ----------- |
| Caesar         | Mã hóa / giải mã                                              | Có          |
| Vigenère       | Mã hóa / giải mã                                              | Có          |
| Playfair       | Mã hóa / giải mã, đối chiếu ký tự đệm                         | Có          |
| Affine         | Mã hóa / giải mã với hai khóa `a`, `b`                        | Có          |
| Hệ mã hàng     | Mã hóa / giải mã bằng khóa hoán vị                            | Có          |
| Hill           | Khóa ma trận hoặc từ khóa, mã hóa / giải mã                   | Có          |
| DES            | Text/HEX, ECB/CBC, IV và phân tích vòng xử lý                 | Có          |
| RSA            | Sinh/nhập khóa, mã hóa / giải mã số và văn bản, ký / kiểm tra | Chưa hỗ trợ |
| Diffie–Hellman | Trao đổi khóa, tính bí mật chung, Caesar bằng khóa chung      | Qua Caesar  |

Hill, DES, RSA và Diffie–Hellman được bật bằng cờ cấu hình khi Backend đã hỗ trợ
API tương ứng. Kết quả xử lý runtime lấy từ Backend; dữ liệu mẫu chỉ giúp điền
đầu vào, không thay thế kết quả API.

## Chạy để phát triển

Yêu cầu Node.js 22, npm và backend FastAPI của monorepo. Từ `frontend/`:

```sh
npm ci
cp .env.example .env.local
npm run dev
```

Trong terminal khác, từ `backend/`:

```sh
uv sync --locked
PUBLIC_MODE=true uv run uvicorn app.main:app --host 127.0.0.1 --port 8000
```

Mở <http://localhost:5173>. Vite chuyển toàn bộ `/api` đến một backend qua
`BACKEND_DEV_URL`, mặc định `http://127.0.0.1:8000`. Nếu backend đang chạy bằng
Docker ở gốc monorepo, đặt `BACKEND_DEV_URL=http://127.0.0.1:18081` trong
`.env.local`, rồi khởi động lại Vite.

[`.env.example`](.env.example) bật public mode và các thuật toán như image
production. Các biến `VITE_*` được đọc khi chạy dev hoặc build; đổi env sau khi
build cần build lại. `VITE_ENABLE_DES_DEMO` mặc định tắt để dùng API thật.

## Chạy ứng dụng đầy đủ bằng Docker

Từ gốc monorepo:

```sh
docker compose up --build -d --wait
docker compose ps
```

Mở <http://127.0.0.1:18081>. Một container phục vụ cả React và FastAPI cùng origin.
Xem [hướng dẫn local và phục hồi](../docs/LOCAL_MIGRATION.md) cho đổi cổng, dừng
ứng dụng và dữ liệu SQLite cũ.

## Sử dụng và lịch sử

1. Chọn thuật toán và thao tác.
2. Nhập dữ liệu, khóa hoặc file `.txt` nếu được hỗ trợ.
3. Gửi xử lý, xem kết quả và tab **Phân tích**.
4. Sao chép, tải kết quả hoặc mở **Lịch sử thao tác**.

RSA cần thiết lập khóa trước khi mã hóa, giải mã hoặc ký số. Diffie–Hellman hỗ trợ
thiết lập tham số, trao đổi khóa A/B và dùng khóa chung cho bài thực hành Caesar.

Trong public mode, lịch sử lưu trong trình duyệt hiện tại, hết hạn sau một giờ;
không cần database hoặc API lịch sử trên server. Có thể lọc, làm mới và xóa lịch
sử. Nút xóa bị vô hiệu hóa khi không còn bản ghi hợp lệ, kể cả sau khi hết hạn.
Lịch sử không giữ private key hoặc nội dung file gốc đã tải lên. Local, staging
và production có lịch sử riêng theo origin. Xóa dữ liệu trang cũng xóa lịch sử.
Dữ liệu SQLite cũ không được tự nhập vào trình duyệt.

## Cấu trúc và logo

```text
src/app/       App shell, cấu hình runtime, CSS
src/features/  Component, hook, type và API adapter theo tính năng
src/shared/    UI, dịch vụ và tiện ích dùng chung
src/test/      Thiết lập kiểm thử
e2e/           Kịch bản Playwright
public/        Asset tĩnh được Vite đưa vào build
```

Logo đầu trang nằm ở [`CipherMark.tsx`](src/shared/components/CipherMark.tsx),
hiệu ứng trong [`styles.css`](src/app/styles.css). Logo tĩnh trên tab trình duyệt
là [`public/favicon.svg`](public/favicon.svg), được khai báo ở
[`index.html`](index.html).

## Kiểm thử và build

Từ `frontend/`:

```sh
npm run lint
npm run typecheck
npm test
npm run build
```

Browser test cho public runtime yêu cầu ứng dụng Docker đang chạy:

```sh
npx playwright install chromium
PLAYWRIGHT_BASE_URL=http://127.0.0.1:18081 npx playwright test --config playwright.public.config.ts
```

Có thể đặt `PLAYWRIGHT_CHANNEL=chrome` nếu dùng Chrome đã cài. Các config
integration cũ trong repository có thể yêu cầu stack SQLite riêng; chúng không
thay thế public release suite. Xem [`package.json`](package.json) cho các lệnh
kiểm thử theo thuật toán.

## Phát hành và tài liệu

Dùng [quy trình tại gốc monorepo](../docs/DEPLOYMENT.md): `dev` → `staging` →
`main`; production dùng lại digest image đã nghiệm thu trên staging.
Các recipe SQLite/Nginx trong [`deploy/`](deploy/), [`nginx/`](nginx/),
[deployment cũ](../docs/frontend/DEPLOYMENT.md) và [SQLite cũ](../docs/frontend/SQLITE_COMPOSE.md) phục vụ
tham khảo/phục hồi stack cũ.

- [Backend contract](../docs/frontend/BACKEND_CONTRACT.md)
- [Mục lục scope/spec tất cả thuật toán](../docs/scopes/README.md)
- [Spec nền tảng](../docs/scopes/PROJECT_SPEC.md)
- [RSA](../docs/scopes/RSA_SPEC.md) và [Diffie–Hellman](../docs/scopes/DIFFIE_HELLMAN_SPEC.md)

Ứng dụng phục vụ học tập. Thuật toán và mô phỏng không thay thế giao thức mật mã
production. File đầu vào tối đa 5 MiB; hỗ trợ tùy thuật toán. RSA UI hiện hỗ trợ
chữ ký số nguyên; Playfair/Hill có chuẩn hóa và xử lý ký tự đệm nên không đảm bảo
khôi phục nguyên văn.
