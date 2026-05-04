import compile from "../core/compile";
import validateContext from "../core/utils/validate-context";
import { getConfig } from "../providers/config";

export default function render(
  template: string,
  ctx: Record<any, any>,
): string {
  const { allowedProps, forbiddenProps, namespaces } = getConfig();
  return compile(template, { path: "anonymous", allowedProps, forbiddenProps })(
    validateContext(ctx),
    namespaces,
    allowedProps,
    forbiddenProps,
  );
}
