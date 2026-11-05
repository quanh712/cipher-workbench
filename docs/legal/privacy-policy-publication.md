# Công bố thông tin bảo mật — 05/11/2026

Nội dung hiển thị cho người dùng nằm tại `frontend/src/shared/components/PrivacyPolicy.tsx`.
Liên kết ở footer mở dialog; URL `/#chinh-sach-bao-mat` mở trực tiếp.

Bản 0.3 công bố thông tin xử lý dữ liệu đã đối chiếu với mã nguồn. Nội dung vẫn
được đánh dấu đang hoàn thiện vì chủ dự án chưa chốt định danh bên vận hành,
kênh tiếp nhận yêu cầu và thời hạn log hạ tầng. Không công khai email hoặc địa chỉ
theo lựa chọn của chủ dự án. Không giả định đã có form tiếp nhận hoặc cơ chế đồng ý.

Bằng chứng: `browserHistoryFetch.ts` (nội dung request và danh sách trường lịch sử),
`browserHistory.ts` (TTL, giới hạn và xóa), `useTheme.ts` (giao diện),
`backend/app/api/routes_file.py` và `routes_rsa_signatures.py` (file/khóa),
`backend/app/main.py` (public mode), `backend/app/errors/handlers.py` (log lỗi),
`render.yaml` (Singapore). Không xác nhận vòng đời log và file tạm của nhà cung cấp.

Căn cứ đối chiếu quyền dữ liệu: Luật 91/2025/QH15 (ban hành 26/06/2025,
hiệu lực 01/01/2026), Điều 4, 9, 10, 14 và 20; Nghị định 356/2025/NĐ-CP
(ban hành 31/12/2025, hiệu lực 01/01/2026), Điều 5–6.

- https://congbaocdn.chinhphu.vn/CongBaoCP/CongBao/2025/7/45574/57723-1-971-972.pdf
- https://congbaocdn.chinhphu.vn/180507251028987904/2026/1/17/356signed-1768638052103952849513.pdf

Đây vẫn là bản thông tin đang hoàn thiện, cần người có chuyên môn pháp lý xem lại.
Việc đăng không thay thế quy trình thực hiện quyền, xác định căn cứ xử lý,
bằng chứng đồng ý khi cần, hoặc đánh giá nghĩa vụ chuyển dữ liệu ra nước ngoài.
