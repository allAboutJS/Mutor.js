import { MutorError } from "../core/error";

const OBJECT = "object";
export const MUTOR_SAFE = Symbol("__mutor_safe_context");

export default function validateContext(ctx: any) {
  // Allow non object contexts
  if (!ctx || typeof ctx !== OBJECT) {
    return ctx;
  }

  if (MUTOR_SAFE in ctx) {
    return ctx;
  }

  // vulnerability and prevent memory leaks across request lifecycles.
  const seen = new WeakSet();

  function walk(value: any, path = "") {
    if (!value || typeof value !== OBJECT) return value;

    if (seen.has(value)) return value;
    seen.add(value);

    // Block prototype pollution vectors early
    const proto = Object.getPrototypeOf(value);
    if (proto && proto !== Object.prototype && proto !== Array.prototype) {
      throw new MutorError(`Unsafe prototype detected at ${path || "root"}`);
    }

    // Arrays
    if (Array.isArray(value)) {
      for (let i = 0; i < value.length; i++) {
        value[i] = walk(value[i], `${path}[${i}]`);
      }
      return value;
    }

    // Maps
    if (value instanceof Map) {
      for (const [k, v] of value.entries()) {
        if (typeof k === OBJECT) walk(k, `${path}.mapKey`);
        value.set(k, walk(v, `${path}.mapValue`));
      }
      return value;
    }

    // Sets
    if (value instanceof Set) {
      const next = new Set();
      for (const v of value.values()) {
        next.add(walk(v, path));
      }
      value.clear();
      for (const v of next) value.add(v);
      return value;
    }

    // Plain object validation
    const descriptors = Object.getOwnPropertyDescriptors(value);

    for (const key of Object.keys(descriptors)) {
      const desc = descriptors[key];

      // Block getters/setters
      if (desc.get || desc.set) {
        throw new MutorError(`Getter/setter not allowed: ${path}.${key}`);
      }

      const prop = value[key];

      if (prop && typeof prop === OBJECT) {
        value[key] = walk(prop, `${path}.${key}`);
      }
    }

    return value;
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
