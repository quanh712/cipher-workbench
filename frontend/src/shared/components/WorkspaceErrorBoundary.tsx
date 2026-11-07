import { Component, type ReactNode } from "react";

/** Keep navigation and other drafts available if a workspace chunk cannot load. */
export class WorkspaceErrorBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <section className="panel workspace-error" role="alert">
        <h2>Không thể mở giao diện này</h2>
        <p>Kiểm tra kết nối mạng. Bạn có thể chọn công cụ khác hoặc tải lại trang để thử lại.</p>
        <p>Tải lại trang sẽ xóa dữ liệu đang nhập chưa được tải xuống hoặc sao chép.</p>
        <button
          className="button button--secondary"
          type="button"
          onClick={() => window.location.reload()}
        >
          Tải lại trang
        </button>
      </section>
    );
  }
}
