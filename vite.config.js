import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const src = path.resolve(__dirname, "src");

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const backendUrl = env.DEV_BACKEND || "http://localhost:8000";

  return {
    plugins: [react(), tailwindcss()],
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
