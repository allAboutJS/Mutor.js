import type { RuntimeFrame } from "../types/types";

export default function createRuntimeFrame(
  context: any,
  renderedPath: string = "",
): RuntimeFrame {
  return {
    context,
    renderedPath,
    includeStack: new Set([renderedPath && renderedPath]),
  };
}
