import { defineConfig } from "tsup";

export default defineConfig([
  {
    entry: ["src/index.ts"],
    outDir: "dist",
    format: ["esm", "cjs"],
    dts: true,
    sourcemap: true,
    clean: true,
    target: "es2020",
    platform: "neutral",
  },
  {
    entry: ["src/server.ts"],
    outDir: "dist",
    format: ["esm", "cjs"],
    dts: true,
    sourcemap: true,
    clean: false,
    target: "es2020",
    platform: "node",
  },
  {
    entry: { cli: "src/bin/cli.ts" },
    outDir: "dist",
    format: ["cjs"],
    dts: false,
    sourcemap: true,
    clean: false,
    target: "es2022",
    platform: "node",
    banner: {
      js: "#!/usr/bin/env node",
    },
    noExternal: [/@mutor\/.*/],
  },
]);
