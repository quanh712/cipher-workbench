import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { HistoryWorkspace } from "./HistoryWorkspace";
import { appendBrowserHistory, HISTORY_KEY, HISTORY_TTL } from "../services/browserHistory";
const row = {
  id: 1,
  createdAt: "",
  cipher: "caesar" as const,
  operation: "encrypt" as const,
  source: "text" as const,
  responseMode: null,
  inputLength: 5,
  outputLength: 5,
  httpStatus: 200,
  succeeded: true,
  durationMs: 1,
};
beforeEach(() => {
  localStorage.removeItem(HISTORY_KEY);
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});
it("shows local metadata and filters without any server request", async () => {
  const fetch = vi.spyOn(globalThis, "fetch");
  appendBrowserHistory({ ...row, createdAt: new Date().toISOString() });
  render(<HistoryWorkspace />);
  expect(await screen.findByText("Thành công")).toBeVisible();
  expect(screen.getByText(/lưu tối đa 1 giờ/)).toBeVisible();
  await userEvent.selectOptions(screen.getByLabelText("Thuật toán"), "affine");
  expect(await screen.findByText("Chưa có thao tác nào khớp bộ lọc.")).toBeVisible();
  expect(fetch).not.toHaveBeenCalled();
});
it("clears browser history", async () => {
  appendBrowserHistory({ ...row, createdAt: new Date().toISOString() });
  render(<HistoryWorkspace />);
  await screen.findByText("Thành công");
  await userEvent.click(screen.getByRole("button", { name: "Xóa toàn bộ lịch sử" }));
  expect(await screen.findByText("Chưa có thao tác nào khớp bộ lọc.")).toBeVisible();
});
it("removes stale rows while the history screen remains open", async () => {
  vi.useFakeTimers();
  appendBrowserHistory({
    ...row,
    createdAt: new Date(Date.now() - HISTORY_TTL + 1500).toISOString(),
  });
  render(<HistoryWorkspace />);
  await act(async () => {
    await vi.advanceTimersByTimeAsync(1);
  });
  expect(screen.getByText("Thành công")).toBeVisible();
  await act(async () => {
    await vi.advanceTimersByTimeAsync(2000);
  });
  expect(screen.queryByText("Thành công")).not.toBeInTheDocument();
});
