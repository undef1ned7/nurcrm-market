import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const src = path.resolve(__dirname, "src");
const appVersion = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, "package.json"), "utf8"),
).version;

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const backendUrl = env.DEV_BACKEND || "http://localhost:8000";

  return {
    plugins: [react(), tailwindcss()],
    define: {
      __APP_VERSION__: JSON.stringify(appVersion),
    },
    resolve: {
      alias: {
        "@": src,
        "@app": path.join(src, "app"),
        "@pages": path.join(src, "pages"),
        "@widgets": path.join(src, "widgets"),
        "@features": path.join(src, "features"),
        "@entities": path.join(src, "entities"),
        "@shared": path.join(src, "shared"),
      },
      dedupe: ["react", "react-dom"],
    },
    server: {
      port: 3000,
      open: true,
      proxy: {
        "/api": {
          target: backendUrl,
          changeOrigin: true,
          secure: false,
        },
        "/ws": {
          target: backendUrl,
          changeOrigin: true,
          secure: false,
          ws: true,
        },
        "/media": {
          target: "https://app.nurcrm.kg",
          changeOrigin: true,
          secure: true,
        },
      },
    },
    build: {
      outDir: "build",
      sourcemap: false,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes("node_modules")) return undefined;

            // Стабильные vendor-chunks для лучшего кэширования.
            if (
              id.includes("react") ||
              id.includes("react-dom") ||
              id.includes("react-router") ||
              id.includes("redux") ||
              id.includes("@reduxjs") ||
              id.includes("react-redux")
            ) {
              return "vendor-react";
            }

            if (id.includes("@mui") || id.includes("material-ui")) {
              return "vendor-mui";
            }

            // @react-pdf/renderer обычно тяжёлый — изолируем в отдельный chunk.
            if (
              id.includes("react-pdf") ||
              id.includes("@react-pdf")
            ) {
              return "vendor-pdf";
            }

            if (id.includes("pdfjs-dist")) {
              return "vendor-pdfjs";
            }

            return "vendor";
          },
        },
      },
    },
    test: {
      environment: "jsdom",
      globals: true,
      include: [
        "src/**/*.{test,spec}.{js,jsx,ts,tsx}",
        "tools/**/*.{test,spec}.{js,mjs}",
      ],
    },
    css: {
      preprocessorOptions: {
        scss: {
          additionalData: `@use "@shared/assets/scss/main.scss" as *; @use "@shared/assets/scss/_mixin.scss" as *; @use "@shared/assets/scss/_variables.scss" as *;`,
        },
      },
    },
  };
});

// GeeksStaffCoolYeah2026
