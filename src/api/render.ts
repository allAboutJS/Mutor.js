import compile from "../core/compile";
import validateContext from "../core/utils/validateContext";

export default function render(
  template: string,
  ctx: Record<any, any>,
): string {
  return compile(template)(validateContext(ctx));
}
