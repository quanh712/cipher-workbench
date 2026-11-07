# Scope hiện hành — Caesar

Đối chiếu source local ngày 07/11/2026. Đây là phạm vi FE/BE hiện có; không phải
biên bản nghiệm thu một deployment. Áp dụng cùng [phạm vi chung](COMMON_SCOPE.md).
Scope gốc/spec theo từng đợt vẫn được giữ trong [mục lục](README.md).

## 1. Mục tiêu và quy tắc thuật toán

Dịch vòng riêng A–Z/a–z theo k mod 26; giải mã dùng -k. Giữ nguyên dấu, Unicode ngoài ASCII, số, khoảng trắng và xuống dòng.

## 2. Phạm vi frontend

Nhập văn bản hoặc file .txt, khóa nguyên; chọn mã hóa/giải mã; tạo ví dụ, bảng dịch A–Z, phân tích ký tự, sao chép và tải kết quả. FE kiểm khóa trong miền số nguyên an toàn của JavaScript; BE xử lý token nguyên lớn theo modulo.

Các trạng thái bắt buộc: chưa nhập, không hợp lệ, đang xử lý, thành công và lỗi.
Chỉ hiển thị kết quả thực khi API hoàn tất; xử lý hủy/thay đổi dữ liệu theo lifecycle
của feature. Theme sáng/tối, bàn phím và màn hình 375 px thuộc tiêu chí nghiệm thu.

## 3. Phạm vi backend và API

```text
POST /api/caesar/encrypt
POST /api/caesar/decrypt
POST /api/caesar/file
```

JSON nhận text, key. key là JSON integer hoặc chuỗi thập phân không âm chuẩn; multipart nhận file, key, action, response_mode. Khóa multipart được trim và tối đa 32 ký tự. Thành công text/content trả {success:true,result:string}; file trả attachment.

### Ví dụ API kiểm chứng

`POST /api/caesar/encrypt` với body:

```json
{
  "text": "Hello World",
  "key": 3
}
```

Các trường cần đối chiếu trong response HTTP 200 (không phải toàn bộ response):

```json
{
  "result": "Khoor Zruog"
}
```

## 4. Lỗi, file và dữ liệu

Áp dụng các giới hạn chung và ngoại lệ riêng ở mục 3. BE giữ quyền quyết định
validation cuối cùng; FE hiển thị message trả về và không thay bằng kết quả demo.
Schema/handler quyết định chi tiết HTTP status, code, field hoặc details theo
[phạm vi chung](COMMON_SCOPE.md#3-api-và-lỗi). Không lưu input/khóa vào log ứng dụng.

## 5. Ngoài phạm vi

Không hỗ trợ alphabet tùy chỉnh, phá mã hoặc đồng nhất chữ có dấu với chữ ASCII.

## 6. Tiêu chí nghiệm thu

- Hello World / key=3 → Khoor Zruog; giải mã phải trả đúng Hello World. Thử khóa âm dạng JSON integer, modulo lớn, khóa sai kiểu và whitespace-only.
- Đối chiếu encrypt/decrypt hoặc thao tác tương ứng với API thật, không chỉ mock UI.
- Sai dữ liệu phải báo lỗi xác định; không hiển thị kết quả trước đó như kết quả mới.
- Khi lưu/tải file hoặc sao chép được UI hỗ trợ, nội dung phải khớp snapshot kết quả.
- Lịch sử tuân theo phạm vi chung và chính sách riêng của thuật toán, không lộ private key.

## 7. Nguồn triển khai và kiểm thử

- [backend/app/core/caesar.py](../../backend/app/core/caesar.py)
- [backend/app/api/routes_text.py](../../backend/app/api/routes_text.py)
- [backend/app/api/routes_file.py](../../backend/app/api/routes_file.py)
- [backend/app/api/schemas.py](../../backend/app/api/schemas.py)
- [backend/tests/unit/test_caesar.py](../../backend/tests/unit/test_caesar.py)
- [backend/tests/integration/test_text_endpoints.py](../../backend/tests/integration/test_text_endpoints.py)
- [frontend/src/features/caesar/components/CaesarWorkspace.tsx](../../frontend/src/features/caesar/components/CaesarWorkspace.tsx)
- [frontend/src/app/App.test.tsx](../../frontend/src/app/App.test.tsx)
