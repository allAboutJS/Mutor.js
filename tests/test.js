import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { renderFromFile, renderToString } from "../dist/index.js";
import context from "./context.js";

function exec() {
  writeFileSync(
    resolve(process.cwd(), "tests/output.html"),
    renderFromFile("tests/template.txt", context),
    "utf-8",
  );
}

exec();
