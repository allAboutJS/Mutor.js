import { MutorError } from "../core/error";

const OBJECT = "object";
export const MUTOR_SAFE = Symbol("__mutor_safe_context");

function isPromiseLike(value: any) {
  return (
    value &&
    (typeof value === OBJECT || typeof value === "function") &&
    typeof value.then === "function"
  );
}

function walk(value: any, path = "", seen = new Set()) {
  if (!value || typeof value !== OBJECT) {
    return value;
  }

  if (isPromiseLike(value)) {
    return value;
  }

  if (seen.has(value)) {
    return value;
  }

  seen.add(value);

  if (value instanceof Map) {
    for (const [k, v] of value.entries()) {
      if (typeof k === OBJECT) walk(k, `${path}.mapKey`, seen);
      value.set(k, walk(v, `${path}.mapValue`, seen));
    }

    return value;
  }

  if (value instanceof Set) {
    const next = new Set();

    for (const v of value.values()) {
      next.add(walk(v, path, seen));
    }

    value.clear();

    for (const v of next) {
      value.add(v);
    }

    return value;
  }

  const proto = Object.getPrototypeOf(value);

  if (proto !== Object.prototype && proto !== Array.prototype) {
    throw new MutorError(
      `Unsafe prototype detected at ${path || "root"} in context.`,
    );
  }

  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) {
      value[i] = walk(value[i], `${path}[${i}]`, seen);
    }

    return value;
  }

  const descriptors = Object.getOwnPropertyDescriptors(value);

  for (const key of Object.keys(descriptors)) {
    const desc = descriptors[key];

    if (desc.get || desc.set) {
      throw new MutorError(
        `Getter/setter not allowed at '${path}.${key}' in context.`,
      );
    }

    value[key] = walk(value[key], `${path}.${key}`, seen);
  }

  return value;
}

export default function validateContext(ctx: unknown) {
  if (!ctx || typeof ctx !== OBJECT) {
    return ctx;
  }

  if (MUTOR_SAFE in (ctx as object)) {
    return ctx;
  }

  const safeData = walk(ctx);

  if (safeData && typeof safeData === OBJECT) {
    Object.defineProperty(safeData, MUTOR_SAFE, {
      value: true,
      enumerable: false,
      writable: false,
      configurable: false,
    });
  }

  return safeData;
}
