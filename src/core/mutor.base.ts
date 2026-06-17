import packageJSON from "../../package.json";
import type {
  MutorConfig,
  PartialMutorConfig,
  RuntimeFrame,
} from "../types/types";
import createRuntimeFrame from "../utils/create-runtime";
import escapeFn from "../utils/escape-fn";
import validateComputedProp from "../utils/validate-computed-prop";
import compile from "./compile";
import { defaultConfig, namespaces } from "./constants";
import { MutorCompilerError, MutorError, MutorRuntimeError } from "./error";

/** Matches the layout directive in a template string. */
export const LAYOUT_DIRECTIVE_REGEX =
  /^\s*{{~?#\s*layout\s+('|"|`)[a-zA-Z$_][a-zA-Z$_\-0-9]*\1\s*~?}}/;

/** Matches a quoted string used in a layout directive. */
export const QUOTED_STR_REGEX = /('|"|`)[a-zA-Z$_][a-zA-Z$_\-0-9]*\1/;

/** Matches the optional layout directive along with the inheritance directive in a template string. */
export const OPTIONAL_INHERITANCE_DIRECTIVE_REGEX =
  /^(\s*{{~?#\s*layout\s+('|"|`)[a-zA-Z$_][a-zA-Z$_\-0-9]*\2\s*~?~?}})*(\s*{{~?#\s*use\s+('|"|`)[a-zA-Z$_][a-zA-Z$_\-0-9]*\4\s*~?}})*/;

/** Matches the inheritance directive in a template string. */
export const INHERITANCE_DIRECTIVE_REGEX =
  /{{~?#\s*use\s+('|"|`)[a-zA-Z$_][a-zA-Z$_\-0-9]*\1\s*~?}}/g;

/** The base class for the Mutor compiler. */
export default class MutorBase {
  /** The current cache size. */
  protected __cacheSize = 0;

  /** The current configuration. */
  protected __config: MutorConfig = { ...defaultConfig };

  /** The compiled layouts map. */
  protected __compiledLayoutsMap: Map<
    string,
    { fn: Function; deps: string[] }
  > = new Map();

  /** The compiled templates map. */
  protected __compiledTemplatesMap: Map<
    string,
    { fn: Function; size: number; deps: string[] }
  > = new Map();

  /** The current namespaces. */
  protected __namespaces: Record<any, any> = { ...namespaces };

  constructor(config: PartialMutorConfig = {}) {
    this.addConfig(config);
    this.__namespaces.Mutor = {};
  }

  /** The version of the package. */
  version = packageJSON.version;

  /** Adds a configuration to the current configuration. */
  addConfig(conf: PartialMutorConfig): MutorConfig {
    const {
      autoEscape,
      delimiters: overrideDelimeters,
      allowedProps,
      forbiddenProps,
      preserveEscapeDelimiter,
      allowFnCalls,
      cache,
      build,
      onIncludeFail,
      onIncludeError,
      rootDir,
      debugRuntimeErrors,
    } = conf;

    const delimiters = {
      ...defaultConfig.delimiters,
      ...(overrideDelimeters || {}),
    };

    if (
      delimiters.openingTag.startsWith(delimiters.closingTag) ||
      delimiters.closingTag.startsWith(delimiters.openingTag)
    ) {
      throw new MutorError(
        "The openingTag and closingTag delimiters cannot overlap.",
      );
    }

    this.__config = {
      build: {
        include: new Set([...(build?.include || defaultConfig.build.include)]),
        exclude: new Set([
          ...defaultConfig.build.exclude,
          ...(build?.exclude || []),
        ]),
      },
      rootDir,
      autoEscape: autoEscape !== false,
      allowedProps: new Set([...(allowedProps || defaultConfig.allowedProps)]),
      allowFnCalls: allowFnCalls === true,
      onIncludeFail: onIncludeFail || defaultConfig.onIncludeFail,
      onIncludeError: onIncludeError || defaultConfig.onIncludeError,
      cache: { ...defaultConfig.cache, ...(cache || {}) },
      forbiddenProps: new Set([
        ...defaultConfig.forbiddenProps,
        ...(forbiddenProps || []),
      ]),
      preserveEscapeDelimiter: preserveEscapeDelimiter === true,
      debugRuntimeErrors: debugRuntimeErrors === true,
      delimiters,
    };

    return this.__config;
  }

  /** Restores the default configuration. */
  restoreDefaultConfig() {
    this.__config = { ...defaultConfig };
  }

  /** Compiles a template string into a function. */
  protected __compile(template: string, runtime?: RuntimeFrame) {
    return compile(template, this.__config, {
      path: runtime?.renderedPath || "anonymous",
    });
  }

  /** Compiles a template string into a function. */
  compile(template: string): (context?: any) => string {
    const fn = this.__compile(template);

    return (context: any) =>
      fn(
        context,
        this.__createNamespacesWithRuntime(createRuntimeFrame(context)),
        this.__config.allowedProps,
        this.__config.forbiddenProps,
        escapeFn,
        validateComputedProp,
        MutorRuntimeError,
      );
  }

  /** Renders a template string with the given context. */
  render(template: string, context: any): string {
    const runtime = createRuntimeFrame(context);
    return this.__renderWithRuntime(template, runtime);
  }

  /** Invalidates a compiled template cache entry by its identifier. */
  invalidateTemplateCacheEntry(identifier: string) {
    const entry = this.__compiledTemplatesMap.get(identifier);
    if (!entry) {
      return false;
    }

    this.__cacheSize -= entry.size;
    this.__compiledTemplatesMap.delete(identifier);
    return true;
  }

  /** Renders a template string with the given runtime frame.
  Wraps the result in layout dependencies. */
  protected __renderWithLayout(
    runtime: RuntimeFrame,
    deps: string[],
    value: string,
  ): string {
    const layouts = deps
      .map((dep) => {
        const compiled = this.__compiledLayoutsMap.get(dep);

        if (!compiled) {
          throw new MutorError(
            `Layout "${dep}" is not a registered layout.` +
              `\nIt was used by ${runtime.renderedPath.length ? `the template/component "${runtime.renderedPath}"` : "an anonymous template"}.`,
          );
        }

        return compiled;
      })
      .reverse();

    for (const dep of deps) {
      runtime.renderStack.add(`internal://layouts/${dep}`);
    }

    try {
      return layouts.reduce((a, b) => {
        if (b) {
          // Update the slot value
          const prevSlot = this.__namespaces.Mutor.slot;
          this.__namespaces.Mutor.slot = a;

          for (const dep of b.deps) {
            runtime.renderStack.add(`internal://layouts/${dep}`);
          }

          try {
            const result = b.fn(
              runtime.context,
              this.__createNamespacesWithRuntime(runtime),
              this.__config.allowedProps,
              this.__config.forbiddenProps,
              escapeFn,
              validateComputedProp,
              MutorRuntimeError,
            );

            return this.__renderWithLayout(runtime, b.deps, result);
          } finally {
            this.__namespaces.Mutor.slot = prevSlot;
            for (const dep of b.deps) {
              runtime.renderStack.delete(`internal://layouts/${dep}`);
            }
          }
        }

        return a;
      }, value);
    } finally {
      for (const dep of deps) {
        runtime.renderStack.delete(`internal://layouts/${dep}`);
      }
    }
  }

  /** Renders a template string with the given runtime frame. */
  protected __renderWithRuntime(
    template: string,
    runtime: RuntimeFrame,
  ): string {
    const fn = this.__compile(template, runtime);
    const deps = this.__extractInheritanceDeps(template);

    const result = fn(
      runtime.context,
      this.__createNamespacesWithRuntime(runtime),
      this.__config.allowedProps,
      this.__config.forbiddenProps,
      escapeFn,
      validateComputedProp,
      MutorRuntimeError,
    );

    return this.__renderWithLayout(runtime, deps || [], result);
  }

  /** Creates the runtime namespaces with the given runtime frame. */
  protected __createNamespacesWithRuntime(
    runtime: RuntimeFrame,
  ): Record<any, any> {
    return {
      ...this.__namespaces,
      Mutor: {
        ...this.__namespaces.Mutor,
        $$context: runtime.context,
      },
    };
  }

  /** Handles errors that occur during template compilation or rendering. */
  protected __handleError(
    err: unknown,
    from: string,
    path: string,
    absolutePath?: string,
  ): string {
    if (this.__config.onIncludeFail === "throw") {
      throw err instanceof MutorCompilerError
        ? err
        : new MutorError((err as Error).message);
    }

    const meta = { from, path, absolutePath };

    // Log error if onIncludeFail is set to "ignore" and onIncludeError is not defined
    if (
      this.__config.onIncludeFail === "ignoreLog" &&
      !this.__config.onIncludeError
    ) {
      err instanceof MutorCompilerError
        ? console.log(err)
        : console.log(`[Mutor.js]\n${(err as Error).message}`);
    }

    return this.__config.onIncludeError?.(meta, err) ?? "";
  }

  /** Creates the entry space for a template in the cache, returning true if successful. */
  protected __createEntrySpaceForTemplate(targetSize: number): boolean {
    if (this.__cacheSize + targetSize <= this.__config.cache.maxSize) {
      return true;
    }

    if (targetSize > this.__config.cache.maxSize) {
      return false;
    }

    const firstEntry = this.__compiledTemplatesMap.entries().next().value;

    // Remove the oldest entry to make room for the new one
    if (firstEntry) {
      const [oldestKey, oldestData] = firstEntry;
      this.__compiledTemplatesMap.delete(oldestKey);
      this.__cacheSize -= oldestData.size;
    }

    return this.__createEntrySpaceForTemplate(targetSize);
  }

  /** Returns diagnostic information about the cache. */
  getDiagnostics() {
    const maxSize = this.__config.cache.maxSize;

    return {
      bytesUsed: this.__cacheSize,
      bytesMax: maxSize,
      readableUsed: `${(this.__cacheSize / 1024 / 1024).toFixed(2)} MB`,
      readableMax: `${(maxSize / 1024 / 1024).toFixed(2)} MB`,
      totalEntries: this.__compiledTemplatesMap.size,
      percentFull:
        maxSize > 0
          ? Math.min(100, Math.round((this.__cacheSize / maxSize) * 100))
          : 0,
      avgTemplateSize:
        this.__compiledTemplatesMap.size > 0
          ? Math.round(this.__cacheSize / this.__compiledTemplatesMap.size)
          : 0,
    };
  }

  /** Compiles and registers a template with the cache. */
  protected __register(identifier: string, template: string) {
    const templateSize = template.length * 2 + 500;
    const existingSize = this.__compiledTemplatesMap.get(identifier)?.size ?? 0;

    if (
      this.__cacheSize - existingSize + templateSize >
      this.__config.cache.maxSize
    ) {
      throw new MutorError(
        `The template for the component '${identifier}' is too large and will not fit in the cache. Consider increasing 'cache.maxSize' in the config`,
      );
    }

    // Use a temporary runtime for compilation context
    const tempRuntime = createRuntimeFrame(null, identifier);
    // Compile first to expose errors before updating state
    const compiled = this.__compile(template, tempRuntime);

    // Delete existing entry if it exists
    this.__compiledTemplatesMap.delete(identifier);
    this.__cacheSize -= existingSize;

    // Add new entry
    this.__cacheSize += template.length * 2 + 500;
    this.__compiledTemplatesMap.set(identifier, {
      fn: compiled,
      size: templateSize,
      deps: this.__extractInheritanceDeps(template) || [],
    });
  }

  /** Resets the cache to its initial state. */
  reset() {
    this.__config = { ...defaultConfig };
    this.__compiledTemplatesMap.clear();
    this.__compiledLayoutsMap.clear();
    this.__cacheSize = 0;
  }

  /** Registers a layout template with the given source code. */
  addLayout(src: string) {
    const result = src.match(LAYOUT_DIRECTIVE_REGEX);

    if (!result) {
      throw new MutorError(
        `Layouts must have the layout directive. Add '{{# layout "identifier" }}' to the top the source template.`,
      );
    }

    const match = result[0].trim();
    const layoutName = match
      .match(QUOTED_STR_REGEX)![0]
      .replaceAll(/'|"|`/g, "");

    const layoutDeps = this.__extractInheritanceDeps(src);
    const compiled = this.__compile(
      src,
      createRuntimeFrame(null, `internal://layout/${layoutName}`),
    );

    this.__compiledLayoutsMap.set(layoutName, {
      fn: compiled,
      deps: layoutDeps || [],
    });
    this.__detectCyclicLayoutDependency(layoutName);
  }

  /** Detects cyclic dependencies in layout templates. */
  protected __detectCyclicLayoutDependency(
    entry: string,
    visited = new Set<string>(),
    stack: string[] = [],
  ): void {
    if (stack.includes(entry)) {
      this.__compiledLayoutsMap.delete(entry);

      throw new MutorError(
        `Circular layout dependency detected.\n${[...stack, entry].join(" -> ")}`,
      );
    }

    if (visited.has(entry)) {
      return;
    }

    visited.add(entry);
    stack.push(entry);

    const deps = this.__compiledLayoutsMap.get(entry)?.deps ?? [];

    for (const dep of deps) {
      this.__detectCyclicLayoutDependency(dep, visited, stack);
    }

    stack.pop();
  }

  /** Extracts the inheritance dependencies from a layout template. */
  protected __extractInheritanceDeps(src: string) {
    const result = src.match(OPTIONAL_INHERITANCE_DIRECTIVE_REGEX);

    if (!result) {
      return null;
    }

    const matches = result[0].matchAll(INHERITANCE_DIRECTIVE_REGEX);
    const deps = [];

    for (const match of matches) {
      const extractedName = match[0]
        .match(QUOTED_STR_REGEX)![0]
        .replaceAll(/'|"|`/g, "");

      deps.push(extractedName);
    }

    return deps;
  }
}
