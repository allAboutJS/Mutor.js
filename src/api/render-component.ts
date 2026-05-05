import escapeFn from "../core/utils/escape-fn";
import validateComputedProp from "../core/utils/validate-computed-props";
import {
  getCompiledTemplate,
  getCurrentContext,
  hasCompiledTemplate,
  setCurrentContext,
} from "../providers/cache";
import { getConfig } from "../providers/config";
import validateContext from "./validate-context";

export default function renderComponent(
  name: string,
  ctx: Record<any, any>,
): string {
  const { allowedProps, forbiddenProps, namespaces } = getConfig();

  if (!hasCompiledTemplate(name)) {
    throw new Error(`No template was registered with the name '${name}'`);
  }

  const compiled = getCompiledTemplate(name)!;
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
