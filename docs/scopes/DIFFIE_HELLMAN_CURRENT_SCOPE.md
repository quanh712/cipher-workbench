# Scope hiện hành — Diffie–Hellman

Đối chiếu source local ngày 07/11/2026. Đây là phạm vi FE/BE hiện có; không phải
biên bản nghiệm thu một deployment. Áp dụng cùng [phạm vi chung](COMMON_SCOPE.md).
Scope gốc/spec theo từng đợt vẫn được giữ trong [mục lục](README.md).

## 1. Mục tiêu và quy tắc thuật toán

Y_A=α^X_A mod q; Y_B=α^X_B mod q; K_A=Y_B^X_A mod q, K_B=Y_A^X_B mod q. Kiểm prime/primitive root; sinh safe-prime và exponent ngẫu nhiên. Caesar dùng K mod 26 chỉ để minh họa.

## 2. Phạm vi frontend

Form q,α,X_A,X_B; preset, sinh ngẫu nhiên, trao đổi A/B; bốn trace public/shared, giải thích primitive root và Caesar text/file. Đổi draft, đổi tab/reset hoặc hủy phải chặn response muộn ghi đè. Không tự gọi API khi chỉ mở tab hoặc điền ví dụ.

Các trạng thái bắt buộc: chưa nhập, không hợp lệ, đang xử lý, thành công và lỗi.
Chỉ hiển thị kết quả thực khi API hoàn tất; xử lý hủy/thay đổi dữ liệu theo lifecycle
của feature. Theme sáng/tối, bàn phím và màn hình 375 px thuộc tiêu chí nghiệm thu.

## 3. Phạm vi backend và API

```text
POST /api/dh/params
POST /api/dh/params/random
POST /api/dh/keypair
POST /api/dh/shared-secret
POST /api/dh/exchange
POST /api/dh/caesar
```

Crypto operands là chuỗi decimal chuẩn; bits integer 16/32/64/128. Manual params kiểm đến 10^12, downstream hỗ trợ toán hạng 128-bit theo probable-prime policy. Có thể bỏ privateKey/privateKeyA/privateKeyB để BE sinh, không gửi null thay bỏ field. Exchange trả publicKeyA/B,sharedKeyA/B,match,steps,warnings và private keys cho minh họa. Caesar nhận JSON data hoặc multipart file, luôn trả JSON, không attachment. UI không nhất thiết cung cấp từng endpoint standalone thành màn hình riêng.

### Ví dụ API kiểm chứng

`POST /api/dh/exchange` với body:

```json
{
  "q": "23",
  "alpha": "5",
  "privateKeyA": "6",
  "privateKeyB": "15"
}
```

Các trường cần đối chiếu trong response HTTP 200 (không phải toàn bộ response):

```json
{
  "publicKeyA": "8",
  "publicKeyB": "19",
  "sharedKeyA": "2",
  "sharedKeyB": "2",
  "match": true
}
```

## 4. Lỗi, file và dữ liệu

Áp dụng các giới hạn chung và ngoại lệ riêng ở mục 3. BE giữ quyền quyết định
validation cuối cùng; FE hiển thị message trả về và không thay bằng kết quả demo.
Schema/handler quyết định chi tiết HTTP status, code, field hoặc details theo
[phạm vi chung](COMMON_SCOPE.md#3-api-và-lỗi). Không lưu input/khóa vào log ứng dụng.

## 5. Ngoài phạm vi

Không kết nối hai người dùng thật, không xác thực MITM, ECDH, KDF hoặc lưu/xuất khóa lâu dài. Không ghi tham số/khóa/trace DH vào browser history; chỉ metadata thao tác được giữ.

## 6. Tiêu chí nghiệm thu

- q=23,α=5,X_A=6,X_B=15 → public 8/19, shared 2/2, match=true. Kiểm alpha không primitive, q hợp số, private key sai miền, trace tối đa 128 bước và hủy/response muộn.
- Đối chiếu encrypt/decrypt hoặc thao tác tương ứng với API thật, không chỉ mock UI.
- Sai dữ liệu phải báo lỗi xác định; không hiển thị kết quả trước đó như kết quả mới.
- Khi lưu/tải file hoặc sao chép được UI hỗ trợ, nội dung phải khớp snapshot kết quả.
- Lịch sử tuân theo phạm vi chung và chính sách riêng của thuật toán, không lộ private key.

## 7. Nguồn triển khai và kiểm thử

- [backend/app/core/dh.py](../../backend/app/core/dh.py)
- [backend/app/api/dh_schemas.py](../../backend/app/api/dh_schemas.py)
- [backend/app/api/routes_dh.py](../../backend/app/api/routes_dh.py)
- [backend/tests/unit/test_dh.py](../../backend/tests/unit/test_dh.py)
- [backend/tests/integration/test_dh_endpoints.py](../../backend/tests/integration/test_dh_endpoints.py)
- [frontend/src/features/diffieHellman/components/DiffieHellmanWorkspace.tsx](../../frontend/src/features/diffieHellman/components/DiffieHellmanWorkspace.tsx)
- [frontend/src/app/DiffieHellmanHttpApp.test.tsx](../../frontend/src/app/DiffieHellmanHttpApp.test.tsx)
