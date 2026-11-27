import { StrictMode } from "react";
import { createRoot, hydrateRoot } from "react-dom/client";
import { App } from "./app/App";
import "./app/styles.css";
import { deferredDiffieHellmanApi } from "./app/deferredGateways";
import { isDiffieHellmanEnabled } from "./features/diffieHellman/config";

const root = document.getElementById("root")!;
const app = (
  <StrictMode>
    <App diffieHellmanGateway={isDiffieHellmanEnabled() ? deferredDiffieHellmanApi : null} />
  </StrictMode>
);

// Production HTML already contains the initial workspace. Attach handlers to
// that DOM instead of discarding it and delaying the first meaningful paint.
if (root.hasChildNodes()) hydrateRoot(root, app);
else createRoot(root).render(app);
