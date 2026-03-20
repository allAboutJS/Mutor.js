import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { Registry } from "../core";
import type { Context } from "../types/types";
import compile from "./compile";
import render from "./render";

export default function renderFromFile(path: string, ctx: Context) {
  const absolutePath = resolve(process.cwd(), path);
  if (Registry.hasRecord(absolutePath)) {
    return render(Registry.getRecord(absolutePath)!, ctx);
  }

  const file = readFileSync(absolutePath, "utf-8");
  const ast = compile(file);
  return render(ast, ctx);
}
