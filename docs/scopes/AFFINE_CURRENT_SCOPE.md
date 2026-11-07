# Scope hiện hành — Affine

Đối chiếu source local ngày 07/11/2026. Đây là phạm vi FE/BE hiện có; không phải
biên bản nghiệm thu một deployment. Áp dụng cùng [phạm vi chung](COMMON_SCOPE.md).
Scope gốc/spec theo từng đợt vẫn được giữ trong [mục lục](README.md).

## 1. Mục tiêu và quy tắc thuật toán

E(x)=(a·x+b) mod 26; D(y)=a⁻¹·(y-b) mod 26. Chuẩn hóa a,b bằng modulo dương. a phải nguyên tố cùng nhau với 26; không tự sửa a sai. Giữ nguyên hoa/thường và ký tự ngoài ASCII.

## 2. Phạm vi frontend

Văn bản/file, hai trường a,b; hiển thị khóa chuẩn hóa, gcd, nghịch đảo và bảng ánh xạ; khóa action khi validation sai hoặc request đang chạy. Preview và download file gọi BE riêng.

Các trạng thái bắt buộc: chưa nhập, không hợp lệ, đang xử lý, thành công và lỗi.
Chỉ hiển thị kết quả thực khi API hoàn tất; xử lý hủy/thay đổi dữ liệu theo lifecycle
của feature. Theme sáng/tối, bàn phím và màn hình 375 px thuộc tiêu chí nghiệm thu.

## 3. Phạm vi backend và API

```text
POST /api/affine/encrypt
POST /api/affine/decrypt
POST /api/affine/file
```

JSON nhận text,a,b; a/b phải là token JSON integer, không nhận boolean/float/chuỗi số. Multipart nhận file,a,b,action,response_mode; mỗi khóa tối đa 32 ký tự sau trim. Thứ tự validation text→a→b, gồm kiểm khả nghịch a. Thành công text/content trả success/result.

### Ví dụ API kiểm chứng

`POST /api/affine/encrypt` với body:

```json
{
  "text": "HELLO",
  "a": 5,
  "b": 8
}
```

Các trường cần đối chiếu trong response HTTP 200 (không phải toàn bộ response):

```json
{
  "result": "RCLLA"
}
```

## 4. Lỗi, file và dữ liệu

Áp dụng các giới hạn chung và ngoại lệ riêng ở mục 3. BE giữ quyền quyết định
validation cuối cùng; FE hiển thị message trả về và không thay bằng kết quả demo.
Schema/handler quyết định chi tiết HTTP status, code, field hoặc details theo
[phạm vi chung](COMMON_SCOPE.md#3-api-và-lỗi). Không lưu input/khóa vào log ứng dụng.

## 5. Ngoài phạm vi

Không brute-force, không đổi modulus/alphabet, không nhúng demo HTML vào runtime.

## 6. Tiêu chí nghiệm thu

- HELLO / a=5,b=8 → RCLLA. (-21,-18) tương đương (5,8); từ chối a=0,2,13,26. Kiểm bảo toàn dấu/emoji và không chấp nhận JSON a="5".
- Đối chiếu encrypt/decrypt hoặc thao tác tương ứng với API thật, không chỉ mock UI.
- Sai dữ liệu phải báo lỗi xác định; không hiển thị kết quả trước đó như kết quả mới.
- Khi lưu/tải file hoặc sao chép được UI hỗ trợ, nội dung phải khớp snapshot kết quả.
- Lịch sử tuân theo phạm vi chung và chính sách riêng của thuật toán, không lộ private key.

## 7. Nguồn triển khai và kiểm thử

- [backend/app/core/affine.py](../../backend/app/core/affine.py)
- [backend/app/api/routes_affine_text.py](../../backend/app/api/routes_affine_text.py)
- [backend/app/api/routes_affine_file.py](../../backend/app/api/routes_affine_file.py)
- [backend/app/api/schemas.py](../../backend/app/api/schemas.py)
- [backend/tests/unit/test_affine.py](../../backend/tests/unit/test_affine.py)
- [backend/tests/integration/test_affine_text_endpoints.py](../../backend/tests/integration/test_affine_text_endpoints.py)
- [backend/tests/integration/test_affine_file_endpoint.py](../../backend/tests/integration/test_affine_file_endpoint.py)
- [frontend/src/features/affine/components/AffineWorkspace.tsx](../../frontend/src/features/affine/components/AffineWorkspace.tsx)
