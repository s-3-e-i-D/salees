import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

/** Static bundle the iOS shell loads. No server, no auth, just the keyboard. */
export default defineConfig({
  base: "./",
  plugins: [tailwindcss(), viteReact()],
  resolve: { tsconfigPaths: true },
  build: {
    outDir: "dist-ios",
    emptyOutDir: true,
    rollupOptions: {
      input: fileURLToPath(new URL("./ios.html", import.meta.url)),
    },
  },
});
