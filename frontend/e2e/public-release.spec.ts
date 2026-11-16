import { expect, test } from "@playwright/test";

const historyKey = "cipher-workbench.history.v1";

test("first paint needs no external stylesheet or theme script and respects saved theme", async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.addInitScript(() => {
    localStorage.setItem("cipher-workbench-theme", "dark");
  });
  const requests: string[] = [];
  page.on("request", (request) => requests.push(request.url()));
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Caesar", exact: true })).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  expect(requests.some((url) => /theme-bootstrap\.js|\.css(?:\?|$)/.test(url))).toBe(false);
  expect(requests.some((url) => /\/(rsaApi|desApi|diffieHellmanApi)-/.test(url))).toBe(false);
  await page.getByRole("button", { name: "Chuyển sang nền sáng" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
});

test("theme uses system preference when browser storage is unavailable", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.addInitScript(() => {
    Storage.prototype.getItem = () => {
      throw new DOMException("Storage unavailable", "SecurityError");
    };
  });
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(page.getByRole("heading", { name: "Caesar", exact: true })).toBeVisible();
});

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
  expect((await request.get("/favicon.svg")).headers()["content-type"]).toContain("image/svg+xml");
  await page.goto("/");
  await expect(page.locator('link[rel="icon"]')).toHaveAttribute("href", "/favicon.svg");
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
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Xóa toàn bộ lịch sử", exact: true }).click();
  await expect(page.getByText("Chưa có thao tác nào khớp bộ lọc.")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Xóa toàn bộ lịch sử", exact: true }),
  ).toBeDisabled();
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
  await expect(
    page.getByRole("button", { name: "Xóa toàn bộ lịch sử", exact: true }),
  ).toBeDisabled();
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
  await page.getByRole("tab", { name: "Chữ ký số nguyên", exact: true }).click();
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

test("keeps RSA keys through history and offers a compact mobile selector", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("tab", { name: /RSA.*Khả dụng/ }).click();
  await page.getByRole("button", { name: "Tạo ví dụ", exact: true }).click();
  await page.getByRole("button", { name: "Tạo khóa", exact: true }).click();
  await expect(page.getByText("{7, 187}", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Lịch sử thao tác", exact: true }).click();
  await page.getByRole("button", { name: "Công cụ", exact: true }).click();
  await expect(page.getByText("{7, 187}", { exact: true })).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole("combobox", { name: "Chọn thuật toán" })).toBeVisible();
  await expect(page.getByRole("tablist", { name: "Thuật toán mật mã" })).toBeHidden();
  await page.getByRole("combobox", { name: "Chọn thuật toán" }).selectOption("caesar");
  await page.getByRole("button", { name: "Tạo ví dụ", exact: true }).click();
  await page.getByRole("button", { name: "Mã hóa", exact: true }).click();
  await expect(page.locator("#algorithm-panel-caesar pre.output")).toHaveText("Khoor Zruog");
  await page.getByRole("combobox", { name: "Chọn thuật toán" }).selectOption("rsa");
  await expect(page.getByText("{7, 187}", { exact: true })).toBeVisible();
  await page.getByRole("combobox", { name: "Chọn thuật toán" }).selectOption("caesar");
  await expect(page.locator("#algorithm-panel-caesar pre.output")).toHaveText("Khoor Zruog");
});

test("privacy policy opens from footer and preserves work on desktop and mobile", async ({
  page,
}) => {
  await page.goto("/");
  const input = page.getByRole("textbox", { name: "Nội dung đầu vào", exact: true });
  await page.getByRole("button", { name: "Tạo ví dụ", exact: true }).click();
  await expect(input).toHaveValue("Hello World");
  for (const viewport of [
    { width: 1280, height: 800 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    const link = page.getByRole("link", { name: "Chính sách bảo mật", exact: true });
    await link.click();
    const dialog = page.getByRole("dialog", { name: "Chính sách bảo mật", exact: true });
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText("Chính sách đang được hoàn thiện.");
    await expect(dialog).toContainText("Singapore");
    await expect(dialog).toContainText("1 giờ");
    await expect(dialog).not.toContainText("[ĐIỀN");
    await expect(dialog).not.toContainText("[KIỂM TRA");
    expect(await dialog.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(
      true,
    );
    await dialog
      .getByRole("heading", { name: "6. Bảo vệ dữ liệu và cập nhật" })
      .scrollIntoViewIfNeeded();
    await dialog.getByRole("button", { name: "Đóng", exact: true }).click();
    await expect(dialog).not.toBeVisible();
    await expect(link).toBeFocused();
    await expect(input).toHaveValue("Hello World");
    await link.click();
    await page.keyboard.press("Escape");
    await expect(dialog).not.toBeVisible();
  }
  page.on("dialog", (dialog) => dialog.accept());
  await page.goto("/#chinh-sach-bao-mat");
  await expect(page.getByRole("dialog", { name: "Chính sách bảo mật", exact: true })).toBeVisible();
});

test("PEM example signs text and verifies the same content from a TXT file", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("tab", { name: /RSA.*Khả dụng/ }).click();
  await page.getByRole("tab", { name: "Chữ ký PEM", exact: true }).click();
  await page.getByRole("button", { name: "Tạo ví dụ", exact: true }).click();
  await expect(page.getByText(/Đã tạo bộ mẫu RSA 2048 bit/)).toBeVisible();
  const message = await page.getByLabel("Nội dung ký / kiểm tra", { exact: true }).inputValue();
  await page.getByRole("button", { name: "Ký PEM", exact: true }).click();
  await expect(page.getByText("Ký PEM thành công.", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Private key PEM", { exact: true })).toHaveValue("");
  await page.getByRole("button", { name: "Dùng để kiểm tra" }).click();
  await page.getByLabel("Nguồn nội dung").selectOption("file");
  await page.getByLabel(/File ký/).setInputFiles({
    name: "pem-example.txt",
    mimeType: "text/plain",
    buffer: Buffer.from(message),
  });
  await expect(page.getByText("pem-example.txt", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Kiểm tra PEM", exact: true }).click();
  await expect(page.getByText("Chữ ký hợp lệ.", { exact: true })).toBeVisible();
});

test("defers RSA code until selected and serves fingerprinted assets with immutable caching", async ({
  page,
}) => {
  const scripts: string[] = [];
  page.on("request", (request) => {
    if (request.resourceType() === "script") scripts.push(request.url());
  });
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Caesar", exact: true })).toBeVisible();
  expect(scripts.some((url) => /RsaWorkspace-.*\.js/.test(url))).toBe(false);
  const chunk = page.waitForResponse((response) =>
    /\/assets\/RsaWorkspace-.*\.js$/.test(response.url()),
  );
  await page.getByRole("tab", { name: /RSA.*Khả dụng/ }).click();
  const response = await chunk;
  expect(response.headers()["cache-control"]).toBe("public, max-age=31536000, immutable");
  await expect(page.getByRole("heading", { name: "RSA từng bước" })).toBeVisible();
  await page.getByRole("tab", { name: /Caesar.*Khả dụng/ }).click();
  await page.getByRole("tab", { name: /RSA.*Khả dụng/ }).click();
  await expect(page.getByRole("heading", { name: "RSA từng bước" })).toBeVisible();
  expect(scripts.filter((url) => /RsaWorkspace-.*\.js/.test(url))).toHaveLength(1);
  const fonts = await page.evaluate(async () => {
    await document.fonts.ready;
    return [
      document.fonts.check('500 16px "Barlow"', "Tiếng Việt"),
      document.fonts.check('700 16px "Barlow Condensed"', "Tiếng Việt"),
      ...performance
        .getEntriesByType("resource")
        .map((resource) => resource.name)
        .filter((name) => name.includes("/fonts/")),
    ];
  });
  expect(fonts.slice(0, 2)).toEqual([true, true]);
  expect(fonts.slice(2)).toHaveLength(2);
  expect(fonts.slice(2).every((url) => String(url).endsWith(".woff2"))).toBe(true);
});

test("workspace download failure preserves navigation and other drafts", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Tạo ví dụ", exact: true }).click();
  await page.route("**/assets/RsaWorkspace-*.js", (route) => route.abort("failed"));
  await page.locator("#algorithm-tab-rsa").click();
  await expect(page.getByRole("heading", { name: "Không thể mở giao diện này" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Tải lại trang", exact: true })).toBeVisible();
  await page.locator("#algorithm-tab-caesar").click();
  await expect(page.getByRole("textbox", { name: "Nội dung đầu vào", exact: true })).toHaveValue(
    "Hello World",
  );
  await page.getByRole("button", { name: "Mã hóa", exact: true }).click();
  await expect(page.locator("#algorithm-panel-caesar pre.output")).toHaveText("Khoor Zruog");
  await page.unroute("**/assets/RsaWorkspace-*.js");
  await page.locator("#algorithm-tab-rsa").click();
  await page.getByRole("button", { name: "Tải lại trang", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Caesar", exact: true })).toBeVisible();
  await page.locator("#algorithm-tab-rsa").click();
  await expect(page.getByRole("heading", { name: "RSA từng bước", exact: true })).toBeVisible();
});

test("PEM keeps public drafts across views, rejects old keys and explains history", async ({
  page,
}) => {
  await page.goto("/");
  await page.locator("#algorithm-tab-rsa").click();
  await page.getByRole("tab", { name: "Chữ ký PEM", exact: true }).click();
  await page.getByRole("button", { name: "Tạo ví dụ", exact: true }).click();
  await expect(page.getByText(/Đã tạo bộ mẫu RSA 2048 bit/)).toBeVisible();
  const message = page.getByLabel("Nội dung ký / kiểm tra", { exact: true });
  await message.fill("Tiếng Việt");
  await page.getByRole("button", { name: "Lịch sử thao tác", exact: true }).click();
  await page.getByRole("button", { name: "Công cụ", exact: true }).click();
  await expect(message).toHaveValue("Tiếng Việt");
  await expect(page.getByLabel("Private key PEM", { exact: true })).toHaveValue("");
  await page.getByRole("tab", { name: "Chữ ký số nguyên", exact: true }).click();
  await page.getByRole("tab", { name: "Chữ ký PEM", exact: true }).click();
  await expect(message).toHaveValue("Tiếng Việt");
  await page.getByRole("button", { name: "Tạo ví dụ", exact: true }).click();
  await expect(page.getByLabel("Private key PEM", { exact: true })).not.toHaveValue("");
  await page.getByLabel("Chọn file private key PEM", { exact: true }).setInputFiles({
    name: "wrong.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("wrong"),
  });
  await expect(page.getByLabel("Private key PEM", { exact: true })).toHaveValue("");
  await page.getByRole("button", { name: "Ký PEM", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("Chọn hoặc dán lại khóa PEM");
  await page.getByRole("button", { name: "Tạo ví dụ", exact: true }).click();
  await expect(page.getByLabel("Private key PEM", { exact: true })).not.toHaveValue("");
  await message.fill("Tiếng Việt");
  await page.getByRole("button", { name: "Ký PEM", exact: true }).click();
  await expect(page.getByText("Ký PEM thành công.", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Dùng để kiểm tra", exact: true }).click();
  const signature = await page.getByLabel("Chữ ký base64", { exact: true }).inputValue();
  await page.getByRole("button", { name: "Lịch sử thao tác", exact: true }).click();
  await page.getByRole("button", { name: "Xem chi tiết", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toContainText("14 byte");
  await expect(dialog).toContainText("Lịch sử PEM chỉ lưu thông tin thao tác");
  await expect(dialog).not.toContainText("Không có dữ liệu");
  await dialog.getByRole("button", { name: "Đóng", exact: true }).click();
  await page.getByRole("button", { name: "Công cụ", exact: true }).click();
  await expect(page.getByLabel("Chữ ký base64", { exact: true })).toHaveValue(signature);
  await page.getByRole("button", { name: "Kiểm tra PEM", exact: true }).click();
  await expect(page.getByText("Chữ ký hợp lệ.", { exact: true })).toBeVisible();
});
