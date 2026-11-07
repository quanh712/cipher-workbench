import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { RsaPemPanel } from "./RsaPemPanel";
import { createRsaGateway } from "../test/createRsaGateway";
import type { PemResult } from "../services/rsaGateway";

const signed: PemResult = {
  mode: "standard",
  source: "text",
  signature: "YWJj",
  publicKeyPem: "PUBLIC PEM",
  contentBytes: 3,
  sha256: "a".repeat(64),
};
function setup() {
  const gateway = { ...createRsaGateway(), standardSignature: vi.fn().mockResolvedValue(signed) };
  const view = render(<RsaPemPanel gateway={gateway} />);
  fireEvent.change(screen.getByLabelText("Nội dung ký / kiểm tra"), { target: { value: "abc" } });
  fireEvent.change(screen.getByLabelText("Private key PEM"), { target: { value: "PRIVATE PEM" } });
  return { gateway, ...view };
}
describe("PEM workspace", () => {
  it("signs explicitly, clears secrets, then transfers result for verification", async () => {
    const { gateway } = setup();
    expect(gateway.standardSignature).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText("Mật khẩu khóa (nếu có)"), {
      target: { value: "secret" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Ký PEM" }));
    await screen.findByText("Ký PEM thành công.");
    expect(gateway.standardSignature).toHaveBeenCalledWith(
      "sign",
      { source: "text", text: "abc", privateKeyPem: "PRIVATE PEM", passphrase: "secret" },
      expect.any(AbortSignal),
    );
    expect(screen.getByLabelText("Private key PEM")).toHaveValue("");
    expect(screen.getByLabelText("Mật khẩu khóa (nếu có)")).toHaveValue("");
    expect(screen.getByLabelText("Chữ ký đã tạo")).toHaveAttribute("readonly");
    fireEvent.click(screen.getByRole("button", { name: "Dùng để kiểm tra" }));
    expect(screen.getByLabelText("Public key PEM")).toHaveValue("PUBLIC PEM");
    expect(screen.getByLabelText("Chữ ký base64")).toHaveValue("YWJj");
    gateway.standardSignature.mockResolvedValue({
      ...signed,
      signature: undefined,
      publicKeyPem: undefined,
      valid: false,
    });
    fireEvent.click(screen.getByRole("button", { name: "Kiểm tra PEM" }));
    await screen.findByText(/Chữ ký không hợp lệ:/);
    expect(gateway.standardSignature.mock.calls[1][1]).not.toHaveProperty("privateKeyPem");
  });
  it("sends original file bytes as multipart and rejects oversized files", async () => {
    const { gateway } = setup();
    fireEvent.change(screen.getByLabelText("Nguồn nội dung"), { target: { value: "file" } });
    const file = new File(["\ufeffabc\r\n"], "message.txt");
    fireEvent.change(screen.getByLabelText(/File ký/), { target: { files: [file] } });
    fireEvent.click(screen.getByRole("button", { name: "Ký PEM" }));
    await waitFor(() => expect(gateway.standardSignature).toHaveBeenCalledOnce());
    const form = gateway.standardSignature.mock.calls[0][1] as FormData;
    expect(form.get("file")).toBe(file);
    expect(form.get("source")).toBeNull();
  });
  it("imports private and public PEM files and rejects oversized keys", async () => {
    setup();
    const privateFile = new File(["PRIVATE KEY"], "private.pem");
    Object.defineProperty(privateFile, "text", { value: async () => "PRIVATE KEY" });
    fireEvent.change(screen.getByLabelText("Chọn file private key PEM"), {
      target: { files: [privateFile] },
    });
    await waitFor(() =>
      expect(screen.getByLabelText("Private key PEM")).toHaveValue("PRIVATE KEY"),
    );
    fireEvent.change(screen.getByLabelText("Thao tác PEM"), { target: { value: "verify" } });
    const publicFile = new File(["PUBLIC KEY"], "public.pem");
    Object.defineProperty(publicFile, "text", { value: async () => "PUBLIC KEY" });
    fireEvent.change(screen.getByLabelText("Chọn file public key PEM"), {
      target: { files: [publicFile] },
    });
    await waitFor(() => expect(screen.getByLabelText("Public key PEM")).toHaveValue("PUBLIC KEY"));
    fireEvent.change(screen.getByLabelText("Chọn file public key PEM"), {
      target: { files: [new File(["x".repeat(65537)], "large.pem")] },
    });
    expect(await screen.findByRole("alert")).toHaveTextContent("tối đa 64 KiB");
  });
  it("discards an imported private key after switching operation", async () => {
    setup();
    let resolve!: (value: string) => void;
    const file = new File(["secret"], "private.pem");
    Object.defineProperty(file, "text", {
      value: () =>
        new Promise<string>((done) => {
          resolve = done;
        }),
    });
    fireEvent.change(screen.getByLabelText("Chọn file private key PEM"), {
      target: { files: [file] },
    });
    fireEvent.change(screen.getByLabelText("Thao tác PEM"), { target: { value: "verify" } });
    await act(async () => resolve("PRIVATE KEY"));
    fireEvent.change(screen.getByLabelText("Thao tác PEM"), { target: { value: "sign" } });
    expect(screen.getByLabelText("Private key PEM")).toHaveValue("");
  });
  it("aborts and discards a response after editing", async () => {
    const { gateway } = setup();
    let resolve!: (result: PemResult) => void;
    gateway.standardSignature.mockImplementation(
      () =>
        new Promise((done) => {
          resolve = done;
        }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Ký PEM" }));
    const signal = gateway.standardSignature.mock.calls[0][2] as AbortSignal;
    fireEvent.change(screen.getByLabelText("Nội dung ký / kiểm tra"), {
      target: { value: "changed" },
    });
    expect(signal.aborted).toBe(true);
    await act(async () => resolve(signed));
    expect(screen.queryByText("Ký PEM thành công.")).toBeNull();
  });
});

it("keeps the message while clearing secrets and aborting when leaving PEM", async () => {
  const { gateway, rerender } = setup();
  gateway.standardSignature.mockImplementation(() => new Promise(() => {}));
  fireEvent.change(screen.getByLabelText("Mật khẩu khóa (nếu có)"), {
    target: { value: "secret" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Ký PEM" }));
  const signal = gateway.standardSignature.mock.calls[0][2] as AbortSignal;
  rerender(<RsaPemPanel gateway={gateway} active={false} />);
  expect(signal.aborted).toBe(true);
  rerender(<RsaPemPanel gateway={gateway} active />);
  expect(screen.getByLabelText("Nội dung ký / kiểm tra")).toHaveValue("abc");
  expect(screen.getByLabelText("Private key PEM")).toHaveValue("");
  expect(screen.getByLabelText("Mật khẩu khóa (nếu có)")).toHaveValue("");
});

it("cannot sign using the previous key after a replacement file is rejected", async () => {
  const { gateway } = setup();
  fireEvent.change(screen.getByLabelText("Chọn file private key PEM"), {
    target: { files: [new File(["wrong"], "wrong.txt")] },
  });
  expect(await screen.findByRole("alert")).toHaveTextContent(".pem");
  expect(screen.getByLabelText("Private key PEM")).toHaveValue("");
  fireEvent.click(screen.getByRole("button", { name: "Ký PEM" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Chọn hoặc dán lại khóa PEM");
  expect(gateway.standardSignature).not.toHaveBeenCalled();
});
