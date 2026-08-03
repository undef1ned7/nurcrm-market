import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const backendUrl = env.DEV_BACKEND || "http://localhost:8000";

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        "@": "/src",
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
          additionalData: `@use "@/assets/scss/main.scss" as *; @use "@/assets/scss/_mixin.scss" as *; @use "@/assets/scss/_variables.scss" as *;`,
        },
      },
    },
  };
});
