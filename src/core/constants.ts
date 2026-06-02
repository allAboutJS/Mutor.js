import type { MutorConfig } from "../types/types";
import { MutorError } from "./error";

export const keywords = new Set([
  "for",
  "if",
  "else",
  "true",
  "false",
  "null",
  "undefined",
  "end",
  "in",
  "of",
  "switch",
  "case",
  "default",
  "break",
  "continue",
]);

export const operators = new Set([
  "::",
  "||",
  "??",
  "&&",
  "**",
  "^",
  "|",
  "&",
  "!",
  "-",
  "%",
  "+",
  "*",
  "/",
  ">",
  "<",
  ">=",
  "<=",
  "==",
  "!=",
  ">>",
  "<<",
  ".",
  "?.",
  "(",
  ")",
  "[",
  "]",
  ",",
  ":",
  "?",
]);

export const logicalOperators = new Set(["&&", "||", "??"]);

export const equalityOperators = new Set(["==", "!="]);

export const comparisonOperators = new Set([">", "<", ">=", "<="]);

export const bitwiseOperators = new Set([">>", "<<", "^", "|", "&"]);

export const additiveOperators = new Set(["+", "-"]);

export const multiplicativeOperators = new Set(["*", "/", "%"]);

export const propertyAccessOperators = new Set([".", "?.", "[", "::"]);

export const unaryOperators = new Set(["-", "+", "!"]);

export const bitwiseOrOperators = new Set(["|"]);

export const bitwiseXorOperators = new Set(["^"]);

export const bitwiseAndOperators = new Set(["&"]);

export const exponentiationOperators = new Set(["**"]);

export const ESCAPE_MAP: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

export const defaultConfig: MutorConfig = {
  build: {
    include: new Set([".html", ".txt"]),
    exclude: new Set(["node_modules", ".git"]),
  },
  autoEscape: true,
  allowedProps: new Set(),
  forbiddenProps: new Set([
    "__proto__",
    "constructor",
    "prototype",
    "__defineGetter__",
    "__defineSetter__",
    "__lookupGetter__",
    "__lookupSetter__",
    "caller",
    "callee",
    "arguments",
  ]),
  allowFnCalls: false,
  delimiters: {
    closingTag: "}}",
    openingTag: "{{",
    openingTagEscape: "\\",
    whitespaceTrim: "~",
    commentTag: "#",
  },
  keepOpeningTagEscapeDelimiter: false,
  onIncludeFail: "throw",
  cache: {
    active: true,
    maxSize: 50 * 1024 * 1024, // 50MB
  },
};

export const namespaces = {
  JSON: {
    stringify(value: any, space?: number) {
      return JSON.stringify(value, null, space);
    },

    parse(str: string) {
      return JSON.parse(str);
    },
  },

  Object: {
    keys(obj: object) {
      return Object.keys(obj);
    },

    values(obj: object) {
      return Object.values(obj);
    },

    entries(obj: object) {
      return Object.entries(obj);
    },

    hasOwn(obj: object, key: any) {
      return Object.hasOwn(obj, key);
    },

    fromEntries(entries: Iterable<readonly [PropertyKey, any]>) {
      return Object.fromEntries(entries);
    },

    pick(obj: Record<string, any>, keys: string[]) {
      if (!obj || typeof obj !== "object") {
        throw new MutorError("Object::pick expects an object");
      }

      if (!Array.isArray(keys)) {
        throw new MutorError("Object::pick expects an array of keys");
      }

      const result: Record<string, any> = {};

      for (const key of keys) {
        if (Object.hasOwn(obj, key)) {
          result[key] = obj[key];
        }
      }

      return result;
    },

    omit(obj: Record<string, any>, keys: string[]) {
      if (!obj || typeof obj !== "object") {
        throw new MutorError("Object::omit expects an object");
      }

      if (!Array.isArray(keys)) {
        throw new MutorError("Object::omit expects an array of keys");
      }

      const result = { ...obj };

      for (const key of keys) {
        delete result[key];
      }

      return result;
    },
  },

  Array: {
    isArray(value: any) {
      return Array.isArray(value);
    },

    from(value: any) {
      return Array.from(value);
    },

    of(...args: any[]) {
      return Array.of(...args);
    },

    unique(arr: any[]) {
      if (!Array.isArray(arr)) {
        throw new MutorError("Array::unique expects an array");
      }

      return [...new Set(arr)];
    },

    compact(arr: any[]) {
      if (!Array.isArray(arr)) {
        throw new MutorError("Array::compact expects an array");
      }

      return arr.filter(Boolean);
    },

    chunk(arr: any[], size: number) {
      if (!Array.isArray(arr)) {
        throw new MutorError("Array::chunk expects an array");
      }

      if (!Number.isInteger(size) || size <= 0) {
        throw new MutorError("Array::chunk expects a positive integer size");
      }

      const result = [];

      for (let i = 0; i < arr.length; i += size) {
        result.push(arr.slice(i, i + size));
      }

      return result;
    },

    range(start: number, end: number, step = 1) {
      if (
        !Number.isFinite(start) ||
        !Number.isFinite(end) ||
        !Number.isFinite(step)
      ) {
        throw new MutorError("Array::range expects finite numbers");
      }
      if (step === 0) {
        throw new MutorError("Array::range step cannot be 0");
      }

      // Validate directionality to prevent infinite loops
      if ((start <= end && step < 0) || (start > end && step > 0)) {
        throw new MutorError(
          "Invalid step direction: step must match range direction",
        );
      }

      const result = [];
      for (let i = start; start <= end ? i <= end : i >= end; i += step) {
        result.push(i);
      }

      return result;
    },
  },

  Number: {
    isFinite(value: number) {
      return Number.isFinite(value);
    },

    isNaN(value: any) {
      return Number.isNaN(value);
    },

    isInteger(value: any) {
      return Number.isInteger(value);
    },

    parseInt(value: string, radix = 10) {
      return Number.parseInt(value, radix);
    },

    parseFloat(value: string) {
      return Number.parseFloat(value);
    },

    clamp(value: number, min: number, max: number) {
      return Math.min(Math.max(value, min), max);
    },

    toFixed(value: number, digits = 0) {
      return value.toFixed(digits);
    },

    random(min = 0, max = 1) {
      return Math.random() * (max - min) + min;
    },
  },

  String: {
    fromCharCode(...args: number[]) {
      return String.fromCharCode(...args);
    },

    capitalize(value: string) {
      if (typeof value !== "string") {
        throw new MutorError("String::capitalize expects a string");
      }

      if (!value.length) {
        return value;
      }

      return value[0].toUpperCase() + value.slice(1);
    },
  },

  Math: {
    abs(x: number) {
      return Math.abs(x);
    },

    floor(x: number) {
      return Math.floor(x);
    },

    ceil(x: number) {
      return Math.ceil(x);
    },

    round(x: number) {
      return Math.round(x);
    },

    trunc(x: number) {
      return Math.trunc(x);
    },

    sign(x: number) {
      return Math.sign(x);
    },

    sqrt(x: number) {
      return Math.sqrt(x);
    },

    pow(base: number, exponent: number) {
      return base ** exponent;
    },

    max(...args: number[]) {
      return Math.max(...args);
    },

    min(...args: number[]) {
      return Math.min(...args);
    },

    random() {
      return Math.random();
    },

    PI: Math.PI,
  },

  Date: {
    now() {
      return Date.now();
    },

    parse(str: string) {
      return Date.parse(str);
    },

    new(date?: string | number) {
      if (date === undefined) {
        return new Date();
      }

      return new Date(date);
    },

    iso(date?: string | number | Date) {
      const d = new Date(date ?? Date.now());
      return d.toISOString();
    },

    timestamp(date?: string | number | Date) {
      return new Date(date ?? Date.now()).getTime();
    },
  },

  Boolean: {
    valueOf(value: any) {
      return Boolean(value);
    },
  },

  URL: {
    encode(value: string) {
      return encodeURIComponent(value);
    },

    decode(value: string) {
      return decodeURIComponent(value);
    },
  },
};

export const AsyncFunction = (async () => {})
  .constructor as FunctionConstructor;
