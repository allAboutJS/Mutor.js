import type { RuntimeFrame } from "../types/types";

export default function createRuntimeFrame(
  context: any,
  renderedPath: string = "",
): RuntimeFrame {
  return {
    context,
    renderedPath,
    renderStack: new Set([renderedPath && renderedPath]),
  };
}
