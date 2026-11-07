# Rà soát pháp lý Cipher Workbench — 04/11/2026

🤖 Báo cáo do AI tạo từ mã nguồn, chỉ để tham khảo, không phải ý kiến pháp lý. Phần lớn mục 🔴 là chỉnh sửa nhỏ trong code, làm được trong vài giờ, không cần quá lo. Việc gì quan trọng thì hỏi lại người làm luật.

## Phạm vi và phân loại

Đã chạy `.vn-law-check/scripts/scan.sh`, kiểm tra lại mã frontend React, backend FastAPI, lịch sử và cấu hình triển khai. Đây là audit mã nguồn, chưa kiểm tra website production, lưu lượng mạng, database, log hay giấy tờ nội bộ. Bộ nguồn luật của checklist cập nhật ngày 03/11/2026; đã tra cứu thêm nguồn công khai ngày audit.

**Phân loại: mức 1, ứng dụng học tập có xử lý đầu vào và lịch sử theo trình duyệt.** Không thấy tài khoản thật, bán hàng, thanh toán, quảng cáo, analytics hay AI trong runtime đã đọc. Tín hiệu AUTH từ script là bắt nhầm `signing` và tài liệu HTML, không phải bằng chứng đăng nhập. Không có cơ sở xếp ứng dụng này thành nền tảng quy mô lớn chỉ vì có backend.

Áp dụng checklist 01 mục A–C; ghi thêm các điều kiện cần xác minh về hosting và trách nhiệm nội bộ. Dữ liệu mẫu/số học không mặc nhiên là dữ liệu cá nhân; nghĩa vụ được nêu cho trường hợp dữ liệu gắn với người cụ thể hoặc giúp xác định họ. Nhãn hồ sơ trình duyệt “anonymous” trong code chưa đủ chứng minh dữ liệu đã được khử nhận dạng theo pháp luật.

## Luồng dữ liệu đã xác nhận

| Luồng | Bằng chứng |
|---|---|
| Văn bản và file được gửi về server để xử lý | `cipher-workbench-fe/src/shared/services/cipherApi.ts:69`, `:94`, `:107` |
| Cookie `cw_history_profile`, thời hạn 30 ngày, được tạo tự động cho các route thuộc phạm vi lịch sử | `cipher-workbench-be/app/config.py:163`, `cipher-workbench-be/app/api/history_profile.py:72`, `:108` |
| Cipher thông thường ghi metadata thao tác; không ghi nội dung đầu vào qua recorder này | `cipher-workbench-be/app/api/history_recorder.py:24`, `:86` |
| RSA raw lưu thông điệp số, chữ ký, khóa công khai và kết quả khi database bật | `cipher-workbench-be/app/api/routes_rsa_signatures.py:231`, `:264` |
| API RSA standard có thể lưu nguyên văn nội dung/file; chưa thấy UI hiện tại gọi chế độ standard | `cipher-workbench-be/app/api/routes_rsa_signatures.py:325`, `:364`; UI hiện tại ở `cipher-workbench-fe/src/features/rsa/components/RsaSignaturePanel.tsx:157` |
| Runtime có TTL 5 giờ; bản sao lưu có cấu hình riêng, mặc định 7 ngày | `cipher-workbench-be/app/history/retention.py:93`, `cipher-workbench-fe/.env.sqlite.example:27`, `cipher-workbench-fe/deploy/sqlite-backup.py:36` |

## 🔴 Cần xử lý ngay

### 1. Chưa có chính sách dữ liệu công khai và thông báo đủ trước khi gửi

Không tìm thấy trang/link chính sách, danh tính đơn vị xử lý hoặc đầu mối quyền dữ liệu trong `cipher-workbench-fe/src`. App shell kết thúc sau workspace (`src/app/App.tsx:144`); form RSA gửi trực tiếp (`RsaSignaturePanel.tsx:77`). Có nói kết quả đến từ backend, nhưng chưa giải thích đầy đủ việc lưu lịch sử, cookie, thời hạn và bên tiếp nhận.

**Đề xuất:** thêm chính sách dễ tìm; thông báo ngắn ngay cạnh thao tác gửi văn bản/file, nêu loại dữ liệu, mục đích xử lý và lưu lịch sử. Nêu riêng nội dung RSA standard nếu mở API đó cho người dùng; khuyến cáo dùng dữ liệu mẫu khi học. Không viết chính sách khẳng định “không lưu dữ liệu” vì backend có các luồng lưu nêu trên.

**Căn cứ:** Điều 4 khoản 1, Điều 9 khoản 2 Luật 91/2025/QH15, ban hành 26/06/2025, hiệu lực 01/01/2026. [Công báo](https://congbao.chinhphu.vn/van-ban/luat-so-91-2025-qh15-45578.htm), [giới thiệu quyền dữ liệu của Kiểm toán nhà nước](https://sav.gov.vn/vi/bai-viet/tai-lieu-gioi-thieu-luat-bao-ve-du-lieu-ca-nhan).

### 2. Lưu lịch sử tự động, chưa có lựa chọn và bằng chứng đồng ý riêng

Middleware gắn hồ sơ và recorder ghi sau yêu cầu, không thấy điều kiện lựa chọn lưu lịch sử (`history_profile.py:108`, `history_recorder.py:99`). RSA gọi `_history()` sau khi ký/kiểm tra (`routes_rsa_signatures.py:231`, `:325`); UI chưa có công tắc hay ô đồng ý cho mục đích lưu này. Thông báo “đã lưu” sau kết quả không thay thế việc làm rõ trước khi xử lý.

**Đề xuất:** cho phép xử lý mà không lưu lịch sử; lựa chọn lưu phải được giải thích trước và được backend thực thi. Nếu dùng cơ chế đồng ý, lưu phiên bản thông báo, mục đích, thời điểm và định danh phù hợp; có cách rút lại. Đây là đề xuất cho lịch sử tùy chọn, không phải yêu cầu mọi nút mã hóa đều phải thêm checkbox.

**Căn cứ:** Điều 9 Luật 91/2025/QH15; Điều 6 Nghị định 356/2025/NĐ-CP, ban hành 31/12/2025, hiệu lực 01/01/2026. Có ngoại lệ xử lý để thực hiện thỏa thuận tại điểm d khoản 1 Điều 19 Luật 91; chưa thấy thỏa thuận công khai đủ để kết luận việc lưu lịch sử thuộc ngoại lệ đó. [Toàn văn Luật](https://thuvienphapluat.vn/van-ban/Bo-may-hanh-chinh/Luat-Bao-ve-du-lieu-ca-nhan-2025-so-91-2025-QH15-625628.aspx), [Nghị định trên Công báo](https://congbao.cdnchinhphu.vn/180507251028987904/2026/1/17/356signed-1768638052103952849513.pdf), [giải thích ngoại lệ của Chính phủ](https://xaydungchinhsach.chinhphu.vn/cac-truong-hop-xu-ly-du-lieu-ca-nhan-khong-can-su-dong-y-cua-chu-the-du-lieu-119250725163811636.htm).

### 3. Thông báo “tối đa 5 giờ” chưa phản ánh vòng đời bản sao lưu

UI nói lịch sử lưu tối đa 5 giờ (`HistoryWorkspace.tsx:216`). Cấu hình mẫu backup giữ 7 ngày; hàm dọn snapshot còn luôn giữ bản thành công mới nhất (`sqlite-backup.py:36`, `:58`). Vì vậy, nếu cơ chế này được bật, không thể hiểu câu trên là dữ liệu bị xóa khỏi mọi nơi sau 5 giờ. Chưa xác minh backup thực tế hoặc nội dung còn trong từng snapshot.

**Đề xuất:** làm rõ thời gian hiển thị/lưu trên DB hoạt động và thời gian trong backup; định nghĩa việc xóa, hết hạn và xử lý dữ liệu đã xóa khi phục hồi. Không chỉ đổi câu chữ nếu chính sách thực tế yêu cầu xóa hoàn toàn sau 5 giờ. Rà lại quy tắc giữ snapshot cuối khi dừng dịch vụ.

**Căn cứ:** Điều 3 khoản 3, Điều 14 Luật 91/2025/QH15, hiệu lực 01/01/2026. Luật không đặt một TTL chung 5 giờ cho website này; vấn đề là thời hạn phù hợp, minh bạch và thực hiện việc xóa. [Toàn văn Luật](https://thuvienphapluat.vn/van-ban/Bo-may-hanh-chinh/Luat-Bao-ve-du-lieu-ca-nhan-2025-so-91-2025-QH15-625628.aspx).

## 🟡 Nên cải thiện

- **Thực hiện quyền dữ liệu:** backend có `DELETE /api/history` và xóa từng mục (`routes_history.py:212`, `:227`), UI có xóa từng chữ ký qua `signatureHistoryApi.ts:90`; chưa thấy thao tác xóa toàn bộ, ngừng ghi lịch sử hoặc kênh gửi yêu cầu quyền dữ liệu. Thêm đầu mối công khai và nối các khả năng backend phù hợp vào UI. Không bắt buộc mọi quyền đều phải có nút tự phục vụ. Căn cứ: Điều 4, Điều 10 Luật 91/2025/QH15; Điều 5 Nghị định 356/2025/NĐ-CP, cùng hiệu lực 01/01/2026. [Nguồn quyền dữ liệu](https://sav.gov.vn/vi/bai-viet/tai-lieu-gioi-thieu-luat-bao-ve-du-lieu-ca-nhan), [Nghị định](https://congbao.cdnchinhphu.vn/180507251028987904/2026/1/17/356signed-1768638052103952849513.pdf).
- **Minh bạch cookie:** công bố cookie hồ sơ 30 ngày và phân biệt với TTL bản ghi 5 giờ; giải thích localStorage lưu lựa chọn giao diện (`src/shared/hooks/useTheme.ts:13`). Chưa có bằng chứng cookie quảng cáo nên không mặc định yêu cầu banner quảng cáo. Căn cứ: Điều 9; khoản 8 Điều 28 Luật 91/2025/QH15, hiệu lực 01/01/2026, chỉ xét theo dõi quảng cáo khi có hoạt động đó. [Toàn văn Luật](https://thuvienphapluat.vn/van-ban/Bo-may-hanh-chinh/Luat-Bao-ve-du-lieu-ca-nhan-2025-so-91-2025-QH15-625628.aspx).

## 🟢 Đạt yêu cầu ở phần mã đã kiểm tra

- **Giảm dữ liệu lưu:** recorder thông thường chỉ ghi metadata; adapter lịch sử RSA không đưa khóa riêng/passphrase vào payload (`history_recorder.py:86`, `history/signatures.py:53`). Đây là điểm hỗ trợ giới hạn phạm vi dữ liệu theo Điều 3 Luật 91/2025/QH15, hiệu lực 01/01/2026; không phải xác nhận toàn hệ thống không bao giờ ghi khóa qua log hoặc hạ tầng. [Toàn văn Luật](https://thuvienphapluat.vn/van-ban/Bo-may-hanh-chinh/Luat-Bao-ve-du-lieu-ca-nhan-2025-so-91-2025-QH15-625628.aspx).
- **Có cơ chế hết hạn và xóa trong runtime:** truy vấn giới hạn chủ sở hữu/thời hạn (`history/store.py:644`, `:696`), có purge và API xóa. Hỗ trợ yêu cầu xóa tại Điều 14 Luật 91/2025/QH15, hiệu lực 01/01/2026; cần giải quyết riêng backup như phát hiện 3. [Toàn văn Luật](https://thuvienphapluat.vn/van-ban/Bo-may-hanh-chinh/Luat-Bao-ve-du-lieu-ca-nhan-2025-so-91-2025-QH15-625628.aspx).

## 🟡 Hồ sơ và vận hành cần xác minh

Các mục sau là điều kiện kiểm tra tiếp, không phải kết luận đang thiếu hồ sơ:

- Chưa xác định quốc gia đặt VPS/database/backup hoặc bên có quyền truy cập. Nếu có chuyển dữ liệu cá nhân xuyên biên giới, đối chiếu Điều 20 và các ngoại lệ Luật 91/2025/QH15, hiệu lực 01/01/2026. Không suy “server ở Việt Nam” từ SQLite/Docker. Nên hỏi người làm luật.
- Chưa xác định pháp nhân, quy mô hoặc diện miễn/hoãn. Đối chiếu hồ sơ tác động và nhân sự theo Điều 21, 22, khoản 2 Điều 33, Điều 38 Luật 91/2025/QH15; không mặc định dự án cá nhân được miễn. Nên hỏi người làm luật.
- Chưa kiểm tra quy trình xử lý sự cố. Đối chiếu Điều 23 Luật 91/2025/QH15 và Điều 28 Nghị định 356/2025/NĐ-CP, hiệu lực 01/01/2026. Nên hỏi người làm luật.

Căn cứ cho phần này: [Luật trên Công báo](https://congbao.chinhphu.vn/van-ban/luat-so-91-2025-qh15-45578.htm), [tài liệu giới thiệu Luật](https://sav.gov.vn/vi/bai-viet/tai-lieu-gioi-thieu-luat-bao-ve-du-lieu-ca-nhan), [Nghị định 356](https://congbao.cdnchinhphu.vn/180507251028987904/2026/1/17/356signed-1768638052103952849513.pdf).

**⚪ Chưa phát sinh checklist chuyên biệt trong phạm vi mã đã đọc:** TMĐT, giao dịch/hợp đồng điện tử, quảng cáo, minh bạch AI và mobile app. Công cụ demo ký RSA không tự đồng nghĩa dịch vụ chứng thực chữ ký số. Không mở rộng audit an ninh mạng quy mô lớn khi chưa có bằng chứng về loại hình, quy mô hoặc điều kiện áp dụng; điều này không loại trừ trách nhiệm bảo vệ dữ liệu và hệ thống nói chung.

**Mức phạt:** chưa định lượng cho các phát hiện này. Báo cáo không xác lập đủ tình tiết hành vi, chủ thể và triển khai thực tế để gán một mức cụ thể; không cộng mức phạt hay suy từ mức trần.

## Giới hạn & Khuyến nghị

Đây là rà soát sơ bộ do AI thực hiện, không phải ý kiến pháp lý chính thức, không kết luận website vi phạm hoặc đã tuân thủ toàn bộ. Dữ liệu thực tế, bản production, cấu hình log/backup và thỏa thuận ngoài mã nguồn có thể làm thay đổi đánh giá. Các nhãn 🟢 chỉ áp dụng cho phần đã nêu.

Ưu tiên hoàn thiện thông báo/chính sách, lựa chọn lưu lịch sử, rồi đồng bộ vòng đời backup. Xác minh lại văn bản còn hiệu lực tại [Thư viện Pháp luật](https://thuvienphapluat.vn) hoặc [Cơ sở dữ liệu quốc gia về pháp luật](https://vbpl.vn) và tham vấn luật sư/chuyên gia pháp lý, đặc biệt với các mục 🔴, trước quyết định triển khai.

Có thể yêu cầu tiếp: **“soạn chính sách bảo mật cho dự án này”**.
