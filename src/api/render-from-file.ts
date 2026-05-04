import { readFileSync } from "node:fs";
import compile from "../core/compile";
import toAbsolutePath from "../core/utils/to-absolute-path";
import {
  getCompiledTemplate,
  hasCompiledTemplate,
  setCompiledTemplate,
} from "../providers/cache";
import { getConfig } from "../providers/config";
import validateContext from "./validate-context";

export default function renderFromFile(
  path: string,
  ctx: Record<any, any>,
): string {
  const absolutePath = toAbsolutePath(path);
  const template = readFileSync(absolutePath, "utf-8");
  const { allowedProps, dev, forbiddenProps, namespaces } = getConfig();
  let compiled: Function;

  if (hasCompiledTemplate(absolutePath)) {
    compiled = getCompiledTemplate(absolutePath)!;
  } else {
    compiled = compile(template, {
      allowedProps,
      forbiddenProps,
      path: absolutePath,
    });

    // Cache only if in non-dev environment
    if (!dev) {
      setCompiledTemplate(absolutePath, compiled);
    }
  }

  return compiled(
    validateContext(ctx),
    namespaces,
    allowedProps,
    forbiddenProps,
  );
}
