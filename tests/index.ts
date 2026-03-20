import { spawn } from "node:child_process";
import { relative } from "node:path";
import { argv } from "node:process";

const file =
  argv[2] === "server"
    ? "./tests/server_benchmarks.ts"
    : "./tests/benchmarks.ts";

const child = spawn("yarn", ["tsx", relative(process.cwd(), file)], {
  stdio: "inherit", // simplest way to pipe everything
  shell: true, // needed for yarn on Windows sometimes
});

child.on("error", (error) => {
  console.error("Failed to start process:", error);
  process.exit(1);
});

child.on("exit", (code) => {
  if (code !== 0) {
    console.error(`Process exited with code ${code}`);
    process.exit(1);
  }
});
