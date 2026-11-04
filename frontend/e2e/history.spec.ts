import { expect, test } from "@playwright/test";

const historyKey = "cipher-workbench.history.v1";

test("persists cipher metadata in this browser without a server history API", async ({ page }) => {
  const historyRequests: string[] = [];
  page.on("request", (request) => {
    if (/\/api\/(?:rsa\/|dh\/)?history(?:[/?]|$)/.test(request.url()))
      historyRequests.push(request.url());
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Tạo ví dụ", exact: true }).click();
  await page.getByRole("button", { name: "Mã hóa", exact: true }).click();
  await expect(page.getByText("Mã hóa thành công.", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Lịch sử thao tác", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Lịch sử thao tác", exact: true })).toBeVisible();
  const rows = page.getByRole("list", { name: "Các thao tác gần đây" });
  await expect(rows.getByText("Caesar", { exact: true })).toBeVisible();
  await expect(page.getByText(/lưu tối đa 1 giờ/)).toBeVisible();
  const saved = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key) ?? "[]"),
    historyKey,
  );
  expect(saved).toHaveLength(1);
  expect(saved[0]).toMatchObject({
    cipher: "caesar",
    operation: "encrypt",
    source: "text",
    succeeded: true,
  });
  expect(saved[0]).not.toHaveProperty("text");
  expect(saved[0]).not.toHaveProperty("key");
  await page.reload();
  await page.getByRole("button", { name: "Lịch sử thao tác", exact: true }).click();
  await expect(rows.getByText("Caesar", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Xóa toàn bộ lịch sử", exact: true }).click();
  await expect(page.getByText("Chưa có thao tác nào khớp bộ lọc.", { exact: true })).toBeVisible();
  expect(historyRequests).toEqual([]);
});
