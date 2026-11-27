import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { log } from "node:console";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { build } from "vite";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
// Keep temporary SSR output under node_modules so its external Preact imports
// resolve normally, including in the Docker build. Never ship the SSR bundle.
const temporary = await mkdtemp(join(root, "node_modules/.prerender-"));
try {
  await build({
    root,
    build: {
      ssr: "src/entry-server.tsx",
      outDir: temporary,
      copyPublicDir: false,
      rollupOptions: { output: { entryFileNames: "entry-server.mjs" } },
    },
  });
  const { render } = await import(pathToFileURL(join(temporary, "entry-server.mjs")).href);
  const path = join(root, "dist/index.html");
  const html = await readFile(path, "utf8");
  const placeholder = '<div id="root"></div>';
  if (!html.includes(placeholder)) throw new Error("Missing empty application root in built HTML");
  await writeFile(
    path,
    html.replace(placeholder, () => `<div id="root">${render()}</div>`),
  );
  log("Prerendered initial workspace into dist/index.html");
} finally {
  await rm(temporary, { recursive: true, force: true });
}
