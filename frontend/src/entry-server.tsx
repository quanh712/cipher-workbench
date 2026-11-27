import { renderToString } from "preact-render-to-string";
import { App } from "./app/App";

// Only the empty initial workspace is rendered at build time. Browser history,
// uploaded files and keys remain client-only; effects/API requests do not run.
export function render() {
  return renderToString(<App />);
}
