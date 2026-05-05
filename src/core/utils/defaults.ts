import { getCurrentContext } from "../../providers/cache";

// Default configuration options for the compiler.
export const config = {
  // Tells the compiler whether to include the opening tag escape delimiter in the output.
  keepOpeningTagEscapeDelimiter: false,
};

// Default delimiters for template blocks.
export const delimiters = {
  // Defines the beginning of a template block.
  openingTag: "{{",
  // Defines the end of a template block.
  closingTag: "}}",
  // Specifies whether to trim whitespace before or after template blocks.
  whitespaceTrim: "~",
  // Tells the compiler that the following text should not be treated as an template block opening tag.
  openingTagEscape: "\\",
};

export const namespaces = {
  JSON: {
    stringify(value: any) {
      try {
        return JSON.stringify(value);
      } catch {
        throw new Error("JSON.stringify failed: invalid value");
      }
    },

    parse(str: string) {
      if (typeof str !== "string") {
        throw new Error("JSON.parse expects a string");
      }

      try {
        return JSON.parse(str);
      } catch {
        throw new Error("JSON.parse failed: invalid JSON string");
      }
    },
  },

  Object: {
    keys(obj: Object) {
      if (!obj || typeof obj !== "object") {
        throw new Error("Object.keys expects an object");
      }
      return Object.keys(obj);
    },

    values(obj: Object) {
      if (!obj || typeof obj !== "object") {
        throw new Error("Object.values expects an object");
      }
      return Object.values(obj);
    },

    entries(obj: Object) {
      if (!obj || typeof obj !== "object") {
        throw new Error("Object.entries expects an object");
      }
      return Object.entries(obj);
    },

    hasOwn(obj: Object, key: any) {
      if (!obj || typeof obj !== "object") {
        throw new Error("Object.hasOwn expects an object");
      }
      return Object.hasOwn(obj, key);
    },

    freeze(obj: Object) {
      if (!obj || typeof obj !== "object") {
        throw new Error("Object.freeze expects an object");
      }
      return Object.freeze(obj);
    },

    seal(obj: Object) {
      if (!obj || typeof obj !== "object") {
        throw new Error("Object.seal expects an object");
      }
      return Object.seal(obj);
    },

    fromEntries(entries: any[]) {
      if (!Array.isArray(entries)) {
        throw new Error("Object.fromEntries expects an array");
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
        throw new Error("Date.parse expects a string");
      }
      return Date.parse(str);
    },
  },

  Boolean: {
    valueOf(value: any) {
      return Boolean(value);
    },
  },

  Mutor: {
    include(path: string, ctx: Record<any, any>) {
      const g = globalThis as any;

      if (typeof g.MUTOR_RENDER !== "function") {
        throw new Error(
          "[Mutor] Render engine not initialized in this environment.",
        );
      }

      return g.MUTOR_RENDER(path, ctx ?? getCurrentContext());
    },

    get $$CONTEXT() {
      return getCurrentContext();
    },
  },
};
