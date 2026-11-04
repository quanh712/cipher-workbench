import { expect, test } from "@playwright/test";

const historyKey = "cipher-workbench.history.v1";

test("public build serves UI and APIs without database, cookies, or API-to-SPA fallback", async ({
  page,
  request,
}) => {
  const response = await request.get("/api/health");
  expect(response.ok()).toBe(true);
  expect((await response.json()).result).toEqual({
    app: "ok",
    database: "disabled",
    history: "disabled",
  });
  expect((await request.get("/api/unknown")).status()).toBe(404);
  expect((await request.get("/api/history")).status()).toBe(404);
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Lịch sử thao tác", exact: true })).toBeVisible();
  for (const algorithm of ["hill", "des", "rsa", "diffie-hellman"]) {
    await expect(page.locator(`#algorithm-tab-${algorithm}`)).toBeEnabled();
  }
  expect(await page.context().cookies()).toEqual([]);
});

test("classical algorithms complete real requests from the built UI", async ({ page }) => {
  await page.goto("/");
  for (const algorithm of ["caesar", "vigenere", "playfair", "affine", "columnar"]) {
    await page.locator(`#algorithm-tab-${algorithm}`).click();
    await page.getByRole("button", { name: "Tạo ví dụ", exact: true }).click();
    const result = page.waitForResponse((response) =>
      response.url().endsWith(`/api/${algorithm}/encrypt`),
    );
    await page.getByRole("button", { name: "Mã hóa", exact: true }).click();
    const response = await result;
    expect(response.ok(), algorithm).toBe(true);
    const body = await response.json();
    expect(body.success, algorithm).toBe(true);
    expect(body.result.length, algorithm).toBeGreaterThan(0);
    await expect(page.locator(".cipher-output-panel .status--success")).toBeVisible();
  }
  await page.getByRole("button", { name: "Lịch sử thao tác", exact: true }).click();
  await expect(page.getByRole("list", { name: "Các thao tác gần đây" }).locator("li")).toHaveCount(
    5,
  );
});

test("file preview and download work while history retains no original contents", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "File .txt", exact: true }).click();
  await page.getByLabel("Chọn file văn bản").setInputFiles({
    name: "public-check.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("PRIVATE_FILE_CONTENT_TEST"),
  });
  await page.getByRole("textbox", { name: "Khóa Caesar" }).fill("3");
  await page.getByRole("button", { name: "Mã hóa", exact: true }).click();
  await expect(page.locator(".cipher-output-panel .status--success")).toBeVisible();
  const downloadEvent = page.waitForEvent("download");
  await page.getByRole("button", { name: "Tải kết quả", exact: true }).click();
  const download = await downloadEvent;
  expect(download.suggestedFilename()).toBe("public-check.encrypted.txt");
  const stream = await download.createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream!) chunks.push(Buffer.from(chunk));
  expect(Buffer.concat(chunks).toString("utf8")).toBe("SULYDWH_ILOH_FRQWHQW_WHVW");
  const stored = await page.evaluate((key) => localStorage.getItem(key), historyKey);
  expect(stored).not.toBeNull();
  expect(stored).not.toContain("PRIVATE_FILE_CONTENT_TEST");
  expect(stored).not.toContain("SULYDWH_ILOH_FRQWHQW_WHVW");
  await page.reload();
  await page.getByRole("button", { name: "Lịch sử thao tác", exact: true }).click();
  await expect(page.getByRole("list", { name: "Các thao tác gần đây" })).toBeVisible();
  await page.getByRole("button", { name: "Xóa toàn bộ lịch sử", exact: true }).click();
  await expect(page.getByText("Chưa có thao tác nào khớp bộ lọc.")).toBeVisible();
});

test("history expires after one hour while the history screen stays open", async ({ page }) => {
  await page.clock.install();
  await page.goto("/");
  await page.getByRole("button", { name: "Tạo ví dụ", exact: true }).click();
  await page.getByRole("button", { name: "Mã hóa", exact: true }).click();
  await expect(page.locator(".cipher-output-panel .status--success")).toBeVisible();
  await page.getByRole("button", { name: "Lịch sử thao tác", exact: true }).click();
  await expect(page.getByRole("list", { name: "Các thao tác gần đây" }).locator("li")).toHaveCount(
    1,
  );
  await page.clock.fastForward(3_601_000);
  await expect(page.getByText("Chưa có thao tác nào khớp bộ lọc.")).toBeVisible();
});

test("Hill and DES complete real known-vector operations", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("tab", { name: /Hill.*Khả dụng/ }).click();
  await page.getByRole("button", { name: "Tạo ví dụ", exact: true }).click();
  await page.getByRole("textbox", { name: "Văn bản đầu vào", exact: true }).fill("HELP");
  const hillResponse = page.waitForResponse((response) =>
    response.url().endsWith("/api/hill/encrypt"),
  );
  await page.getByRole("button", { name: "Mã hóa", exact: true }).click();
  expect((await (await hillResponse).json()).result).toBe("DPLE");
  await expect(page.locator(".hill-result__block")).toHaveCount(2);
  await page.getByRole("tab", { name: /DES.*Khả dụng/ }).click();
  await page.getByLabel("Khóa DES").fill("133457799BBCDFF1");
  await page.getByLabel("Định dạng DES").selectOption("hex");
  await page.getByLabel("Nội dung đầu vào DES").fill("0123456789ABCDEF");
  await page.getByRole("button", { name: "Mã hóa", exact: true }).click();
  await expect(page.getByLabel("Nội dung kết quả DES")).toHaveText("85E813540F0AB405");
});

test("RSA signature history survives reload and supports verification without the private key", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("tab", { name: /RSA.*Khả dụng/ }).click();
  await page.getByRole("tab", { name: "Chữ ký số", exact: true }).click();
  await page.getByRole("button", { name: "Tạo ví dụ", exact: true }).click();
  await page.getByRole("textbox", { name: "n · modulo", exact: true }).fill("3233");
  await page.getByRole("textbox", { name: "e · khóa công khai", exact: true }).fill("17");
  await page.getByRole("textbox", { name: "d · khóa riêng", exact: true }).fill("2753");
  await page.getByRole("textbox", { name: "Thông điệp gốc m (số)", exact: true }).fill("65");
  await page.getByRole("button", { name: "Ký", exact: true }).click();
  await expect(
    page.locator(".rsa__signature-result").getByRole("definition").filter({ hasText: /^588$/ }),
  ).toBeVisible();
  const rows = JSON.parse((await page.evaluate((key) => localStorage.getItem(key), historyKey))!);
  function verifyNoSecret(value: unknown) {
    if (value && typeof value === "object") {
      for (const [key, item] of Object.entries(value)) {
        expect(key).not.toMatch(/^(d|privateKey.*|sharedKey.*|trace|content)$/i);
        verifyNoSecret(item);
      }
    }
  }
  verifyNoSecret(rows);
  await page.reload();
  await page.getByRole("button", { name: "Lịch sử thao tác", exact: true }).click();
  await page.getByRole("button", { name: "Xem chi tiết", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Dùng lại để kiểm tra chữ ký", exact: true })
    .click();
  await expect(page.getByRole("textbox", { name: "d · khóa riêng", exact: true })).toHaveValue("");
  await expect(
    page.getByRole("textbox", { name: "Thông điệp gốc m (số)", exact: true }),
  ).toHaveValue("65");
  await page.getByRole("button", { name: "Kiểm tra", exact: true }).click();
  await expect(
    page.locator(".rsa__signature-result").getByText("Chữ ký hợp lệ", { exact: true }),
  ).toBeVisible();
});

test("Diffie–Hellman exchange works and stores only operation metadata", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("tab", { name: /Diffie–Hellman.*Khả dụng/ }).click();
  await page.getByRole("button", { name: "Tạo ví dụ", exact: true }).click();
  await page.getByRole("button", { name: "Thiết lập bí mật chung", exact: true }).click();
  await expect(page.getByRole("status", { name: "Trạng thái trao đổi DH" })).toContainText(
    "Hai bên đã thiết lập cùng bí mật chung.",
  );
  const stored = await page.evaluate((key) => localStorage.getItem(key), historyKey);
  expect(stored).not.toBeNull();
  expect(stored).not.toMatch(/privateKey|sharedKey|steps/);
  await page.getByRole("button", { name: "Lịch sử thao tác", exact: true }).click();
  await expect(page.getByRole("list", { name: "Các thao tác gần đây" })).toContainText(
    "Trao đổi khóa",
  );
  await page.setViewportSize({ width: 375, height: 812 });
  await expect(page.getByRole("heading", { name: "Lịch sử thao tác", exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
