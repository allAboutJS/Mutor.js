import { ESCAPE_MAP } from "../core/constants";

/** Escapes HTML special characters in a string. */
export default function escapeFn(e: unknown): unknown {
  if (e === null || e === undefined) {
    return e;
  }

  const strValue = String(e);
  return /[&<>"']/.test(strValue)
    ? strValue.replace(/[&<>"']/g, (char) => ESCAPE_MAP[char])
    : strValue;
}
