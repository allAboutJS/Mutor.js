import { defineConfig } from "tsup";

export default defineConfig([
  {
    entry: ["src/index.ts"],
    outDir: "dist",
    format: ["esm", "cjs"],
    dts: true,
    sourcemap: true,
    clean: true,
    minify: true,
    target: "es2020",
  },
  {
    entry: ["src/browser.ts"],
    outDir: "dist/browser",
    format: ["esm"],
    dts: true,
    sourcemap: true,
    clean: true,
    minify: true,
    target: "es2020",
    esbuildOptions(options) {
      options.platform = "browser";
    },
  },
]);
