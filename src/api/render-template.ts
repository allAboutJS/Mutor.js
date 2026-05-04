import { getCompiledTemplate, hasCompiledTemplate } from "../providers/cache";
import { getConfig } from "../providers/config";
import validateContext from "./validate-context";

export default function renderTemplate(
  name: string,
  ctx: Record<any, any>,
): string {
  const { allowedProps, forbiddenProps, namespaces } = getConfig();

  if (!hasCompiledTemplate(name)) {
    throw new Error(`No template was registered with the name '${name}'`);
  }

  const compiled = getCompiledTemplate(name)!;

  return compiled(
    validateContext(ctx),
    namespaces,
    allowedProps,
    forbiddenProps,
  );
}
