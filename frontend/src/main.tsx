import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./app/App";
import "./app/styles.css";
import { deferredDiffieHellmanApi } from "./app/deferredGateways";
import { isDiffieHellmanEnabled } from "./features/diffieHellman/config";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App diffieHellmanGateway={isDiffieHellmanEnabled() ? deferredDiffieHellmanApi : null} />
  </StrictMode>,
);
