# Ví dụ chữ ký RSA PEM

Cách nhanh trên giao diện local: mở <http://127.0.0.1:18081> → RSA → Chữ ký PEM → Tạo ví dụ → Ký PEM. Sau đó bấm Dùng để kiểm tra → Kiểm tra PEM. Nếu đang ở chế độ Kiểm tra PEM, Tạo ví dụ sẽ điền sẵn thông điệp, public key và chữ ký hợp lệ. Mỗi lần bấm tạo bộ khóa thử nghiệm mới; ví dụ được sinh trong trình duyệt, thao tác ký/kiểm tra chỉ gửi lên backend khi bấm nút tương ứng.

Chạy từ thư mục gốc `cipher-workbench/`, dùng Python môi trường backend đã cài dependency:

```bash
backend/.venv/bin/python docs/examples/rsa-pem/generate.py /tmp/cipher-rsa-pem-demo
```

Script tạo khóa RSA 2048 bit dùng thử, thông điệp UTF-8, chữ ký Base64 RSA-PSS/SHA-256 và các request JSON. Thư mục đích phải chưa tồn tại; đổi tên thư mục nếu chạy lại. Khóa này chỉ dành cho ví dụ. Không commit thư mục kết quả.

Với Docker local đang chạy ở cổng 18081:

```bash
# Kiểm tra chữ ký có sẵn: result.valid = true.
curl --fail-with-body http://127.0.0.1:18081/api/rsa/verify \
  -H 'Content-Type: application/json' \
  --data-binary @/tmp/cipher-rsa-pem-demo/verify.json

# Cùng chữ ký nhưng thông điệp bị sửa: result.valid = false.
curl --fail-with-body http://127.0.0.1:18081/api/rsa/verify \
  -H 'Content-Type: application/json' \
  --data-binary @/tmp/cipher-rsa-pem-demo/verify-tampered.json

# Ký văn bản bằng private key: trả result.signature và result.publicKeyPem.
curl --fail-with-body http://127.0.0.1:18081/api/rsa/sign \
  -H 'Content-Type: application/json' \
  --data-binary @/tmp/cipher-rsa-pem-demo/sign.json

# Ký cùng nội dung từ file .txt.
curl --fail-with-body http://127.0.0.1:18081/api/rsa/sign \
  -F 'file=@/tmp/cipher-rsa-pem-demo/message.txt;type=text/plain' \
  -F 'privateKeyPem=</tmp/cipher-rsa-pem-demo/private.pem'

# Kiểm tra file bằng chữ ký mẫu.
curl --fail-with-body http://127.0.0.1:18081/api/rsa/verify \
  -F 'file=@/tmp/cipher-rsa-pem-demo/message.txt;type=text/plain' \
  -F 'publicKeyPem=</tmp/cipher-rsa-pem-demo/public.pem' \
  -F 'signature=</tmp/cipher-rsa-pem-demo/signature.txt'
```

Giữ nguyên nội dung file, kể cả xuống dòng; chữ ký xác nhận chính xác các byte được ký. RSA-PSS tạo chữ ký khác nhau giữa các lần ký cùng thông điệp, nhưng chúng đều kiểm tra hợp lệ với đúng public key.

API hiện ký trên backend, nên request ký gửi private key lên server. Bộ mẫu không đặt mật khẩu khóa. Để thử trên UI: mở <http://127.0.0.1:18081>, chọn RSA → Chữ ký PEM. Dán nội dung `message.txt`, chọn khóa `private.pem`, rồi bấm Ký PEM. Bấm Dùng để kiểm tra để chuyển chữ ký và public key sang form kiểm tra; giữ nguyên nội dung và bấm Kiểm tra PEM. Có thể chọn nguồn File .txt để dùng trực tiếp `message.txt`. API cũng có thể thử tại trang Swagger <http://127.0.0.1:18081/docs>.
