import type { MutorConfig, PartialMutorConfig } from "../types/types";
import escapeFn from "../utils/escape-fn";
import validateComputedProp from "../utils/validate-computed-prop";
import validateContext from "../utils/validate-context";
import compile from "./compile";
import { defaultConfig, namespaces } from "./constants";

export default class Mutor {
  protected __currentRenderedPath = "";
  protected __cacheSize = 0;
  protected __config: MutorConfig = { ...defaultConfig };
  protected __compiledTemplatesMap: Map<
    string,
    { fn: Function; size: number }
  > = new Map();
  protected __currentContext: any = null;
  protected __namespaces: Record<any, any> = {
    ...namespaces,
    Mutor: {
      include: (path: string, ctx: Record<any, any>) => {
        return this.renderComponent(path, ctx ?? this.__currentContext);
      },

      get $$context() {
        return this.__currentContext;
      },
    },
  };

  constructor(config: PartialMutorConfig) {
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
    } = conf;

    this.__config = {
      build: {
        include: new Set([
          ...defaultConfig.build.include,
          ...(build?.include || []),
        ]),
        exclude: new Set([
          ...defaultConfig.build.exclude,
          ...(build?.exclude || []),
        ]),
      },
      autoEscape: autoEscape === true ? true : autoEscape !== false,
      allowedProps: allowedProps || new Set(),
      allowFnCalls: !!allowFnCalls,
      cache: { ...defaultConfig.cache, ...(cache || {}) },
      forbiddenProps: forbiddenProps || new Set(),
      keepOpeningTagEscapeDelimiter:
        keepOpeningTagEscapeDelimiter === true
          ? true
          : keepOpeningTagEscapeDelimiter !== false,
      delimiters: {
        ...defaultConfig.delimiters,
        ...(overrideDelimeters || {}),
      },
    };

    return this.__config;
  }

  restoreDefaultConfig() {
    this.__config = { ...defaultConfig };
    return this.__config;
  }

  compile(template: string, path = "anonymous"): Function {
    return compile(template, this.__config, { path });
  }

  render(template: string, context: any): string {
    const prevContext = this.__currentContext;

    if (prevContext !== context) {
      this.__currentContext = context;
    }

    const result = this.compile(template)(
      validateContext(context),
      this.__namespaces,
      this.__config.allowedProps,
      this.__config.forbiddenProps,
      escapeFn,
      validateComputedProp,
    );

    this.__currentContext = prevContext;
    return result;
  }

  renderComponent(identifier: string, context: any): string {
    if (!this.__compiledTemplatesMap.has(identifier)) {
      throw new Error(`No template exists with the identifier '${identifier}'`);
    }

    const prevRenderComponentIdentifier = this.__currentRenderedPath;
    const prevContext = this.__currentContext;
    const compiled = this.__compiledTemplatesMap.get(identifier)!;

    this.__currentContext = context;
    this.__currentRenderedPath = identifier;

    const result = compiled.fn(
      validateContext(context),
      this.__namespaces,
      this.__config.allowedProps,
      this.__config.forbiddenProps,
      escapeFn,
      validateComputedProp,
    );

    this.__currentContext = prevContext;
    this.__currentRenderedPath = prevRenderComponentIdentifier;

    return result;
  }

  registerComponent(identifier: string, template: string) {
    const templateSize = template.length * 2 + 500;

    if (this.__cacheSize + templateSize > this.__config.cache.maxSize) {
      if (!this.createEntrySpaceForTemplate(templateSize)) {
        throw new Error(
          `The template for the component '${identifier}' is too large. Consider increasing 'cache.maxSize' in the config`,
        );
      }
    }

    this.__cacheSize += template.length * 2 + 500; // Approximate byte size
    this.__compiledTemplatesMap.set(identifier, {
      fn: this.compile(template),
      size: templateSize,
    });
  }

  reset() {
    this.__config = { ...defaultConfig };
    this.__compiledTemplatesMap.clear();
    this.__currentContext = null;
    this.__cacheSize = 0;
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

  public getDiagnostics() {
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
}
