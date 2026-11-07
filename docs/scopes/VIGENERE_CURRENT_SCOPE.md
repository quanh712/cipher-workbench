# Scope hiện hành — Vigenère

Đối chiếu source local ngày 07/11/2026. Đây là phạm vi FE/BE hiện có; không phải
biên bản nghiệm thu một deployment. Áp dụng cùng [phạm vi chung](COMMON_SCOPE.md).
Scope gốc/spec theo từng đợt vẫn được giữ trong [mục lục](README.md).

## 1. Mục tiêu và quy tắc thuật toán

Vigenère khóa lặp trên A–Z/a–z. Chỉ tiến chỉ số khóa khi gặp chữ ASCII; giữ nguyên hoa/thường, Unicode khác, dấu câu và line break.

## 2. Phạm vi frontend

Văn bản/file, khóa chữ, mode, ví dụ và kết quả API; phân tích khóa lặp căn theo các chữ thực sự được biến đổi. Không tự tạo kết quả fallback.

Các trạng thái bắt buộc: chưa nhập, không hợp lệ, đang xử lý, thành công và lỗi.
Chỉ hiển thị kết quả thực khi API hoàn tất; xử lý hủy/thay đổi dữ liệu theo lifecycle
của feature. Theme sáng/tối, bàn phím và màn hình 375 px thuộc tiêu chí nghiệm thu.

## 3. Phạm vi backend và API

```text
POST /api/vigenere/encrypt
POST /api/vigenere/decrypt
POST /api/vigenere/file
```

JSON nhận text, key; key không rỗng và khớp [A-Za-z]+. Multipart nhận file, key, action, response_mode. Không dùng strip_padding của Playfair. Thành công text/content trả {success:true,result:string}.

### Ví dụ API kiểm chứng

`POST /api/vigenere/encrypt` với body:

```json
{
  "text": "ATTACKATDAWN",
  "key": "LEMON"
}
```

Các trường cần đối chiếu trong response HTTP 200 (không phải toàn bộ response):

```json
{
  "result": "LXFOPVEFRNHR"
}
```

## 4. Lỗi, file và dữ liệu

Áp dụng các giới hạn chung và ngoại lệ riêng ở mục 3. BE giữ quyền quyết định
validation cuối cùng; FE hiển thị message trả về và không thay bằng kết quả demo.
Schema/handler quyết định chi tiết HTTP status, code, field hoặc details theo
[phạm vi chung](COMMON_SCOPE.md#3-api-và-lỗi). Không lưu input/khóa vào log ứng dụng.

## 5. Ngoài phạm vi

Không có autokey, alphabet tùy chỉnh hoặc phân tích phá mã.

## 6. Tiêu chí nghiệm thu

- ATTACKATDAWN / LEMON → LXFOPVEFRNHR; round-trip giữ cả emoji, CR/LF và dấu câu. Chèn khoảng trắng không làm tiến khóa; từ chối khóa chứa số/ký tự ngoài ASCII.
- Đối chiếu encrypt/decrypt hoặc thao tác tương ứng với API thật, không chỉ mock UI.
- Sai dữ liệu phải báo lỗi xác định; không hiển thị kết quả trước đó như kết quả mới.
- Khi lưu/tải file hoặc sao chép được UI hỗ trợ, nội dung phải khớp snapshot kết quả.
- Lịch sử tuân theo phạm vi chung và chính sách riêng của thuật toán, không lộ private key.

## 7. Nguồn triển khai và kiểm thử

- [backend/app/core/vigenere.py](../../backend/app/core/vigenere.py)
- [backend/app/api/routes_additional_text.py](../../backend/app/api/routes_additional_text.py)
- [backend/app/api/routes_additional_file.py](../../backend/app/api/routes_additional_file.py)
- [backend/tests/unit/test_vigenere.py](../../backend/tests/unit/test_vigenere.py)
- [backend/tests/integration/test_additional_text_endpoints.py](../../backend/tests/integration/test_additional_text_endpoints.py)
- [frontend/src/features/vigenere/components/VigenereWorkspace.tsx](../../frontend/src/features/vigenere/components/VigenereWorkspace.tsx)
- [frontend/src/features/vigenere/utils/analysis.test.ts](../../frontend/src/features/vigenere/utils/analysis.test.ts)
