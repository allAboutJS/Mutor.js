export function isNumber(n: unknown) {
  if (Number.isNaN(n)) {
    return false;
  }

  return /^[0-9]+(.?[0-9]+)$/.test(<string>n);
}

export function coerceToString(v: unknown) {
  return typeof v === "string" ? v : String(v);
}

export function coerceToNumber(v: unknown) {
  return typeof v === "number" ? v : Number(v);
}
