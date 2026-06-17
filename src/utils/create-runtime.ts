import type { RuntimeFrame } from "../types/types";

/**
 * Creates a new runtime frame with the given context and rendered path.
 *
 * @param context - The context object for the runtime frame.
 * @param renderedPath - The rendered path for the runtime frame.
 * @returns A new runtime frame object.
 */
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
