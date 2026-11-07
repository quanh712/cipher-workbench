# Scope hiện hành — DES

Đối chiếu source local ngày 07/11/2026. Đây là phạm vi FE/BE hiện có; không phải
biên bản nghiệm thu một deployment. Áp dụng cùng [phạm vi chung](COMMON_SCOPE.md).
Scope gốc/spec theo từng đợt vẫn được giữ trong [mục lục](README.md).

## 1. Mục tiêu và quy tắc thuật toán

DES 64-bit block, khóa biểu diễn 16 ký tự hex, 16 vòng Feistel; ECB/CBC. CBC cần IV 16 hex. Luồng text dùng UTF-8/PKCS#7; hex làm việc với block bytes theo contract, không tự áp quy tắc text lên hex.

## 2. Phạm vi frontend

Văn bản/hex hoặc file .txt; chọn ECB/CBC và IV; kết quả, warnings, copy/download; phân tích khối đầu bằng trace BE. Cờ VITE_ENABLE_DES bật API thật; VITE_ENABLE_DES_DEMO là demo tách biệt, không fallback khi API lỗi.

Các trạng thái bắt buộc: chưa nhập, không hợp lệ, đang xử lý, thành công và lỗi.
Chỉ hiển thị kết quả thực khi API hoàn tất; xử lý hủy/thay đổi dữ liệu theo lifecycle
của feature. Theme sáng/tối, bàn phím và màn hình 375 px thuộc tiêu chí nghiệm thu.

## 3. Phạm vi backend và API

```text
POST /api/des/encrypt
POST /api/des/decrypt
POST /api/des/trace
POST /api/des/file
```

Encrypt JSON: text,key,inputFormat,mode,iv; decrypt: text,key,outputFormat,mode,iv. Mặc định format=text, mode=ECB; ECB bỏ qua IV. Trace nhận block đúng 16 hex,key,operation và trả trace một khối. Transform trả success,result,warnings; file nhận file,key,action,mode,iv,response_mode. Giới hạn text/file và định dạng hex theo schema DES.

### Ví dụ API kiểm chứng

`POST /api/des/trace` với body:

```json
{
  "block": "0123456789ABCDEF",
  "key": "133457799BBCDFF1",
  "operation": "encrypt"
}
```

Các trường cần đối chiếu trong response HTTP 200 (không phải toàn bộ response):

```json
{
  "result": "85E813540F0AB405"
}
```

## 4. Lỗi, file và dữ liệu

Áp dụng các giới hạn chung và ngoại lệ riêng ở mục 3. BE giữ quyền quyết định
validation cuối cùng; FE hiển thị message trả về và không thay bằng kết quả demo.
Schema/handler quyết định chi tiết HTTP status, code, field hoặc details theo
[phạm vi chung](COMMON_SCOPE.md#3-api-và-lỗi). Không lưu input/khóa vào log ứng dụng.

## 5. Ngoài phạm vi

Không Triple-DES/AES, không quản lý khóa production, không xem DES là giải pháp mã hóa an toàn cho dữ liệu thực tế.

## 6. Tiêu chí nghiệm thu

- Trace 0123456789ABCDEF / key=133457799BBCDFF1 → 85E813540F0AB405. Kiểm CBC thiếu IV, hex sai độ dài, UTF-8 lỗi, padding lỗi, khóa yếu/bán yếu và trace đủ 16 vòng.
- Đối chiếu encrypt/decrypt hoặc thao tác tương ứng với API thật, không chỉ mock UI.
- Sai dữ liệu phải báo lỗi xác định; không hiển thị kết quả trước đó như kết quả mới.
- Khi lưu/tải file hoặc sao chép được UI hỗ trợ, nội dung phải khớp snapshot kết quả.
- Lịch sử tuân theo phạm vi chung và chính sách riêng của thuật toán, không lộ private key.

## 7. Nguồn triển khai và kiểm thử

- [backend/app/core/des.py](../../backend/app/core/des.py)
- [backend/app/api/des_schemas.py](../../backend/app/api/des_schemas.py)
- [backend/app/api/routes_des.py](../../backend/app/api/routes_des.py)
- [backend/app/api/routes_des_file.py](../../backend/app/api/routes_des_file.py)
- [backend/tests/unit/test_des.py](../../backend/tests/unit/test_des.py)
- [backend/tests/integration/test_des_endpoints.py](../../backend/tests/integration/test_des_endpoints.py)
- [frontend/src/features/des/components/DesWorkspace.tsx](../../frontend/src/features/des/components/DesWorkspace.tsx)
- [frontend/src/features/des/services/desTrace.test.ts](../../frontend/src/features/des/services/desTrace.test.ts)
