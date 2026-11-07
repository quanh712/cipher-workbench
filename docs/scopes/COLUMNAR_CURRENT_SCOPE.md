# Scope hiện hành — Hệ mã hàng — Columnar Transposition

Đối chiếu source local ngày 07/11/2026. Đây là phạm vi FE/BE hiện có; không phải
biên bản nghiệm thu một deployment. Áp dụng cùng [phạm vi chung](COMMON_SCOPE.md).
Scope gốc/spec theo từng đợt vẫn được giữ trong [mục lục](README.md).

## 1. Mục tiêu và quy tắc thuật toán

Ghi Unicode code point theo hàng, đọc cột theo thứ hạng khóa. Không padding, không chuẩn hóa hoa/thường hoặc bỏ ký tự. Giải mã tính chiều dài mỗi cột từ n div m và n mod m.

## 2. Phạm vi frontend

Một trường khóa tự nhận permutation số hoặc keyword; hiện permutation, thứ tự đọc, ma trận và kết quả. Phân tích chỉ hiển thị bản xem trước khi dữ liệu lớn; copy/download giữ toàn bộ kết quả API.

Các trạng thái bắt buộc: chưa nhập, không hợp lệ, đang xử lý, thành công và lỗi.
Chỉ hiển thị kết quả thực khi API hoàn tất; xử lý hủy/thay đổi dữ liệu theo lifecycle
của feature. Theme sáng/tối, bàn phím và màn hình 375 px thuộc tiêu chí nghiệm thu.

## 3. Phạm vi backend và API

```text
POST /api/columnar/encrypt
POST /api/columnar/decrypt
POST /api/columnar/file
```

JSON nhận text,key; multipart nhận file,key,action,response_mode. Trim chỉ ASCII whitespace, tối đa 2048 code point khóa sau trim. 2–256 cột. Permutation phải gồm đủ 1..m, không lặp/số 0 đầu; hỗ trợ dấu phẩy, ASCII whitespace và một cặp {}. Keyword [A-Za-z]+, xếp chữ trùng ổn định từ trái sang phải. Thành công text/content trả success/result.

### Ví dụ API kiểm chứng

`POST /api/columnar/encrypt` với body:

```json
{
  "text": "ABCDE",
  "key": "3 1 4 2"
}
```

Các trường cần đối chiếu trong response HTTP 200 (không phải toàn bộ response):

```json
{
  "result": "BDAEC"
}
```

## 4. Lỗi, file và dữ liệu

Áp dụng các giới hạn chung và ngoại lệ riêng ở mục 3. BE giữ quyền quyết định
validation cuối cùng; FE hiển thị message trả về và không thay bằng kết quả demo.
Schema/handler quyết định chi tiết HTTP status, code, field hoặc details theo
[phạm vi chung](COMMON_SCOPE.md#3-api-và-lỗi). Không lưu input/khóa vào log ứng dụng.

## 5. Ngoài phạm vi

Không padding, không cắt hậu tố, không cho người dùng chọn một mode khóa khác với cơ chế tự nhận dạng.

## 6. Tiêu chí nghiệm thu

- ABCDE / 3 1 4 2 → BDAEC; BALLOON → [2,1,3,4,6,7,5]. Round-trip emoji, CRLF, BOM và cột rỗng; từ chối surrogate lẻ và permutation thiếu/lặp.
- Đối chiếu encrypt/decrypt hoặc thao tác tương ứng với API thật, không chỉ mock UI.
- Sai dữ liệu phải báo lỗi xác định; không hiển thị kết quả trước đó như kết quả mới.
- Khi lưu/tải file hoặc sao chép được UI hỗ trợ, nội dung phải khớp snapshot kết quả.
- Lịch sử tuân theo phạm vi chung và chính sách riêng của thuật toán, không lộ private key.

## 7. Nguồn triển khai và kiểm thử

- [backend/app/core/columnar.py](../../backend/app/core/columnar.py)
- [backend/app/api/routes_columnar_text.py](../../backend/app/api/routes_columnar_text.py)
- [backend/app/api/routes_columnar_file.py](../../backend/app/api/routes_columnar_file.py)
- [backend/tests/unit/test_columnar.py](../../backend/tests/unit/test_columnar.py)
- [backend/tests/integration/test_columnar_text_endpoints.py](../../backend/tests/integration/test_columnar_text_endpoints.py)
- [backend/tests/integration/test_columnar_file_endpoint.py](../../backend/tests/integration/test_columnar_file_endpoint.py)
- [frontend/src/features/columnar/components/ColumnarWorkspace.tsx](../../frontend/src/features/columnar/components/ColumnarWorkspace.tsx)
