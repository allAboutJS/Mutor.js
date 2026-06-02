import { MutorError } from "../core/error";

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
