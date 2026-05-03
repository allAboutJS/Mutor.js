import compile from "../core/compile";

export default function render(
  template: string,
  ctx: Record<any, any>,
): string {
  return compile(template)(ctx);
}
