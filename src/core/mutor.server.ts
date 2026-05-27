import { readFileSync } from "node:fs";
import {
  copyFile,
  mkdir,
  readdir,
  readFile,
  writeFile,
} from "node:fs/promises";
import { extname, join } from "node:path";
import type { PartialMutorConfig, RuntimeFrame } from "../types/types";
import createRuntimeFrame from "../utils/create-runtime";
import escapeFn from "../utils/escape-fn";
import toAbsolutePath from "../utils/to-absolute-path";
import validateComputedProp from "../utils/validate-computed-prop";
import validateContext from "../utils/validate-context";
import { MutorError } from "./error";
import MutorBase from "./mutor.base";

export default class MutorServer extends MutorBase {
  constructor(config: PartialMutorConfig = {}) {
    super(config);
  }

  /**
   * Set up the include namespace with the given runtime.
   * This must be done before rendering to ensure includes have access to the runtime.
   */
  private __setupIncludeForRuntime(runtime: RuntimeFrame) {
    this.__namespaces.Mutor.include = (path: string, context: any) => {
      const resolvedPath = toAbsolutePath(runtime.renderedPath, path);

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
        return this.handleError(err, previousPath, path, resolvedPath);
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

    const absolutePath = toAbsolutePath(path);
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
        compiled = this.__compiledTemplatesMap.get(absolutePath)!.fn;
      } else {
        const template = readFileSync(absolutePath, "utf-8");
        compiled = this.compile(template, runtime);

        if (this.__config.cache.active) {
          const templateSize = template.length * 2 + 500;

          if (this.__cacheSize + templateSize > this.__config.cache.maxSize) {
            if (this.createEntrySpaceForTemplate(templateSize)) {
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
        validateContext(runtime.context),
        this.__createNamespacesWithRuntime(runtime),
        this.__config.allowedProps,
        this.__config.forbiddenProps,
        escapeFn,
        validateComputedProp,
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
          try {
            const template = await readFile(absoluteSrcPath, "utf-8");
            this.register(absoluteSrcPath, template);
          } catch {}
        }
      }),
    );
  }
}
