# Phạm vi chung của 9 thuật toán

Đối chiếu source local ngày 07/11/2026. Các scope `*_CURRENT_SCOPE.md` mô tả khả
năng hiện có ở FE và BE; tiêu chí nghiệm thu là điều cần kiểm khi phát hành, không
phải tuyên bố đã chạy toàn bộ kiểm thử cho tài liệu này.

## 1. Sản phẩm và ranh giới

Cipher Workbench là công cụ học tập cho Caesar, Vigenère, Playfair, Affine, Hệ mã
hàng, Hill, DES, RSA và Diffie–Hellman. API quyết định kết quả tính toán; FE quản lý
input, snapshot, validation hỗ trợ và phần giải thích. Phân tích minh họa ở FE
không thay thế response BE. Không có tài khoản, quản lý tổ chức hoặc kết nối trao
đổi khóa giữa hai người dùng thật trong phạm vi hiện tại.

Runtime: React/TypeScript ở `frontend/`, FastAPI/Python ở `backend/`. Public image
phục vụ UI và `/api/*` cùng origin; local Docker cổng 18081 theo
[hướng dẫn local](../LOCAL_MIGRATION.md). Hill, DES, RSA và DH có feature flag;
Docker public bật cả bốn. Cờ demo DES tách riêng khỏi API thật.

## 2. Luồng frontend và dữ liệu file

- Lỗi tải giao diện từng thuật toán/lịch sử có thông báo và nút tải lại trang, giữ điều hướng và bản nháp các công cụ khác; tải lại trang sẽ mất bản nháp trong bộ nhớ.
- Chọn thuật toán, nhập văn bản/khóa hoặc file nếu feature hỗ trợ, chọn thao tác,
  kiểm tra lỗi, gửi API và hiển thị kết quả thành công. Điền ví dụ không tự submit.
- Phân biệt neutral/invalid/busy/success/error; request thất bại không tạo kết quả
  giả. Thay draft phải vô hiệu hoặc xóa snapshot không còn khớp. Response muộn
  sau hủy/reset không được ghi đè trạng thái mới.
- Hỗ trợ bàn phím, focus, nhãn tiếng Việt, theme sáng/tối và màn hình 375 px;
  bảng dài có vùng cuộn cục bộ. Chuyển Công cụ/Lịch sử giữ bố cục ổn định.
- Nút copy/download/clear chỉ hoạt động khi có dữ liệu phù hợp. Thông báo lỗi
  clipboard, đọc file hoặc storage không được biến thành kết quả thành công giả.
- Caesar, Vigenère, Playfair, Affine và Columnar dùng JSON cho text, multipart
  cho file. File `.txt` không phân biệt hoa/thường, UTF-8 nghiêm ngặt, không rỗng,
  tối đa 5.242.880 byte (5 MiB). BOM đầu file được xử lý theo contract
  [file_processing.py](../../backend/app/services/file_processing.py).
- Preview multipart dùng `response_mode=content`; download dùng `response_mode=file`,
  gọi BE để tạo attachment. Tên file dùng `.encrypted.txt` / `.decrypted.txt`.
  Việc chuẩn hóa/lọc padding của từng thuật toán có thể làm đổi nội dung logic.
- Hill đọc `.txt` tại FE rồi gửi JSON; DES có multipart riêng; file RSA và DH là
  các ngoại lệ được mô tả ở scope tương ứng. Không áp giới hạn 5 MiB chung lên
  mọi loại request hoặc suy ra một endpoint `/file` cho tất cả thuật toán.

## 3. API và lỗi

- API được khai báo ở [main.py](../../backend/app/main.py); schema và route của
  từng thuật toán là nguồn để đối chiếu tên field, kiểu, thứ tự validation và response.
- Caesar/Vigenère/Affine/Columnar và Playfair encrypt thường trả
  `{success:true,result:string}`; Playfair decrypt có thêm `padding`.
  Hill/DES/RSA/DH có metadata và response model riêng.
- Lỗi chung có `success:false,message`. Hill bổ sung `code,details`; RSA/DH
  có `code,field`. Không ép mọi thuật toán dùng một envelope hoặc message giống nhau.
- 413 cho giới hạn dung lượng ở nhánh áp dụng; 415 cho loại file/media/encoding
  ở nhánh áp dụng; validation nghiệp vụ thường là 422, lỗi hệ thống 500.
  Chi tiết theo [handlers](../../backend/app/errors/handlers.py),
  [messages](../../backend/app/errors/messages.py) và schema tương ứng.
- Guard tổng trong ứng dụng giới hạn request 64 MiB. Public mode thêm guard
  8 MiB/request, 300 API request/phút toàn process và tối đa 4 request hoạt động;
  health được miễn guard public. Rate/busy trả 429/503 và `Retry-After`.
  Đây là ngân sách toàn process, không phải quota riêng cho từng người dùng.
- Các giới hạn ký tự, byte UTF-8, block, key và nội dung file là các giới hạn khác
  nhau; cần kiểm đúng đơn vị và cả biên ngay dưới/đúng/ngay trên giới hạn.

## 4. Lịch sử và quyền riêng tư kỹ thuật

- Public mode không mở server history API và không dùng database. Lịch sử ứng
  dụng nằm trong `localStorage` của origin hiện tại, TTL 1 giờ, tối đa 100 mục và
  256.000 byte JSON; trang lịch sử phân trang 20 mục. Xóa site data làm mất lịch sử.
- Chỉ giữ trường được bộ ghi lịch sử cho phép; không giữ private key, passphrase,
  toàn bộ nội dung file hoặc tham số/trace DH. Chữ ký RSA raw có thể giữ dữ liệu
  công khai cần để xem và kiểm lại theo schema lịch sử.
- Storage bị chặn/đầy phải cảnh báo; kết quả hiện tại vẫn có thể dùng. Không tự
  nhập lịch sử SQLite cũ vào trình duyệt.
- BE ngoài public mode vẫn hỗ trợ SQLite và lịch sử hồ sơ trình duyệt qua cookie;
  TTL hiện tại 5 giờ, quota 50 MiB/hồ sơ và 500 MiB/toàn hệ thống. Đây là chế độ
  riêng, không được mô tả như hành vi production public.
- Nguồn: [browserHistory](../../frontend/src/features/history/services/browserHistory.ts),
  [bộ ghi FE](../../frontend/src/shared/services/browserHistoryFetch.ts),
  [config BE](../../backend/app/config.py), [runbook](../backend/sqlite-history-runbook.md).

## 5. Nghiệm thu và quản lý thay đổi

Mỗi scope phải có mục tiêu/quy tắc thuật toán, phạm vi FE, API BE, giới hạn/lỗi,
ngoài phạm vi, vector kiểm chứng và liên kết source/test. Kiểm core, API thật và
UI là các tầng khác nhau; mock pass không chứng minh một deployment đã cập nhật.

Trước phát hành: lint/typecheck/build, unit/integration, browser test với API
thật, desktop/mobile, sáng/tối, copy/download/file nếu hỗ trợ, hủy/response muộn
và lịch sử. Staging/production theo [quy trình deploy](../DEPLOYMENT.md).

Source/test và các quyết định được chấp nhận quyết định hành vi; khi thay đổi code,
cập nhật scope hiện hành và API contract cùng đợt. Scope gốc, prototype và các
đợt rollout cũ được giữ để truy vết, không mặc định là trạng thái hiện tại.

## 6. Nguồn chung

- [Đăng ký thuật toán/feature flags](../../frontend/src/shared/config/cipherAlgorithms.ts).
- [Điều phối UI](../../frontend/src/app/App.tsx).
- [Public guard](../../backend/app/api/public_guard.py).
- [Kiểm thử public runtime](../../backend/tests/integration/test_public_runtime.py).
- [Browser acceptance public](../../frontend/e2e/public-release.spec.ts).
- [API consumer guide](../contracts/frontend-integration.md).
