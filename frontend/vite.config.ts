import { defineConfig, loadEnv } from "vite";
import preact from "@preact/preset-vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "BACKEND_DEV_URL");

  return {
    plugins: [
      preact(),
      {
        name: "first-paint-assets",
        // The small shared stylesheet is needed for the first paint. Inline only
        // entry CSS; algorithm-specific styles keep their lazy, cacheable chunks.
        transformIndexHtml: {
          order: "post",
          handler(html, context) {
            if (!context.bundle) return html;
            // Vite reconstructs entry script tags and drops fetchpriority from
            // index.html. Restore it on async hydration scripts after bundling:
            // the initial content is already HTML and does not depend on JS.
            const prioritized = html.replace(/<script\b[^>]*\bsrc="[^"]+"[^>]*>/g, (tag) =>
              /\basync\b/.test(tag) && /\btype="module"/.test(tag) && !/\bfetchpriority=/.test(tag)
                ? tag.replace("<script", '<script fetchpriority="low"')
                : tag,
            );
            return prioritized.replace(
              /<link\b[^>]*rel="stylesheet"[^>]*href="([^"]+)"[^>]*>/g,
              (tag, href: string) => {
                const asset = context.bundle?.[href.replace(/^\//, "")];
                if (asset?.type !== "asset" || typeof asset.source !== "string") return tag;
                return `<style>${asset.source.replace(/<\/style/gi, "<\\/style")}</style>`;
              },
            );
          },
        },
      },
    ],
    server: {
      port: 5173,
      proxy: {
        "/api": {
          target: process.env.BACKEND_DEV_URL || env.BACKEND_DEV_URL || "http://127.0.0.1:8000",
          changeOrigin: false,
        },
      },
    },
  };
});
