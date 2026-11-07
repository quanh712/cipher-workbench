# Scope hiện hành — Playfair

Đối chiếu source local ngày 07/11/2026. Đây là phạm vi FE/BE hiện có; không phải
biên bản nghiệm thu một deployment. Áp dụng cùng [phạm vi chung](COMMON_SCOPE.md).
Scope gốc/spec theo từng đợt vẫn được giữ trong [mục lục](README.md).

## 1. Mục tiêu và quy tắc thuật toán

Ma trận 5×5, gộp J→I, chuẩn hóa chữ ASCII sang uppercase và bỏ ký tự khác. Khóa giữ lần xuất hiện đầu; plaintext chia cặp, chèn X, dùng Q khi chữ cần tách là X. Quy tắc cùng hàng/cột/hình chữ nhật.

## 2. Phạm vi frontend

Văn bản/file, khóa, ma trận và phân tích cặp; hiển thị bản giải mã thô và tùy chọn lọc filler theo metadata BE. Cảnh báo bộ lọc có thể bỏ nhầm X/Q thật; kết quả chuẩn hóa không khôi phục nguyên văn Unicode hoặc định dạng gốc.

Các trạng thái bắt buộc: chưa nhập, không hợp lệ, đang xử lý, thành công và lỗi.
Chỉ hiển thị kết quả thực khi API hoàn tất; xử lý hủy/thay đổi dữ liệu theo lifecycle
của feature. Theme sáng/tối, bàn phím và màn hình 375 px thuộc tiêu chí nghiệm thu.

## 3. Phạm vi backend và API

```text
POST /api/playfair/encrypt
POST /api/playfair/decrypt
POST /api/playfair/file
```

JSON nhận text, key. Ciphertext sau chuẩn hóa phải có độ dài chẵn và không có cặp hai chữ giống nhau. Encrypt trả success/result; decrypt trả thêm padding. File có strip_padding=true|false; mặc định false, chỉ phù hợp luồng giải mã.

### Ví dụ API kiểm chứng

`POST /api/playfair/encrypt` với body:

```json
{
  "text": "HELLO",
  "key": "MONARCHY"
}
```

Các trường cần đối chiếu trong response HTTP 200 (không phải toàn bộ response):

```json
{
  "result": "CFSUPM"
}
```

## 4. Lỗi, file và dữ liệu

Áp dụng các giới hạn chung và ngoại lệ riêng ở mục 3. BE giữ quyền quyết định
validation cuối cùng; FE hiển thị message trả về và không thay bằng kết quả demo.
Schema/handler quyết định chi tiết HTTP status, code, field hoặc details theo
[phạm vi chung](COMMON_SCOPE.md#3-api-và-lỗi). Không lưu input/khóa vào log ứng dụng.

## 5. Ngoài phạm vi

Không có bảng 6×6, alphabet tùy chỉnh hoặc cam kết tự động khôi phục filler chính xác tuyệt đối.

## 6. Tiêu chí nghiệm thu

- HELLO / MONARCHY → CFSUPM; giải mã thô phải là HELXLO. Kiểm cặp XX, J/I, độ dài lẻ, không có chữ ASCII và lọc filler với dữ liệu X/Q thật.
- Đối chiếu encrypt/decrypt hoặc thao tác tương ứng với API thật, không chỉ mock UI.
- Sai dữ liệu phải báo lỗi xác định; không hiển thị kết quả trước đó như kết quả mới.
- Khi lưu/tải file hoặc sao chép được UI hỗ trợ, nội dung phải khớp snapshot kết quả.
- Lịch sử tuân theo phạm vi chung và chính sách riêng của thuật toán, không lộ private key.

## 7. Nguồn triển khai và kiểm thử

- [backend/app/core/playfair.py](../../backend/app/core/playfair.py)
- [backend/app/api/routes_additional_text.py](../../backend/app/api/routes_additional_text.py)
- [backend/app/api/routes_additional_file.py](../../backend/app/api/routes_additional_file.py)
- [backend/tests/unit/test_playfair.py](../../backend/tests/unit/test_playfair.py)
- [backend/tests/integration/test_additional_file_endpoints.py](../../backend/tests/integration/test_additional_file_endpoints.py)
- [frontend/src/features/playfair/components/PlayfairWorkspace.tsx](../../frontend/src/features/playfair/components/PlayfairWorkspace.tsx)
- [frontend/src/shared/utils/padding.test.ts](../../frontend/src/shared/utils/padding.test.ts)
