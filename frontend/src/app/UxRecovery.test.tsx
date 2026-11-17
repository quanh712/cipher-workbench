import { act, fireEvent, render, renderHook, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { App } from "./App";
import { useCaesarCipher } from "../features/caesar/hooks/useCaesarCipher";
import { caesarApi } from "../features/caesar/services/caesarApi";
import { useRsaCipher } from "../features/rsa/hooks/useRsaCipher";
import { createRsaGateway } from "../features/rsa/test/createRsaGateway";
import { Notification } from "../shared/components/Notification";
import { HISTORY_KEY } from "../features/history/services/browserHistory";

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  localStorage.removeItem(HISTORY_KEY);
});
it("keeps a completed file preview available after download failure", async () => {
  vi.spyOn(caesarApi, "previewFile").mockResolvedValue({ success: true, result: "DEF" });
  vi.spyOn(caesarApi, "downloadFile").mockRejectedValue(new Error("offline"));
  const { result } = renderHook(() => useCaesarCipher());
  act(() => {
    result.current.setInputType("file");
    result.current.setKey("3");
  });
  await act(async () => result.current.setFile(new File(["ABC"], "input.txt")));
  await act(async () => result.current.processCipher());
  await act(async () => result.current.downloadResult());
  expect(result.current.result?.text).toBe("DEF");
  expect(result.current.processingStatus).toBe("success");
  expect(result.current.notice?.kind).toBe("error");
});
it("retains the generated RSA key when visiting history", async () => {
  const gateway = createRsaGateway();
  const { result, rerender } = renderHook(({ active }) => useRsaCipher(gateway, active), {
    initialProps: { active: true },
  });
  act(() => result.current.loadExample());
  await act(async () => result.current.generateKey());
  const key = result.current.key;
  expect(key).not.toBeNull();
  rerender({ active: false });
  rerender({ active: true });
  expect(result.current.key).toEqual(key);
});
it("keeps errors readable until explicitly dismissed", async () => {
  vi.useFakeTimers();
  const close = vi.fn();
  render(<Notification notice={{ kind: "error", message: "Thử tải lại" }} onClose={close} />);
  await vi.advanceTimersByTimeAsync(10_000);
  expect(close).not.toHaveBeenCalled();
  expect(screen.getByText("Thử tải lại")).toBeVisible();
});
it("preserves drafts when reset is cancelled and clears them only after confirmation", async () => {
  render(<App />);
  fireEvent.click(screen.getByRole("button", { name: "Tạo ví dụ" }));
  fireEvent.click(screen.getByRole("button", { name: "Mã hóa" }));
  expect(
    await screen.findByText(
      (_, element) => element?.tagName === "PRE" && element.textContent === "Khoor Zruog",
    ),
  ).toBeVisible();
  fireEvent.click(screen.getByRole("tab", { name: /Vigenère.*Khả dụng/ }));
  fireEvent.click(screen.getByRole("tab", { name: /Caesar.*Khả dụng/ }));
  expect(screen.getByRole("tabpanel", { name: "Văn bản" })).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: "Lịch sử thao tác" }));
  fireEvent.click(screen.getByRole("button", { name: "Công cụ" }));
  expect(screen.getByRole("tabpanel", { name: "Văn bản" })).toBeVisible();
  vi.mocked(window.confirm).mockReturnValue(false);
  fireEvent.click(screen.getByRole("button", { name: "Đặt lại tất cả" }));
  expect(window.confirm).toHaveBeenCalledOnce();
  expect(screen.getByRole("textbox", { name: "Nội dung đầu vào" })).toHaveValue("Hello World");
  expect(screen.getByRole("tabpanel", { name: "Văn bản" })).toBeVisible();
  vi.mocked(window.confirm).mockReturnValue(true);
  fireEvent.click(screen.getByRole("button", { name: "Đặt lại tất cả" }));
  expect(screen.getByRole("textbox", { name: "Nội dung đầu vào" })).toHaveValue("");
  expect(screen.queryByText("Khoor Zruog")).not.toBeInTheDocument();
  const unload = new Event("beforeunload", { cancelable: true });
  window.dispatchEvent(unload);
  expect(unload.defaultPrevented).toBe(false);
});
it("reports a history storage failure beside a successful result", async () => {
  render(<App />);
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
    throw new Error("full");
  });
  fireEvent.click(screen.getByRole("button", { name: "Tạo ví dụ" }));
  fireEvent.click(screen.getByRole("button", { name: "Mã hóa" }));
  expect(
    await screen.findByText(
      (_, element) => element?.tagName === "PRE" && element.textContent === "Khoor Zruog",
    ),
  ).toBeVisible();
  expect(screen.getByRole("alert")).toHaveTextContent("không cho lưu lịch sử");
});
