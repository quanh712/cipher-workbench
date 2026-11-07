# Scope và đặc tả thuật toán

## Scope hiện hành — đủ 9 thuật toán

Bộ scope FE/BE đối chiếu source local ngày 07/11/2026. Đọc
[phạm vi chung](COMMON_SCOPE.md) trước khi đi vào từng thuật toán.

| Thuật toán       | Scope FE + BE                                                      |
| ---------------- | ------------------------------------------------------------------ |
| Caesar           | [CAESAR_CURRENT_SCOPE.md](CAESAR_CURRENT_SCOPE.md)                 |
| Vigenère         | [VIGENERE_CURRENT_SCOPE.md](VIGENERE_CURRENT_SCOPE.md)             |
| Playfair         | [PLAYFAIR_CURRENT_SCOPE.md](PLAYFAIR_CURRENT_SCOPE.md)             |
| Affine           | [AFFINE_CURRENT_SCOPE.md](AFFINE_CURRENT_SCOPE.md)                 |
| Hệ mã hàng       | [COLUMNAR_CURRENT_SCOPE.md](COLUMNAR_CURRENT_SCOPE.md)             |
| Hill             | [HILL_CURRENT_SCOPE.md](HILL_CURRENT_SCOPE.md)                     |
| DES              | [DES_CURRENT_SCOPE.md](DES_CURRENT_SCOPE.md)                       |
| RSA và chữ ký số | [RSA_CURRENT_SCOPE.md](RSA_CURRENT_SCOPE.md)                       |
| Diffie–Hellman   | [DIFFIE_HELLMAN_CURRENT_SCOPE.md](DIFFIE_HELLMAN_CURRENT_SCOPE.md) |

Mỗi file có ranh giới FE/BE, endpoint, quy tắc/giới hạn, lỗi, ngoài phạm vi,
tiêu chí nghiệm thu và liên kết source/test. Khả năng BE chưa có UI được ghi rõ.
Các vector mẫu đã đối chiếu trực tiếp bằng FastAPI TestClient; đây không phải
chứng nhận một deployment hoặc tuyên bố đã chạy lại toàn bộ browser test.

## Scope gốc và đặc tả theo từng đợt

Giữ để truy vết yêu cầu và các quyết định cũ. Tên `RSA_SCOPE.md`,
`DIFFIE_HELLMAN_SCOPE.md` hoặc các spec Week 1 dưới đây không thay thế bộ
`*_CURRENT_SCOPE.md`. Tài liệu FE/BE được giữ riêng vì mô tả các phạm vi khác nhau.

| Thuật toán             | Scope / đặc tả frontend                                                                      | Scope / tham chiếu backend                                                                                | Giải thích / demo                                                                                                                    |
| ---------------------- | -------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Caesar                 | [Scope FE](<FE Week 1 Scope – Caesar Cipher Tool UI.docx>), [đặc tả Week 1](PROJECT_SPEC.md) | [Scope BE gốc](<BE Scope – Week 1 Caesar Cipher MVP.docx>), [bản trích để đọc/tìm kiếm](be-scope-v1.0.md) | [Demo Caesar](Caesar_Cipher_Tool_Demo.html)                                                                                          |
| Vigenère / Playfair    | [Scope FE](FE_Scope_Playfair_Vigenere.docx), [đặc tả](PLAYFAIR_VIGENERE_SPEC.md)             | [Scope BE](<BE Scope – Playfair & Vigenère.docx>)                                                         | —                                                                                                                                    |
| Affine                 | [Đặc tả](AFFINE_SPEC.md)                                                                     | —                                                                                                         | [Demo FE](frontend-affine-cipher.html), [demo BE](backend-affine-cipher.html)                                                        |
| Hệ mã hàng (Columnar)  | [Đặc tả](COLUMNAR_SPEC.md)                                                                   | —                                                                                                         | [Thuật toán và demo](he-ma-hang.html)                                                                                                |
| Hill                   | [Scope FE](<Scope Frontend_ Hệ mã hóa Hill.html>), [đặc tả](HILL_SPEC.md)                    | [Scope BE](<Scope Backend_ Hệ mã hóa Hill.html>)                                                          | —                                                                                                                                    |
| DES                    | [Scope FE](DES_Frontend_Scope.html), [đặc tả](DES_SPEC.md)                                   | [Scope BE](<Scope Backend_ Hệ mã hóa DES.html>)                                                           | [Thuật toán bản FE](<frontend-Hệ mã hóa DES_ thuật toán và logic.html>), [bản BE](<backend-Hệ mã hóa DES_ thuật toán và logic.html>) |
| RSA                    | [Scope FE](RSA_SCOPE.md), [đặc tả](RSA_SPEC.md)                                              | [Scope BE](scope_rsa_BE.pdf)                                                                              | [Giải thích và demo](rsa-giai-thich.html)                                                                                            |
| Diffie–Hellman         | [Scope FE](DIFFIE_HELLMAN_SCOPE.md), [đặc tả](DIFFIE_HELLMAN_SPEC.md)                        | [Scope BE](<Scope Backend Diffie-Hellman – Caesar_Cipher.md>)                                             | [Thuật toán và logic](<Trao đổi khóa Diffie-Hellman_ thuật toán và logic.md>)                                                        |
| Lọc padding dùng chung | [Đặc tả Hill / Playfair](PADDING_FILTER_SPEC.md)                                             | —                                                                                                         | —                                                                                                                                    |

## Cách đọc và nguồn có thẩm quyền

- Scope gốc và các đề xuất cũ dùng để truy vết yêu cầu; ngày cập nhật và quy tắc ưu
  tiên trong từng tài liệu vẫn được giữ nguyên. Việc chuyển thư mục không biến
  một scope cũ thành mô tả của phiên bản production hiện tại.
- API contract: [tham chiếu FE](../frontend/BACKEND_CONTRACT.md),
  [consumer guide BE](../contracts/frontend-integration.md),
  [RSA](../contracts/rsa-frontend-contract.md),
  [Diffie–Hellman](../contracts/dh-frontend-contract.md).
- Các đường dẫn `src/` và `e2e/` trong đặc tả frontend được tính từ `frontend/`.
  Đường dẫn ứng dụng backend được tính từ `backend/`, trừ khi liên kết ghi rõ khác.
- HTML là tài liệu minh họa, không được nhúng vào runtime hoặc dùng thay kết quả API.
  Demo Caesar chỉ còn một bản chung. Hai bản Affine và hai tài liệu thuật toán DES
  có nội dung khác nhau, nên giữ riêng với tiền tố `frontend-` / `backend-`.
- [OpenSpec hiện hành](../../backend/openspec/specs/) và lịch sử change giữ nguyên
  cấu trúc để công cụ OpenSpec tiếp tục hoạt động. Các tên file cũ trong change đã
  archive có thể tra ở mục lục này; tên file được giữ, ngoại trừ tiền tố phân biệt
  FE/BE của Affine và tài liệu thuật toán DES.
- [Scope Caesar trước cập nhật UI](<../../backend/docs/archive/BE Scope – Week 1 Caesar Cipher MVP.before-ui-update.docx>)
  và các bản backup tiếp tục nằm trong khu vực lưu trữ, không phải scope hiện hành.
