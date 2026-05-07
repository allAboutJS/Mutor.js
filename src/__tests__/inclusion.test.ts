import { mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import Mutor from "../server";

describe("Mutor Inclusion & Circularity", () => {
  const testDir = join(__dirname, "tmp_include");
  let engine: Mutor;

  beforeAll(async () => {
    await mkdir(testDir, { recursive: true });
    engine = new Mutor({});
  });

  afterAll(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  test("should resolve relative includes correctly", async () => {
    await writeFile(join(testDir, "child.html"), "Child Content");
    await writeFile(
      join(testDir, "parent.html"),
      'Parent {{ Mutor::include("./child.html") }}',
    );

    const result = engine.renderFile(join(testDir, "parent.html"), {});
    expect(result).toBe("Parent Child Content");
  });

  test("should throw error on circular includes", async () => {
    await writeFile(
      join(testDir, "a.html"),
      '{{ Mutor::include("./b.html") }}',
    );
    await writeFile(
      join(testDir, "b.html"),
      '{{ Mutor::include("./a.html") }}',
    );

    expect(() => engine.renderFile(join(testDir, "a.html"), {})).toThrow(
      /Circular include detected/,
    );
  });
});
