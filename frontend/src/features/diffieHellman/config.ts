/** Opt in only after the workspace and real Backend integration are ready. */
export const isDiffieHellmanEnabled = (): boolean =>
  import.meta.env.VITE_ENABLE_DIFFIE_HELLMAN === "true";

/** Public free hosting may need time to wake before accepting requests. */
export const getDhTimeoutMs = (): number =>
  import.meta.env.VITE_PUBLIC_MODE === "true" ? 120_000 : 15_000;
