# Scope hiện hành — Hill

Đối chiếu source local ngày 07/11/2026. Đây là phạm vi FE/BE hiện có; không phải
biên bản nghiệm thu một deployment. Áp dụng cùng [phạm vi chung](COMMON_SCOPE.md).
Scope gốc/spec theo từng đợt vẫn được giữ trong [mục lục](README.md).

## 1. Mục tiêu và quy tắc thuật toán

Vector hàng C=P·K mod 26; ma trận vuông cấp 2–4. det(K) phải khả nghịch modulo 26. Khối chữ ASCII giữ vị trí và kiểu hoa/thường trong văn bản; ký tự khác theo quy tắc stripDiacritics. Mã hóa đệm đến đủ khối, giải mã không tự cắt padding.

## 2. Phạm vi frontend

Nhập ma trận hoặc keyword đủ m² chữ; phân tích khóa, sinh khóa, văn bản hoặc đọc file UTF-8 .txt rồi gửi JSON. FE dùng padChar=X và tùy chọn bỏ dấu; hiện khối, nghịch đảo, warnings và lựa chọn xem padding theo BE.

Các trạng thái bắt buộc: chưa nhập, không hợp lệ, đang xử lý, thành công và lỗi.
Chỉ hiển thị kết quả thực khi API hoàn tất; xử lý hủy/thay đổi dữ liệu theo lifecycle
của feature. Theme sáng/tối, bàn phím và màn hình 375 px thuộc tiêu chí nghiệm thu.

## 3. Phạm vi backend và API

```text
POST /api/hill/encrypt
POST /api/hill/decrypt
POST /api/hill/key/analyze
GET /api/hill/key/random?m=2
```

Biến thể key: {key:[[...]]} hoặc {keyword:string,m:2|3|4}, không gửi cả hai. options hỗ trợ stripDiacritics boolean và padChar một chữ A–Z ở BE. Text UTF-8 tối đa 5 MiB. Thành công transform có success,result,blocks,key,warnings và padding khi giải mã; phân tích/sinh khóa có success,result,warnings. Không có endpoint multipart /api/hill/file.

### Ví dụ API kiểm chứng

`POST /api/hill/encrypt` với body:

```json
{
  "text": "HI",
  "key": [
    [3, 3],
    [2, 5]
  ]
}
```

Các trường cần đối chiếu trong response HTTP 200 (không phải toàn bộ response):

```json
{
  "result": "LJ"
}
```

## 4. Lỗi, file và dữ liệu

Áp dụng các giới hạn chung và ngoại lệ riêng ở mục 3. BE giữ quyền quyết định
validation cuối cùng; FE hiển thị message trả về và không thay bằng kết quả demo.
Schema/handler quyết định chi tiết HTTP status, code, field hoặc details theo
[phạm vi chung](COMMON_SCOPE.md#3-api-và-lỗi). Không lưu input/khóa vào log ứng dụng.

## 5. Ngoài phạm vi

Không hỗ trợ ma trận ngoài cấp 2–4, số thực, tự sửa khóa không khả nghịch hoặc tự khẳng định padding nhận diện là dữ liệu thừa chắc chắn.

## 6. Tiêu chí nghiệm thu

- HI / [[3,3],[2,5]] → LJ; nghịch đảo [[15,17],[20,9]]. Kiểm key không khả nghịch, keyword thiếu chữ, bản mã thiếu khối, dấu tiếng Việt và ngưỡng UTF-8 5 MiB.
- Đối chiếu encrypt/decrypt hoặc thao tác tương ứng với API thật, không chỉ mock UI.
- Sai dữ liệu phải báo lỗi xác định; không hiển thị kết quả trước đó như kết quả mới.
- Khi lưu/tải file hoặc sao chép được UI hỗ trợ, nội dung phải khớp snapshot kết quả.
- Lịch sử tuân theo phạm vi chung và chính sách riêng của thuật toán, không lộ private key.

## 7. Nguồn triển khai và kiểm thử

- [backend/app/core/hill.py](../../backend/app/core/hill.py)
- [backend/app/api/hill_schemas.py](../../backend/app/api/hill_schemas.py)
- [backend/app/api/routes_hill.py](../../backend/app/api/routes_hill.py)
- [backend/tests/unit/test_hill.py](../../backend/tests/unit/test_hill.py)
- [backend/tests/integration/test_hill_endpoints.py](../../backend/tests/integration/test_hill_endpoints.py)
- [frontend/src/features/hill/components/HillWorkspace.tsx](../../frontend/src/features/hill/components/HillWorkspace.tsx)
- [frontend/src/features/hill/utils/fileText.ts](../../frontend/src/features/hill/utils/fileText.ts)
