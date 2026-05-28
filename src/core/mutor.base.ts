import type {
  MutorConfig,
  PartialMutorConfig,
  RuntimeFrame,
} from "../types/types";
import createRuntimeFrame from "../utils/create-runtime";
import escapeFn from "../utils/escape-fn";
import validateComputedProp from "../utils/validate-computed-prop";
import validateContext from "../utils/validate-context";
import compile from "./compile";
import { defaultConfig, namespaces } from "./constants";
import { MutorCompilerError, MutorError } from "./error";

export default class MutorBase {
  protected __cacheSize = 0;
  protected __config: MutorConfig = { ...defaultConfig };
  protected __compiledTemplatesMap: Map<
    string,
    { fn: Function; size: number }
  > = new Map();
  protected __namespaces: Record<any, any> = {
    ...namespaces,
    Mutor: {
      await: async (value: any) => {
        return await value;
      },
    },
  };

  constructor(config: PartialMutorConfig = {}) {
    this.addConfig(config);
  }

  addConfig(conf: PartialMutorConfig): MutorConfig {
    const {
      autoEscape,
      delimiters: overrideDelimeters,
      allowedProps,
      forbiddenProps,
      keepOpeningTagEscapeDelimiter,
      allowFnCalls,
      cache,
      build,
      onIncludeFail,
      onIncludeError,
    } = conf;

    this.__config = {
      build: {
        include: new Set([...(build?.include || defaultConfig.build.include)]),
        exclude: new Set([
          ...defaultConfig.build.exclude,
          ...(build?.exclude || []),
        ]),
      },
      autoEscape: autoEscape === true ? true : autoEscape !== false,
      allowedProps: allowedProps || defaultConfig.allowedProps,
      allowFnCalls: !!allowFnCalls,
      onIncludeFail: onIncludeFail || defaultConfig.onIncludeFail,
      onIncludeError: onIncludeError || defaultConfig.onIncludeError,
      cache: { ...defaultConfig.cache, ...(cache || {}) },
      forbiddenProps: new Set([
        ...defaultConfig.forbiddenProps,
        ...(forbiddenProps || []),
      ]),
      keepOpeningTagEscapeDelimiter: keepOpeningTagEscapeDelimiter ?? false,
      delimiters: {
        ...defaultConfig.delimiters,
        ...(overrideDelimeters || {}),
      },
    };

    return this.__config;
  }

  restoreDefaultConfig() {
    this.__config = { ...defaultConfig };
  }

  compile(template: string, runtime?: RuntimeFrame): Function {
    return compile(template, this.__config, {
      path: runtime?.renderedPath || "anonymous",
    });
  }

  renderAsync(template: string, context: any): Promise<string> {
    return new Promise((resolve) => {
      resolve(this.render(template, context));
    });
  }

  render(template: string, context: any): string {
    const runtime = createRuntimeFrame(context, "anonymous");
    return this.__renderWithRuntime(template, runtime);
  }

  protected __renderWithRuntime(
    template: string,
    runtime: RuntimeFrame,
  ): string {
    const fn = this.compile(template, runtime);

    const result = fn(
      validateContext(runtime.context),
      this.__createNamespacesWithRuntime(runtime),
      this.__config.allowedProps,
      this.__config.forbiddenProps,
      escapeFn,
      validateComputedProp,
    );

    return result;
  }

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

  protected handleError(
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

  protected createEntrySpaceForTemplate(targetSize: number): boolean {
    if (this.__cacheSize + targetSize < this.__config.cache.maxSize) {
      return true;
    }

    if (targetSize > this.__config.cache.maxSize) {
      return false;
    }

    const firstEntry = this.__compiledTemplatesMap.entries().next().value;

    if (firstEntry) {
      const [oldestKey, oldestData] = firstEntry;
      this.__compiledTemplatesMap.delete(oldestKey);
      this.__cacheSize -= oldestData.size;
    }

    return this.createEntrySpaceForTemplate(targetSize);
  }

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

  protected register(identifier: string, template: string) {
    const templateSize = template.length * 2 + 500;

    if (this.__cacheSize + templateSize > this.__config.cache.maxSize) {
      if (!this.createEntrySpaceForTemplate(templateSize)) {
        throw new MutorError(
          `The template for the component '${identifier}' is too large and will not fit in the cache. Consider increasing 'cache.maxSize' in the config`,
        );
      }
    }

    // Use a temporary runtime for compilation context
    const tempRuntime = createRuntimeFrame(null, identifier);

    this.__cacheSize += template.length * 2 + 500;
    this.__compiledTemplatesMap.set(identifier, {
      fn: this.compile(template, tempRuntime),
      size: templateSize,
    });
  }

  reset() {
    this.__config = { ...defaultConfig };
    this.__compiledTemplatesMap.clear();
    this.__cacheSize = 0;
  }
}
