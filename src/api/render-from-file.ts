import { readFileSync } from "node:fs";
import compile from "../core/compile";
import escapeFn from "../core/utils/escape-fn";
import toAbsolutePath from "../core/utils/to-absolute-path";
import validateComputedProp from "../core/utils/validate-computed-props";
import {
  getCompiledTemplate,
  getCurrentContext,
  hasCompiledTemplate,
  setCompiledTemplate,
  setCurrentContext,
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
      path: absolutePath,
    });

    // Cache only if in non-dev environment
    if (!dev) {
      setCompiledTemplate(absolutePath, compiled);
    }
  }

  const prevContext = getCurrentContext();
  const safeContext = validateContext(ctx);

  // Set the currently used context to the provided context
  if (safeContext !== prevContext) {
    setCurrentContext(safeContext);
  }

  const result = compiled(
    safeContext,
    namespaces,
    allowedProps,
    forbiddenProps,
    escapeFn,
    validateComputedProp,
  );

  // Restore the previous context
  if (safeContext !== prevContext) {
    setCurrentContext(prevContext);
  }

  return result;
}
