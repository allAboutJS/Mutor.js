import { MutorError } from "../core/error";

/**
 * Validates access to computed properties against a whitelist and blacklist.
 * @param r The property name or index being accessed.
 * @param forbiddenProps A set of restricted property names.
 * @param allowedProps A set of explicitly permitted property names.
 * @returns The property name if valid.
 * @throws Error if access is forbidden.
 */
export default function validateComputedProp(
  r: string | number,
  allowedProps: Set<string | number>,
  forbiddenProps: Set<string | number>,
): string | number {
  if (forbiddenProps.has(r) && !allowedProps.has(r)) {
    throw new MutorError(
      `Forbidden property access. Access to this computed property "${r}" is forbidden.`,
    );
  }
  return r;
}
