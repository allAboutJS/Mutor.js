import {
  readFileSync,
  rmSync,
  type Stats,
  statSync,
  writeFileSync,
} from "node:fs";
import { performance } from "node:perf_hooks";
import { argv, exit } from "node:process";
import { version } from "../../package.json";
import Mutor from "../core/mutor.server";
import type {
  CleanupFn,
  CommandStruct,
  PartialMutorConfig,
} from "../types/types";
import toAbsolutePath from "../utils/to-absolute-path";
import {
  ArgumentError,
  CliError,
  ExitCodes,
  FileReadError,
  FileWriteError,
  JsonParseError,
} from "./cli-errors";

const COMMANDS = new Set(["build", "render"]);
const OPTIONS = new Set(["--out", "--data", "--config"]);

// Kept in sync with package.json at build time via your bundler / tsconfig paths.
const VERSION = `Mutor.js v${version}`;

const USAGE = `
Usage: mutor <command> <input> [options]

Commands:
  build   <dir>        Render all templates in a directory using a data source
  render  <template>   Compile and immediately render a template

Options:
  --out     <path>     Output file or directory (defaults to stdout for render)
  --data    <path>     JSON data file to use as render context (required for build/render)
  --config  <path>     JSON config file to pass to Mutor
  --version            Print the version and exit
  --help               Show this help message

Exit codes:
  0  success
  1  runtime error  (I/O failure, render failure, etc.)
  2  argument error (bad flags, missing or wrong-typed values)
`.trim();

/** Read a file, throwing a friendly FileReadError on failure. */
export function safeReadFile(filePath: string): string {
  try {
    return readFileSync(filePath, "utf-8");
  } catch (err) {
    throw new FileReadError(filePath, err);
  }
}

/** Write a file, throwing a friendly FileWriteError on failure. */
export function safeWriteFile(filePath: string, content: string): void {
  try {
    writeFileSync(filePath, content, "utf-8");
  } catch (err) {
    throw new FileWriteError(filePath, err);
  }
}

/** Parse JSON from a file, attributing parse errors to that file. */
export function safeParseJsonFile(filePath: string): unknown {
  const raw = safeReadFile(filePath);
  try {
    return JSON.parse(raw);
  } catch (err) {
    throw new JsonParseError(filePath, err);
  }
}

/** Assert a path points to an existing regular file (not a dir, socket, etc.). */
function assertIsFile(filePath: string, flag: string): void {
  let stat: Stats;
  try {
    stat = statSync(filePath);
  } catch {
    throw new ArgumentError(`${flag} path '${filePath}' does not exist`);
  }
  if (!stat.isFile()) {
    throw new ArgumentError(`${flag} path '${filePath}' is not a file`);
  }
}

/** Assert a path points to an existing directory. */
function assertIsDirectory(dirPath: string, flag: string): void {
  let stat: Stats;
  try {
    stat = statSync(dirPath);
  } catch {
    throw new ArgumentError(`${flag} path '${dirPath}' does not exist`);
  }
  if (!stat.isDirectory()) {
    throw new ArgumentError(`${flag} path '${dirPath}' is not a directory`);
  }
}

/** Assert a file has one of the allowed extensions. */
function assertExtension(
  filePath: string,
  flag: string,
  ...extensions: string[]
): void {
  const matches = extensions.some((ext) => filePath.endsWith(ext));
  if (!matches) {
    throw new ArgumentError(
      `${flag} expects a file with extension ${extensions.join(" or ")} — got '${filePath}'`,
    );
  }
}

export function parseArgs(rawArgs: string[]): CommandStruct {
  if (rawArgs.length === 0 || rawArgs[0] === "--help") {
    console.log(USAGE);
    exit(ExitCodes.Success);
  }

  if (rawArgs[0] === "--version") {
    console.log(VERSION);
    exit(ExitCodes.Success);
  }

  const command = rawArgs[0];

  if (!COMMANDS.has(command)) {
    throw new ArgumentError(`unknown command '${command}'\n\n${USAGE}`);
  }

  const commandData = rawArgs[1];

  if (!commandData || commandData.startsWith("--")) {
    throw new ArgumentError(
      `command '${command}' requires an input path as its first argument\n\n${USAGE}`,
    );
  }

  const struct: CommandStruct = { command, commandData };

  for (let i = 2; i < rawArgs.length; i++) {
    const flag = rawArgs[i];

    if (!OPTIONS.has(flag)) {
      throw new ArgumentError(`unknown option '${flag}'\n\n${USAGE}`);
    }

    const value = rawArgs[i + 1];

    if (!value || value.startsWith("--")) {
      throw new ArgumentError(`option '${flag}' requires a value`);
    }

    struct[flag as keyof CommandStruct] = value;
    i++; // skip the consumed value token
  }

  return struct;
}

export async function handleBuildCommand(
  mutor: Mutor,
  args: CommandStruct,
): Promise<void> {
  if (!args["--data"]) {
    throw new ArgumentError("'build' requires a data source via --data");
  }
  if (!args["--out"]) {
    throw new ArgumentError("'build' requires an output directory via --out");
  }

  const inputPath = toAbsolutePath(args.commandData);
  const dataPath = toAbsolutePath(args["--data"]);
  const outPath = toAbsolutePath(args["--out"]);

  assertIsDirectory(inputPath, "<input>");
  assertIsFile(dataPath, "--data");
  assertExtension(dataPath, "--data", ".json");

  const context = safeParseJsonFile(dataPath);

  // Track whether we've written anything so SIGINT cleanup knows what to do.
  let buildStarted = false;

  registerCleanup(() => {
    if (buildStarted) {
      console.warn("\nBuild interrupted — removing partial output...");
      try {
        rmSync(outPath, { recursive: true, force: true });
      } catch {}
    }
  });

  const start = performance.now();

  buildStarted = true;
  await mutor.buildDir(inputPath, outPath, context);
  buildStarted = false; // Succeeded — don't clean up on exit.

  const end = performance.now();

  console.log(`Built → ${args["--out"]}`);
  console.log(`Done in ${(end - start).toFixed(2)}ms`);
}

export async function handleRenderCommand(
  mutor: Mutor,
  args: CommandStruct,
): Promise<void> {
  if (!args["--data"]) {
    throw new ArgumentError("'render' requires a data source via --data");
  }

  const inputPath = toAbsolutePath(args.commandData);
  const dataPath = toAbsolutePath(args["--data"]);

  assertIsFile(inputPath, "<input>");
  assertIsFile(dataPath, "--data");
  assertExtension(dataPath, "--data", ".json");

  const start = performance.now();
  const context = safeParseJsonFile(dataPath);
  const template = safeReadFile(inputPath);
  const output = mutor.render(template, context);

  if (args["--out"]) {
    const outPath = toAbsolutePath(args["--out"]);

    registerCleanup(() => {
      try {
        rmSync(outPath, { force: true });
      } catch {}
    });

    safeWriteFile(outPath, output);
    console.log(`Rendered → ${args["--out"]}`);
  } else {
    console.log(output);
    console.log();
  }

  const end = performance.now();
  console.log(`Done in ${(end - start).toFixed(2)}ms`);
}

let cleanupFn: CleanupFn | null = null;

/** Register a one-shot cleanup to run on SIGINT / SIGTERM. */
function registerCleanup(fn: CleanupFn): void {
  cleanupFn = fn;
}

function handleSignal(signal: string): void {
  console.warn(`\nReceived ${signal}.`);
  cleanupFn?.();
  exit(ExitCodes.RuntimeError);
}

process.on("SIGINT", () => handleSignal("SIGINT"));
process.on("SIGTERM", () => handleSignal("SIGTERM"));

async function main(): Promise<void> {
  const args = parseArgs(argv.slice(2));

  const mutor = new Mutor();

  if (args["--config"]) {
    const configPath = toAbsolutePath(args["--config"]);
    assertIsFile(configPath, "--config");
    assertExtension(configPath, "--config", ".json");

    const config = safeParseJsonFile(configPath);
    mutor.addConfig(config as PartialMutorConfig);
  }

  switch (args.command) {
    case "build":
      await handleBuildCommand(mutor, args);
      break;
    case "render":
      await handleRenderCommand(mutor, args);
      break;
  }
}

if (process.env.NODE_ENV !== "test") {
  main().catch((err: unknown) => {
    if (err instanceof CliError) {
      console.error(`error: ${err.message}`);
      exit(err.exitCode);
    }

    console.error("unexpected error:", err);
    exit(ExitCodes.RuntimeError);
  });
}
