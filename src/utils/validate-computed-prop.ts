import { MutorError } from "../core/error";

export default function validateComputedProp(
  r: string | number,
  allowedProps: Set<string | number>,
  forbiddenProps: Set<string | number>,
): string | number {
  if (forbiddenProps.has(r) && !allowedProps.has(r)) {
    throw new MutorError(
      `Forbidden property access.\nAccess to this computed property '${r}' is forbidden.`,
    );
  }
  return r;
}
