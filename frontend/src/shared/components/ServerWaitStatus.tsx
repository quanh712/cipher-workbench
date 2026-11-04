import { useEffect, useState } from "react";
import { pendingApiRequests } from "../services/browserHistoryFetch";

export function ServerWaitStatus() {
  const [waiting, setWaiting] = useState(false);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const update = () => {
      if (!pendingApiRequests()) {
        clearTimeout(timer);
        timer = undefined;
        setWaiting(false);
      } else if (!timer) timer = setTimeout(() => setWaiting(true), 5000);
    };
    window.addEventListener("api-pending-change", update);
    update();
    return () => {
      clearTimeout(timer);
      window.removeEventListener("api-pending-change", update);
    };
  }, []);
  return waiting ? (
    <p role="status">
      Máy chủ đang xử lý hoặc khởi động lại. Lần đầu có thể mất khoảng một phút; vui lòng chờ.
    </p>
  ) : null;
}
