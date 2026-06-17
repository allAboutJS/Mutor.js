import { mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import Mutor from "../server";

describe("Server file resolution", () => {
  const testDir = join(__dirname, "tmp_path_resolution");
  const pagesDir = join(testDir, "pages");
  const nestedDir = join(pagesDir, "nested");
  const partialsDir = join(testDir, "partials");
  const sharedDir = join(testDir, "shared");

  beforeAll(async () => {
    await rm(testDir, { recursive: true, force: true });
    await mkdir(nestedDir, { recursive: true });
    await mkdir(partialsDir, { recursive: true });
    await mkdir(sharedDir, { recursive: true });

    await writeFile(
      join(partialsDir, "header.html"),
      "<header>{{ title }}</header>",
    );
    await writeFile(
      join(partialsDir, "footer.html"),
      "<footer>{{ title }}</footer>",
    );
    await writeFile(join(sharedDir, "badge.html"), "<span>{{ label }}</span>");

    await writeFile(
      join(pagesDir, "index.html"),
      'Start {{ Mutor::include("../partials/header.html") }} {{ Mutor::include("@/shared/badge.html", badge) }} End',
    );

    await writeFile(
      join(nestedDir, "detail.html"),
      'Detail {{ Mutor::include("../../partials/footer.html") }}',
    );

    await writeFile(
      join(nestedDir, "composed.html"),
      'Compose {{ Mutor::include("./detail.html") }}',
    );
  });

  afterAll(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  test("resolves top-level renderFile paths relative to rootDir with leading ./", () => {
    const engine = new Mutor({ rootDir: testDir });

    expect(
      engine.renderFile("./pages/index.html", {
        title: "Home",
        badge: { label: "New" },
      }),
    ).toBe("Start <header>Home</header> <span>New</span> End");
  });

  test("resolves top-level renderFile paths relative to rootDir without leading ./", () => {
    const engine = new Mutor({ rootDir: testDir });

    expect(
      engine.renderFile("pages/index.html", {
        title: "Home",
        badge: { label: "New" },
      }),
    ).toBe("Start <header>Home</header> <span>New</span> End");
  });

  test("resolves absolute top-level renderFile paths", () => {
    const engine = new Mutor({ rootDir: testDir });

    expect(
      engine.renderFile(join(pagesDir, "index.html"), {
        title: "Home",
        badge: { label: "New" },
      }),
    ).toBe("Start <header>Home</header> <span>New</span> End");
  });

  test("resolves nested relative includes across directories", () => {
    const engine = new Mutor({ rootDir: testDir });

    expect(
      engine.renderFile("./pages/nested/composed.html", { title: "Docs" }),
    ).toBe("Compose Detail <footer>Docs</footer>");
  });

  test("resolves alias includes from file renders", () => {
    const engine = new Mutor({ rootDir: testDir });

    expect(
      engine.renderFile("./pages/index.html", {
        title: "Home",
        badge: { label: "Alias" },
      }),
    ).toContain("<span>Alias</span>");
  });

  test("resolves alias includes from anonymous template renders", () => {
    const engine = new Mutor({ rootDir: testDir });

    expect(
      engine.render('{{ Mutor::include("@/partials/header.html") }}', {
        title: "Anonymous",
      }),
    ).toBe("<header>Anonymous</header>");
  });

  test("anonymous template includes resolve relative to rootDir", () => {
    const engine = new Mutor({ rootDir: testDir });

    expect(
      engine.render('{{ Mutor::include("partials/footer.html") }}', {
        title: "Root Relative",
      }),
    ).toBe("<footer>Root Relative</footer>");
  });

  test("include can override the inherited context", () => {
    const engine = new Mutor({ rootDir: testDir });

    expect(
      engine.renderFile("./pages/index.html", {
        title: "Parent",
        badge: { label: "Child Only" },
      }),
    ).toBe("Start <header>Parent</header> <span>Child Only</span> End");
  });
});
