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

export const bitwiseOperators = new Set([">>", "<<"]);

export const additiveOperators = new Set(["+", "-"]);

export const multiplicativeOperators = new Set(["*", "/", "%"]);

export const propertyAccessOperators = new Set([".", "?.", "[", "::"]);

export const unaryOperators = new Set(["-", "+", "!"]);

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
  forbiddenProps: new Set(["__proto__", "constructor", "prototype"]),
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
      try {
        return JSON.stringify(value, null, space);
      } catch {
        throw new MutorError("JSON::stringify failed");
      }
    },

    parse(str: string) {
      if (typeof str !== "string") {
        throw new MutorError("JSON::parse expects a string");
      }

      try {
        return JSON.parse(str);
      } catch {
        throw new MutorError("JSON::parse failed: invalid JSON string");
      }
    },
  },

  Object: {
    keys(obj: object) {
      if (!obj || typeof obj !== "object") {
        throw new MutorError("Object::keys expects an object");
      }

      return Object.keys(obj);
    },

    values(obj: object) {
      if (!obj || typeof obj !== "object") {
        throw new MutorError("Object::values expects an object");
      }

      return Object.values(obj);
    },

    entries(obj: object) {
      if (!obj || typeof obj !== "object") {
        throw new MutorError("Object::entries expects an object");
      }

      return Object.entries(obj);
    },

    hasOwn(obj: object, key: any) {
      if (!obj || typeof obj !== "object") {
        throw new MutorError("Object::hasOwn expects an object");
      }

      return Object.hasOwn(obj, key);
    },

    fromEntries(entries: any[]) {
      if (!Array.isArray(entries)) {
        throw new MutorError("Object::fromEntries expects an array");
      }

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

      const result = [];

      if (start <= end) {
        for (let i = start; i <= end; i += step) {
          result.push(i);
        }
      } else {
        for (let i = start; i >= end; i -= Math.abs(step)) {
          result.push(i);
        }
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
      if (typeof value !== "number") {
        throw new MutorError("Number::toFixed expects a number");
      }

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
  },

  Date: {
    now() {
      return Date.now();
    },

    parse(str: string) {
      if (typeof str !== "string") {
        throw new MutorError("Date::parse expects a string");
      }

      return Date.parse(str);
    },

    new(date?: string | number) {
      if (date === undefined) {
        return new Date();
      }

      return new Date(date);
    },

    iso(date?: string | number | Date) {
      return new Date(date ?? Date.now()).toISOString();
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

  RegExp: {
    test(pattern: string, value: string, flags = "") {
      if (typeof pattern !== "string") {
        throw new MutorError("RegExp::test expects a pattern string");
      }

      if (typeof value !== "string") {
        throw new MutorError("RegExp::test expects a value string");
      }

      return new RegExp(pattern, flags).test(value);
    },

    match(pattern: string, value: string, flags = "") {
      if (typeof pattern !== "string") {
        throw new MutorError("RegExp::match expects a pattern string");
      }

      if (typeof value !== "string") {
        throw new MutorError("RegExp::match expects a value string");
      }

      return value.match(new RegExp(pattern, flags));
    },
  },

  URL: {
    encode(value: string) {
      if (typeof value !== "string") {
        throw new MutorError("URL::encode expects a string");
      }

      return encodeURIComponent(value);
    },

    decode(value: string) {
      if (typeof value !== "string") {
        throw new MutorError("URL::decode expects a string");
      }

      return decodeURIComponent(value);
    },
  },
};

export const AsyncFunction = (async () => {})
  .constructor as FunctionConstructor;
