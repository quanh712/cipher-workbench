import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useCaesarCipher } from "./useCaesarCipher";

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

describe("useCaesarCipher", () => {
  it("keeps the latest file content when reads finish out of order", async () => {
    const firstRead = createDeferred<string>();
    const secondRead = createDeferred<string>();
    const firstFile = new File(["first"], "first.txt", { type: "text/plain" });
    const secondFile = new File(["second"], "second.txt", { type: "text/plain" });
    Object.defineProperty(firstFile, "text", { value: () => firstRead.promise });
    Object.defineProperty(secondFile, "text", { value: () => secondRead.promise });
    const { result } = renderHook(() => useCaesarCipher());

    let firstOperation!: Promise<void>;
    let secondOperation!: Promise<void>;
    act(() => {
      firstOperation = result.current.setFile(firstFile);
      secondOperation = result.current.setFile(secondFile);
    });

    await act(async () => {
      secondRead.resolve("second content");
      await secondOperation;
    });
    expect(result.current.file?.name).toBe("second.txt");
    expect(result.current.fileText).toBe("second content");

    await act(async () => {
      firstRead.resolve("stale first content");
      await firstOperation;
    });
    expect(result.current.file?.name).toBe("second.txt");
    expect(result.current.fileText).toBe("second content");
  });
});
