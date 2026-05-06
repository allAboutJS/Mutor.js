import { ESCAPE_MAP } from "../core/constants";

/**
 * Escapes HTML special characters in a string.
 * @param e The value to escape.
 * @returns The escaped string or the original value if not a string.
 */
export default function escapeFn(e: unknown): unknown {
  if (typeof e !== "string") return e;
  return /[&<>"']/.test(e)
    ? e.replace(/[&<>"']/g, (char) => ESCAPE_MAP[char])
    : e;
}
