# RSA: block, file và chữ ký PEM

Trang RSA có ba tab: Mã hóa / Giải mã, Chữ ký số nguyên và Chữ ký PEM.

- Tab mã hóa dùng chung bộ khóa số được sinh hoặc nhập thủ công. Văn bản/file `.txt` hỗ trợ từng ký tự Unicode (`char`) hoặc gộp byte UTF-8 (`block`, n ≥ 256). File mã hóa giới hạn 1.000.000 byte và 10.000 ký tự theo backend.
- Kết quả mã hóa block là JSON `{ mode, cipher, originalUtf8ByteLength }`. Dán nguyên JSON này để giải mã, hoặc nhập mảng chuỗi số và độ dài byte UTF-8 gốc riêng. Nút “Dùng bản mã để giải mã” chuyển kết quả sang đầu vào giải mã. Tải kết quả giữ metadata cần thiết.
- Tab chữ ký số nguyên giữ luồng học thuật và bảng lũy thừa modulo hiện có.
- Tab PEM dùng RSA-PSS, SHA-256, MGF1-SHA-256, salt 32 byte. Dán private key PEM để ký; nhập mật khẩu nếu khóa được mã hóa. Kiểm tra cần public key PEM và chữ ký base64. Văn bản/file `.txt` giới hạn 5 MiB; file được gửi nguyên byte bằng multipart, kể cả BOM và CRLF.
- Ký PEM trả về chữ ký base64, public key được trích xuất, số byte và SHA-256. Có thể tải chữ ký/public key hoặc chuyển sang kiểm tra với nội dung hiện tại. `valid=false` là kết quả kiểm tra không khớp, phân biệt với lỗi khóa hoặc dữ liệu đầu vào.

Khóa PEM, mật khẩu và nội dung file chỉ giữ trong bộ nhớ UI, không lưu vào browser history. Khóa riêng/mật khẩu được xóa sau thao tác thành công, khi rời tab hoặc đặt lại. Backend vẫn có thể lưu nội dung ký nếu bật lịch sử máy chủ; UI thông báo điều này. Browser history chỉ lưu metadata cho luồng PEM/file.

API sử dụng: `POST /api/rsa/encrypt` (JSON hoặc multipart), `/decrypt` (JSON), `/sign` và `/verify` (JSON cho văn bản, multipart cho file). Luồng số nguyên vẫn dùng `/sign/raw`, `/verify/raw`. Khi sửa đầu vào/khóa hoặc đặt lại, request cũ bị hủy và không được ghi đè kết quả mới.
