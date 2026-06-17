import { MutorError } from "../core/error";

/**
 * Validates a computed property key against a set of allowed and forbidden props.
 *
 * @param value - The computed property key to validate.
 * @param allowedProps - The set of allowed props.
 * @param forbiddenProps - The set of forbidden props.
 * @returns The validated computed property key.
 */
export default function validateComputedProp(
  value: unknown,
  allowedProps: Set<string | number>,
  forbiddenProps: Set<string | number>,
): string | number {
  if (typeof value !== "string" && typeof value !== "number") {
    throw new MutorError("Computed property keys must be strings or numbers.");
  }

  if (forbiddenProps.has(value) && !allowedProps.has(value)) {
    throw new MutorError(
      `Forbidden property access.\nAccess to this computed property '${value}' is forbidden.`,
    );
  }

  return value;
}
