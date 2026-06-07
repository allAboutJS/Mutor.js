import { readFileSync } from "node:fs";
import {
  copyFile,
  mkdir,
  readdir,
  readFile,
  writeFile,
} from "node:fs/promises";
import { extname, join, resolve } from "node:path";
import type { PartialMutorConfig, RuntimeFrame } from "../types/types";
import createRuntimeFrame from "../utils/create-runtime";
import escapeFn from "../utils/escape-fn";
import toAbsolutePath from "../utils/to-absolute-path";
import validateComputedProp from "../utils/validate-computed-prop";
import { MutorError, MutorRuntimeError } from "./error";
import MutorBase from "./mutor.base";

export default class MutorServer extends MutorBase {
  constructor(config: PartialMutorConfig = {}) {
    super(config);
  }

  private __resolvePath(path: string, renderedPath?: string) {
    const isAlias = path.startsWith("@/");
    const root = this.__config.rootDir
      ? toAbsolutePath(this.__config.rootDir)
      : process.cwd();

    let resolvedPath: string;

    if (isAlias) {
      resolvedPath = join(root, path.replace(/^@\//, "./"));
    } else if (renderedPath) {
      resolvedPath = toAbsolutePath(renderedPath, path);
    } else {
      resolvedPath = resolve(process.cwd(), path);
    }

    return resolvedPath;
  }

  private __setupIncludeForRuntime(runtime: RuntimeFrame) {
    this.__namespaces.Mutor.include = (path: string, context: any) => {
      const resolvedPath = this.__resolvePath(path, runtime.renderedPath);

      if (runtime.includeStack.has(resolvedPath)) {
        throw new MutorError(
          `Circular include detected.\n${Array.from(runtime.includeStack).join("\n")}\n${resolvedPath}`,
        );
      }

      const previousPath = runtime.renderedPath;
      runtime.includeStack.add(resolvedPath);
      runtime.renderedPath = resolvedPath;

      try {
        return this.__renderFile(
          resolvedPath,
          context ?? runtime.context,
          runtime,
        );
      } catch (err) {
        return this.__handleError(err, previousPath, path, resolvedPath);
      } finally {
        runtime.includeStack.delete(resolvedPath);
        runtime.renderedPath = previousPath;
      }
    };
  }

  render(template: string, context: any): string {
    const runtime = createRuntimeFrame(context, "anonymous");
    this.__setupIncludeForRuntime(runtime);
    return this.__renderWithRuntime(template, runtime);
  }

  renderAsync(template: string, context: any): Promise<string> {
    return new Promise((resolve) => {
      resolve(this.render(template, context));
    });
  }

  private __renderFile(path: string, context: any, runtime: RuntimeFrame) {
    this.__setupIncludeForRuntime(runtime);

    const absolutePath = this.__resolvePath(path);
    let compiled: Function;

    // Save previous state for nested renders
    const previousContext = runtime.context;
    const previousPath = runtime.renderedPath;

    // Update runtime for this render
    runtime.context = context ?? previousContext;
    runtime.renderedPath = absolutePath;

    try {
      if (
        this.__config.cache.active &&
        this.__compiledTemplatesMap.has(absolutePath)
      ) {
        const entry = this.__compiledTemplatesMap.get(absolutePath)!;

        compiled = entry.fn;

        // Move to the front of the cache
        this.__compiledTemplatesMap.delete(absolutePath);
        this.__compiledTemplatesMap.set(absolutePath, entry);
      } else {
        const template = readFileSync(absolutePath, "utf-8");
        compiled = this.__compile(template, runtime);

        if (this.__config.cache.active) {
          const templateSize = template.length * 2 + 500;

          if (this.__cacheSize + templateSize > this.__config.cache.maxSize) {
            if (this.__createEntrySpaceForTemplate(templateSize)) {
              this.__compiledTemplatesMap.set(absolutePath, {
                fn: compiled,
                size: templateSize,
              });
              this.__cacheSize += templateSize;
            }
          } else {
            this.__compiledTemplatesMap.set(absolutePath, {
              fn: compiled,
              size: templateSize,
            });
            this.__cacheSize += templateSize;
          }
        }
      }

      const result = compiled(
        runtime.context,
        this.__createNamespacesWithRuntime(runtime),
        this.__config.allowedProps,
        this.__config.forbiddenProps,
        escapeFn,
        validateComputedProp,
        MutorRuntimeError,
      );

      return result;
    } finally {
      // Restore previous state
      runtime.context = previousContext;
      runtime.renderedPath = previousPath;
    }
  }

  renderFile(path: string, context: any): string {
    return this.__renderFile(path, context, createRuntimeFrame(null, path));
  }

  renderFileAsync(path: string, context: any): Promise<string> {
    return new Promise((resolve) => {
      resolve(this.renderFile(path, context));
    });
  }

  invalidateCacheEntry(path: string) {
    const absolutePath = this.__resolvePath(path);
    const entry = this.__compiledTemplatesMap.get(absolutePath);

    if (!entry) {
      return false;
    }

    this.__cacheSize -= entry.size;
    this.__compiledTemplatesMap.delete(absolutePath);
    return true;
  }

  async buildDir(src: string, destination: string, context: any) {
    const absoluteDestinationPath = toAbsolutePath(destination);
    const absoluteSrcPath = toAbsolutePath(src);

    await mkdir(absoluteDestinationPath, { recursive: true });

    const entries = await readdir(absoluteSrcPath, { withFileTypes: true });
    await Promise.all(
      entries.map(async (entry) => {
        const srcPath = join(absoluteSrcPath, entry.name);
        const destinationPath = join(absoluteDestinationPath, entry.name);

        if (this.__config.build.exclude.has(entry.name)) {
          return;
        }

        if (entry.isDirectory()) {
          return this.buildDir(srcPath, destinationPath, context);
        }

        const extension = extname(srcPath);

        if (this.__config.build.include.has(extension)) {
          const rendered = this.renderFile(srcPath, context);
          await writeFile(destinationPath, rendered, "utf-8");
        } else {
          return await copyFile(srcPath, destinationPath);
        }
      }),
    );
  }

  async compileDir(src: string) {
    const absolutePath = toAbsolutePath(src);
    const entries = await readdir(absolutePath, { withFileTypes: true });

    await Promise.all(
      entries.map(async (entry) => {
        const absoluteSrcPath = join(absolutePath, entry.name);

        if (this.__config.build.exclude.has(entry.name)) {
          return;
        }

        if (entry.isDirectory()) {
          return this.compileDir(absoluteSrcPath);
        }

        const extension = extname(absoluteSrcPath);

        if (this.__config.build.include.has(extension)) {
          const template = await readFile(absoluteSrcPath, "utf-8");
          this.__register(absoluteSrcPath, template);
        }
      }),
    );
  }
}
