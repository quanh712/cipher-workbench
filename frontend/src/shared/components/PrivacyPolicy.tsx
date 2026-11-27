import { useEffect, useLayoutEffect, useRef, useState } from "react";
import "./PrivacyPolicy.css";

const policyHash = "#chinh-sach-bao-mat";

export function PrivacyPolicy() {
  const [open, setOpen] = useState(
    () => typeof window !== "undefined" && window.location.hash === policyHash,
  );
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLAnchorElement>(null);
  useEffect(() => {
    const update = () => setOpen(window.location.hash === policyHash);
    window.addEventListener("hashchange", update);
    return () => window.removeEventListener("hashchange", update);
  }, []);
  // Establish the native modal/focus state before the browser can process the
  // next keyboard event (notably Escape immediately after opening the link).
  useLayoutEffect(() => {
    if (!open) return;
    const element = dialog.current!;
    const previousFocus = document.activeElement;
    const triggerElement = trigger.current;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    element.showModal();
    return () => {
      element.close();
      document.body.style.overflow = overflow;
      if (previousFocus instanceof HTMLElement && previousFocus !== document.body)
        previousFocus.focus();
      else triggerElement?.focus();
    };
  }, [open]);
  function close() {
    if (window.location.hash === policyHash)
      window.history.replaceState(null, "", window.location.pathname + window.location.search);
    setOpen(false);
  }
  return (
    <>
      <footer className="site-footer">
        <span>Cipher Workbench</span>
        <a
          ref={trigger}
          href={policyHash}
          aria-haspopup="dialog"
          onClick={(event) => {
            event.preventDefault();
            if (window.location.hash !== policyHash) window.history.pushState(null, "", policyHash);
            setOpen(true);
          }}
        >
          Chính sách bảo mật
        </a>
      </footer>
      {open && (
        <dialog
          ref={dialog}
          className="privacy-dialog"
          aria-labelledby="privacy-title"
          onCancel={(event) => {
            event.preventDefault();
            close();
          }}
          onClick={(event) => {
            if (event.target !== event.currentTarget) return;
            const bounds = event.currentTarget.getBoundingClientRect();
            if (
              event.clientX < bounds.left ||
              event.clientX > bounds.right ||
              event.clientY < bounds.top ||
              event.clientY > bounds.bottom
            )
              close();
          }}
        >
          <header className="privacy-dialog__header">
            <h2 id="privacy-title">Chính sách bảo mật</h2>
            <button type="button" className="button button--secondary" onClick={close} autoFocus>
              Đóng
            </button>
          </header>
          <article
            className="privacy-dialog__content"
            tabIndex={0}
            aria-label="Nội dung chính sách"
          >
            <p className="privacy-dialog__version">Bản thông tin 0.3 · Cập nhật ngày 05/11/2026</p>
            <aside className="privacy-dialog__notice">
              <strong>Chính sách đang được hoàn thiện.</strong> Thông tin định danh bên vận hành,
              kênh tiếp nhận yêu cầu về dữ liệu và thời hạn lưu log hạ tầng chưa được công bố. Nội
              dung dưới đây mô tả cách ứng dụng hiện xử lý dữ liệu; việc công bố này không thay thế
              cơ chế đồng ý hoặc quy trình thực hiện quyền về dữ liệu.
            </aside>
            <h3>1. Phạm vi và mục đích</h3>
            <p>
              Cipher Workbench là công cụ thực hành mã hóa, giải mã, chữ ký RSA và trao đổi khóa
              Diffie–Hellman. Bạn không cần tạo tài khoản hay cung cấp họ tên, email hoặc số điện
              thoại để sử dụng công cụ.
            </p>
            <h3>2. Dữ liệu gửi tới máy chủ</h3>
            <p>
              Khi thực hiện thao tác, ứng dụng gửi dữ liệu qua HTTPS tới backend để xử lý và trả kết
              quả. Tùy chức năng, dữ liệu gồm văn bản hoặc số đầu vào, nội dung và tên file, thuật
              toán, tham số, khóa công khai, khóa bí mật hoặc khóa riêng, chữ ký và mật khẩu mở khóa
              RSA nếu bạn cung cấp.
            </p>
            <p>
              <strong>Các phép toán không chạy hoàn toàn trên thiết bị của bạn.</strong> Không lưu
              khóa trong lịch sử không có nghĩa khóa chưa được gửi tới máy chủ.
            </p>
            <p>
              Chỉ sử dụng dữ liệu giả lập và khóa thử nghiệm. Không nhập khóa đang dùng thực tế, mật
              khẩu tài khoản, giấy tờ định danh, thông tin sức khỏe, tài chính hoặc dữ liệu riêng
              tư. Chỉ cung cấp nội dung của người khác khi bạn có quyền hợp pháp.
            </p>
            <h3>3. Lịch sử và bộ nhớ trình duyệt</h3>
            <p>
              Lịch sử được ghi tự động trong localStorage của trình duyệt, không đồng bộ giữa các
              thiết bị. Bản ghi gồm thời điểm, thuật toán, thao tác, loại đầu vào, độ dài hoặc kích
              thước, trạng thái và thời gian xử lý. Chế độ chữ ký RSA số nguyên còn lưu số đầu vào,
              khóa công khai, chữ ký và giá trị khôi phục khi có.
            </p>
            <p>
              Lịch sử không lưu khóa bí mật, mật khẩu mở khóa hoặc nội dung file tải lên. Bản ghi
              hết hạn sau <strong>1 giờ</strong> và được dọn khi ứng dụng đọc lại lịch sử. Nếu trang
              đóng hoặc trình duyệt ngừng hoạt động, dữ liệu có thể còn trên thiết bị tới lần kiểm
              tra tiếp theo. Giới hạn là 100 bản ghi và khoảng 256 KB; bản ghi cũ có thể bị loại sớm
              hơn khi vượt giới hạn.
            </p>
            <p>
              Bạn có thể xóa từng bản ghi hoặc toàn bộ trong mục Lịch sử thao tác, hoặc xóa dữ liệu
              website trong cài đặt trình duyệt. Người dùng chung hồ sơ trình duyệt có thể xem lịch
              sử. Lựa chọn giao diện sáng/tối được lưu riêng, không tự hết hạn; nút xóa lịch sử
              không xóa lựa chọn giao diện.
            </p>
            <h3>4. Hạ tầng và dữ liệu kỹ thuật</h3>
            <p>
              Website sử dụng Render; backend được cấu hình tại Singapore, ngoài Việt Nam. Dữ liệu
              cần thiết cho yêu cầu được truyền tới hạ tầng này để xử lý. Khu vực backend không bảo
              đảm mọi log hoặc dữ liệu hạ tầng đều chỉ nằm tại Singapore.
            </p>
            <p>
              Bản public tắt database và lịch sử trên server. Log lỗi ứng dụng có thể chứa loại lỗi,
              phương thức và đường dẫn yêu cầu, thời điểm và vị trí mã gặp lỗi để chẩn đoán. Máy chủ
              và Render cũng có thể xử lý thông tin kết nối, access log và file tạm; thời hạn lưu và
              vòng đời các dữ liệu này chưa được xác nhận trong bản thông tin này. Không có bảo đảm
              mọi bản sao kỹ thuật bị xóa ngay khi trả kết quả.
            </p>
            <p>
              Các luồng ứng dụng đã rà soát không tích hợp công cụ phân tích quảng cáo hoặc API AI.
              File kết quả đã tải xuống do bạn quản lý trên thiết bị.
            </p>
            <h3>5. Lựa chọn và quyền về dữ liệu</h3>
            <p>
              Việc mở trang, đọc chính sách hoặc im lặng không được xem là đồng ý cho mọi hoạt động
              xử lý. Bạn có thể ngừng gửi yêu cầu mới và xóa dữ liệu trong trình duyệt; những thao
              tác này không xóa log hạ tầng.
            </p>
            <p>
              Theo phạm vi pháp luật áp dụng, bạn có quyền được biết, đồng ý hoặc không đồng ý, rút
              lại đồng ý; xem, chỉnh sửa, yêu cầu cung cấp, xóa, hạn chế xử lý hoặc phản đối; khiếu
              nại, tố cáo, khởi kiện và yêu cầu bồi thường. Website hiện chưa công bố kênh tiếp nhận
              yêu cầu, nên chưa thể tiếp nhận những yêu cầu này trực tiếp trên trang. Không gửi thêm
              khóa bí mật hoặc tài liệu nhạy cảm để mô tả vấn đề.
            </p>
            <h3>6. Bảo vệ dữ liệu và cập nhật</h3>
            <p>
              Website sử dụng HTTPS và giới hạn các trường được ghi vào lịch sử trình duyệt. Các
              biện pháp này không bảo đảm an toàn tuyệt đối hoặc mã hóa đầu cuối.
            </p>
            <p>
              Nội dung sẽ được cập nhật khi có thay đổi về xử lý dữ liệu hoặc khi hoàn thiện thông
              tin bên vận hành, kênh tiếp nhận và quy trình xử lý yêu cầu. Phiên bản và ngày cập
              nhật được hiển thị ở đầu chính sách.
            </p>
          </article>
        </dialog>
      )}
    </>
  );
}
