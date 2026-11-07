# Scope hiện hành — RSA và chữ ký số

Đối chiếu source local ngày 07/11/2026. Đây là phạm vi FE/BE hiện có; không phải
biên bản nghiệm thu một deployment. Áp dụng cùng [phạm vi chung](COMMON_SCOPE.md).
Scope gốc/spec theo từng đợt vẫn được giữ trong [mục lục](README.md).

## 1. Mục tiêu và quy tắc thuật toán

RSA giáo dục: n=pq, φ=(p-1)(q-1), d=e⁻¹ mod φ; c=m^e mod n, m=c^d mod n. Trace Euclid và bình phương–nhân lấy từ BE. Ký raw dùng số nguyên; BE còn hỗ trợ RSASSA-PSS/SHA-256 với PEM.

## 2. Phạm vi frontend

UI có tab Mã hóa / Chữ ký số, sinh khóa thủ công/ngẫu nhiên, mã hóa/giải mã một số hoặc văn bản mode=char, ký/kiểm raw-integer. Ciphertext là mảng JSON chuỗi số. Thay input/khóa phải vô hiệu kết quả cũ. Hiện chữ ký hợp lệ/không hợp lệ khác lỗi dịch vụ. UI hiện chưa có upload PEM, mode=block hoặc upload file RSA.

Các trạng thái bắt buộc: chưa nhập, không hợp lệ, đang xử lý, thành công và lỗi.
Chỉ hiển thị kết quả thực khi API hoàn tất; xử lý hủy/thay đổi dữ liệu theo lifecycle
của feature. Theme sáng/tối, bàn phím và màn hình 375 px thuộc tiêu chí nghiệm thu.

## 3. Phạm vi backend và API

```text
POST /api/rsa/keys
POST /api/rsa/keys/random
POST /api/rsa/encrypt
POST /api/rsa/decrypt
POST /api/rsa/sign/raw
POST /api/rsa/verify/raw
POST /api/rsa/sign
POST /api/rsa/verify
```

Crypto operands là chuỗi decimal, control bits/traceBlockIndex là JSON integer. Manual prime ≤10^12; toán hạng ≤2^128-1; random bits 16/32/64/128. Text ≤10000 code point, block cipher ≤40000 item. BE encrypt nhận JSON number/text, char/block và multipart file UTF-8 .txt ≤1000000 byte; không có /api/rsa/file. Decrypt block cần metadata byte length theo schema. Raw sign nhận m,d,e,n; verify m,signature,e,n. Standard sign/verify nhận text/file và PEM theo rsa_signature_schemas. Các nhánh có response model riêng, không ép về success/result chung.

### Chữ ký chuẩn chỉ có ở backend

`POST /api/rsa/sign` nhận JSON `{source:"text",text,privateKeyPem,passphrase?}`
hoặc multipart `file,privateKeyPem,passphrase?`. Verify dùng
`{source:"text",text,signature,publicKeyPem}` hoặc multipart
`file,signature,publicKeyPem`. Chữ ký là Base64; thuật toán cố định RSASSA-PSS,
SHA-256, MGF1-SHA256, salt dài 32 byte. Nội dung tối đa 5 MiB, PEM tối đa 64 KiB,
passphrase tối đa 4 KiB; giới hạn này độc lập với file RSA encrypt 1.000.000 byte.
Sign/verify trả `{success,result,history}`; `valid:false` là kết quả kiểm chữ ký,
không tự biến thành lỗi HTTP. Nhánh này chưa có màn hình PEM trong FE hiện tại.

### Ví dụ API kiểm chứng

`POST /api/rsa/encrypt` với body:

```json
{
  "inputType": "number",
  "e": "17",
  "n": "3233",
  "data": "65"
}
```

Các trường cần đối chiếu trong response HTTP 200 (không phải toàn bộ response):

```json
{
  "cipher": ["2790"]
}
```

## 4. Lỗi, file và dữ liệu

Áp dụng các giới hạn chung và ngoại lệ riêng ở mục 3. BE giữ quyền quyết định
validation cuối cùng; FE hiển thị message trả về và không thay bằng kết quả demo.
Schema/handler quyết định chi tiết HTTP status, code, field hoặc details theo
[phạm vi chung](COMMON_SCOPE.md#3-api-và-lỗi). Không lưu input/khóa vào log ứng dụng.

## 5. Ngoài phạm vi

Không kết nối truyền khóa giữa người dùng, không OAEP cho text giáo dục; UI chưa công bố tất cả khả năng BE. Không lưu private key, passphrase hoặc toàn bộ file trong browser history.

## 6. Tiêu chí nghiệm thu

- p=61,q=53,e=17 → n=3233,d=2753; m=65 → c=2790 → 65. Kiểm m≥n, prime sai/trùng, e không nguyên tố cùng φ, text quá giới hạn, chữ ký sai hợp lệ về cấu trúc, request muộn và dữ liệu riêng tư trong history.
- Đối chiếu encrypt/decrypt hoặc thao tác tương ứng với API thật, không chỉ mock UI.
- Sai dữ liệu phải báo lỗi xác định; không hiển thị kết quả trước đó như kết quả mới.
- Khi lưu/tải file hoặc sao chép được UI hỗ trợ, nội dung phải khớp snapshot kết quả.
- Lịch sử tuân theo phạm vi chung và chính sách riêng của thuật toán, không lộ private key.

## 7. Nguồn triển khai và kiểm thử

- [backend/app/core/rsa.py](../../backend/app/core/rsa.py)
- [backend/app/core/rsa_signatures.py](../../backend/app/core/rsa_signatures.py)
- [backend/app/api/rsa_schemas.py](../../backend/app/api/rsa_schemas.py)
- [backend/app/api/rsa_signature_schemas.py](../../backend/app/api/rsa_signature_schemas.py)
- [backend/app/api/routes_rsa.py](../../backend/app/api/routes_rsa.py)
- [backend/app/api/routes_rsa_signatures.py](../../backend/app/api/routes_rsa_signatures.py)
- [backend/tests/unit/test_rsa.py](../../backend/tests/unit/test_rsa.py)
- [backend/tests/integration/test_rsa_signature_endpoints.py](../../backend/tests/integration/test_rsa_signature_endpoints.py)
- [frontend/src/features/rsa/components/RsaWorkspace.tsx](../../frontend/src/features/rsa/components/RsaWorkspace.tsx)
- [frontend/src/features/rsa/services/rsaApi.ts](../../frontend/src/features/rsa/services/rsaApi.ts)
