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
  "::", // Namespace access
  "||", // Or
  "??", // Nullish coalesce
  "&&", // And
  "**", // Power
  "^", // Bitwise XOr
  "|", // Bitwise Or
  "&", // Bitwise And
  "!", // Not
  "-", // Minus
  "%", // Modulus
  "+", // Plus
  "*", // Times
  "/", // Divide
  ">", // Greater than
  "<", // Less than
  ">=", // Greater or equal
  "<=", // Less or equal
  "==", // Strict equal
  "!=", // Strict not equal
  ">>", // Bitwise right shift
  "<<", // Bitwise left shift
  ".", // Property acess
  "?.", // Optional property access
  "(", // Open parentheses
  ")", // Close parentheses
  "[", // Square open parentheses
  "]", // Square close parentheses
  ",", // Comma
  ":", // Column
  "?", // Ternary operator
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
  cache: {
    active: true,
    maxSize: 50 * 1024 * 1024, // 50MB
  },
};

export const namespaces = {
  JSON: {
    stringify(value: any) {
      try {
        return JSON.stringify(value);
      } catch {
        throw new MutorError("JSON.stringify failed: invalid value");
      }
    },

    parse(str: string) {
      if (typeof str !== "string") {
        throw new MutorError("JSON.parse expects a string");
      }

      try {
        return JSON.parse(str);
      } catch {
        throw new MutorError("JSON.parse failed: invalid JSON string");
      }
    },
  },

  Object: {
    keys(obj: Object) {
      if (!obj || typeof obj !== "object") {
        throw new MutorError("Object.keys expects an object");
      }
      return Object.keys(obj);
    },

    values(obj: Object) {
      if (!obj || typeof obj !== "object") {
        throw new MutorError("Object.values expects an object");
      }
      return Object.values(obj);
    },

    entries(obj: Object) {
      if (!obj || typeof obj !== "object") {
        throw new MutorError("Object.entries expects an object");
      }
      return Object.entries(obj);
    },

    hasOwn(obj: Object, key: any) {
      if (!obj || typeof obj !== "object") {
        throw new MutorError("Object.hasOwn expects an object");
      }
      return Object.hasOwn(obj, key);
    },

    freeze(obj: Object) {
      if (!obj || typeof obj !== "object") {
        throw new MutorError("Object.freeze expects an object");
      }
      return Object.freeze(obj);
    },

    seal(obj: Object) {
      if (!obj || typeof obj !== "object") {
        throw new MutorError("Object.seal expects an object");
      }
      return Object.seal(obj);
    },

    fromEntries(entries: any[]) {
      if (!Array.isArray(entries)) {
        throw new MutorError("Object.fromEntries expects an array");
      }
      return Object.fromEntries(entries);
    },
  },

  Array: {
    isArray(value: any) {
      return Array.isArray(value);
    },

    from(value: any) {
      return Array.from(value);
    },
  },

  Number: {
    isFinite(value: number) {
      return Number.isFinite(value);
    },

    isNaN(value: any) {
      return Number.isNaN(value);
    },

    parseInt(value: string, radix = 10) {
      return Number.parseInt(value, radix);
    },

    parseFloat(value: string) {
      return Number.parseFloat(value);
    },
  },

  String: {
    fromCharCode(...args: number[]) {
      return String.fromCharCode(...args);
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

    max(...args: number[]) {
      return Math.max(...args);
    },

    min(...args: number[]) {
      return Math.min(...args);
    },

    random() {
      return Math.random(); // consider disabling in strict mode
    },
  },

  Date: {
    now() {
      return Date.now();
    },

    parse(str: string) {
      if (typeof str !== "string") {
        throw new MutorError("Date.parse expects a string");
      }
      return Date.parse(str);
    },
  },

  Boolean: {
    valueOf(value: any) {
      return Boolean(value);
    },
  },
};
