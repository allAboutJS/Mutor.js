import { mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import Mutor from "../index";
import MutorServer from "../server";

describe("Debug runtime errors", () => {
  const testDir = join(__dirname, "tmp_debug_runtime_errors");

  beforeAll(async () => {
    await mkdir(testDir, { recursive: true });
  });

  afterAll(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  test("wraps plain render runtime failures with source context", () => {
    const engine = new Mutor({
      allowFnCalls: true,
      debugRuntimeErrors: true,
    });

    expect(() =>
      engine.render("Hello {{ boom() }}", {
        boom() {
          throw new Error("plain render failure");
        },
      }),
    ).toThrow(/plain render failure[\s\S]*at anonymous:1:7/);
  });

  test("wraps component runtime failures with source context", () => {
    const engine = new Mutor({
      allowFnCalls: true,
      debugRuntimeErrors: true,
    });

    engine.registerComponent("debug-card", "Hello {{ boom() }}");

    expect(() =>
      engine.renderComponent("debug-card", {
        boom() {
          throw new Error("component failure");
        },
      }),
    ).toThrow(/component failure[\s\S]*at debug-card:1:7/);
  });

  test("wraps file runtime failures with source context", async () => {
    const engine = new MutorServer({
      allowFnCalls: true,
      debugRuntimeErrors: true,
    });
    const file = join(testDir, "debug.html");

    await writeFile(file, "Hello {{ boom() }}", "utf-8");

    expect(() =>
      engine.renderFile(file, {
        boom() {
          throw new Error("file failure");
        },
      }),
    ).toThrow(/file failure[\s\S]*debug\.html:1:7/);
  });
});
