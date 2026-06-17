import { readFileSync } from "node:fs";
import {
  copyFile,
  mkdir,
  readdir,
  readFile,
  writeFile,
} from "node:fs/promises";
import { extname, isAbsolute, join, relative, resolve } from "node:path";
import type { PartialMutorConfig, RuntimeFrame } from "../types/types";
import createRuntimeFrame from "../utils/create-runtime";
import escapeFn from "../utils/escape-fn";
import toAbsolutePath from "../utils/to-absolute-path";
import validateComputedProp from "../utils/validate-computed-prop";
import { MutorError, MutorRuntimeError } from "./error";
import MutorBase, { LAYOUT_DIRECTIVE_REGEX } from "./mutor.base";

export default class MutorServer extends MutorBase {
  constructor(config: PartialMutorConfig = {}) {
    super(config);
    this.__setupIncludeForRuntime(createRuntimeFrame(null));

    /** Use file path to register layouts */
    this.addLayoutFromPath = (path: string) => {
      const src = readFileSync(toAbsolutePath(path), "utf-8");
      super.addLayout(src);
    };
  }

  addLayoutFromPath: (path: string) => void;

  private __resolvePath(path: string, renderedPath?: string) {
    const isAlias = path.startsWith("@/");
    const root = this.__config.rootDir
      ? toAbsolutePath(this.__config.rootDir)
      : process.cwd();

    if (isAlias) {
      return join(root, path.replace(/^@\//, "./"));
    }

    if (renderedPath && !isAbsolute(path)) {
      return toAbsolutePath(renderedPath, path.replace(/^\.\//, ""));
    }

    return resolve(root, path);
  }

  private __setupIncludeForRuntime(runtime: RuntimeFrame) {
    this.__namespaces.Mutor.include = (path: string, context: any) => {
      const root = this.__config.rootDir
        ? toAbsolutePath(this.__config.rootDir)
        : process.cwd();
      const resolvedPath = this.__resolvePath(path, runtime.renderedPath);
      const relativeToRoot = relative(root, resolvedPath);

      // Check if the resolved path is outside the root directory.
      if (relativeToRoot.startsWith("..") || isAbsolute(relativeToRoot)) {
        throw new MutorError(
          `The included path "${path}" is outside the root directory.` +
            `\nThe resolved path is "${resolvedPath}". ` +
            `It was included from ${runtime.renderedPath ? `"${runtime.renderedPath}"` : "an anonymous template"}.`,
        );
      }

      if (runtime.renderStack.has(resolvedPath)) {
        const stackArr = Array.from(runtime.renderStack);
        throw new MutorError(
          `Circular dependency detected during rendering.\n${stackArr.join("\n-> ")}\n-> ${stackArr[stackArr.length - 2] || resolvedPath}`,
        );
      }

      const previousPath = runtime.renderedPath;
      runtime.renderStack.add(resolvedPath);
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
        runtime.renderStack.delete(resolvedPath);
        runtime.renderedPath = previousPath;
      }
    };
  }

  render(template: string, context?: any): string {
    const runtime = createRuntimeFrame(context);
    this.__setupIncludeForRuntime(runtime);
    return this.__renderWithRuntime(template, runtime);
  }

  private __renderFile(path: string, context: any, runtime: RuntimeFrame) {
    this.__setupIncludeForRuntime(runtime);

    const absolutePath = this.__resolvePath(path, runtime.renderedPath);
    let compiled: Function, deps: string[];

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
        deps = entry.deps;

        // Move to the front of the cache
        this.__compiledTemplatesMap.delete(absolutePath);
        this.__compiledTemplatesMap.set(absolutePath, entry);
      } else {
        const template = readFileSync(absolutePath, "utf-8");

        compiled = this.__compile(template, runtime);
        deps = this.__extractInheritanceDeps(template) || [];

        if (this.__config.cache.active) {
          const templateSize = template.length * 2 + 500;

          if (this.__cacheSize + templateSize > this.__config.cache.maxSize) {
            if (this.__createEntrySpaceForTemplate(templateSize)) {
              this.__compiledTemplatesMap.set(absolutePath, {
                fn: compiled,
                size: templateSize,
                deps: this.__extractInheritanceDeps(template) || [],
              });
              this.__cacheSize += templateSize;
            }
          } else {
            this.__compiledTemplatesMap.set(absolutePath, {
              fn: compiled,
              size: templateSize,
              deps: this.__extractInheritanceDeps(template) || [],
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

      return this.__renderWithLayout(runtime, deps, result);
    } finally {
      // Restore previous state
      runtime.context = previousContext;
      runtime.renderedPath = previousPath;
    }
  }

  renderFile(path: string, context: any): string {
    return this.__renderFile(path, context, createRuntimeFrame(null));
  }

  /** Invalidates the layout cache entry for the specified path. */
  invalidateLayoutCacheEntry(path: string) {
    const absolutePath = this.__resolvePath(path);
    const entry = this.__compiledLayoutsMap.get(absolutePath);

    if (!entry) {
      return false;
    }

    this.__compiledLayoutsMap.delete(absolutePath);
    return true;
  }

  /** Registers all layout templates found in the specified directory. */
  async addLayoutsInDir(dir: string) {
    const absoluteDirPath = toAbsolutePath(dir);
    const entries = await readdir(absoluteDirPath, { withFileTypes: true });

    await Promise.all(
      entries.map(async (entry) => {
        const srcPath = join(absoluteDirPath, entry.name);

        if (this.__config.build.exclude.has(entry.name)) {
          return;
        }

        if (entry.isDirectory()) {
          return this.addLayoutsInDir(srcPath);
        }

        const extension = extname(srcPath);

        if (this.__config.build.include.has(extension)) {
          const template = await readFile(srcPath, "utf-8");

          if (LAYOUT_DIRECTIVE_REGEX.test(template)) {
            this.addLayout(template);
            return;
          }
        }
      }),
    );
  }

  /** Builds a directory from the source to the destination,
  rendering each file with the given context. */
  async buildDir(
    src: string,
    destination: string,
    context?: any,
    keepLayoutFiles?: boolean,
  ) {
    const absoluteDestinationPath = toAbsolutePath(destination);
    const absoluteSrcPath = toAbsolutePath(src);

    // Store the previous rootDir and set it to the absoluteSrcPath
    const previousRootDir = this.__config.rootDir;
    this.addConfig({ rootDir: absoluteSrcPath });

    try {
      const relativeToSrc = relative(absoluteSrcPath, absoluteDestinationPath);

      if (
        relativeToSrc === "" ||
        (!relativeToSrc.startsWith("..") && !isAbsolute(relativeToSrc))
      ) {
        throw new MutorError(
          "Destination directory cannot be the same as or a subdirectory of the source directory.",
        );
      }

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
            return this.buildDir(
              srcPath,
              destinationPath,
              context,
              keepLayoutFiles,
            );
          }

          const extension = extname(srcPath);

          if (this.__config.build.include.has(extension)) {
            const template = await readFile(srcPath, "utf-8");

            if (LAYOUT_DIRECTIVE_REGEX.test(template)) {
              this.addLayout(template);

              // Keep layout files as-is if keepLayoutFiles is true
              if (keepLayoutFiles) {
                await copyFile(srcPath, destinationPath);
              }

              return;
            }

            const rendered = this.render(template, context);
            await writeFile(destinationPath, rendered, "utf-8");
          } else {
            return await copyFile(srcPath, destinationPath);
          }
        }),
      );
    } finally {
      // Restore the previous rootDir
      this.addConfig({ rootDir: previousRootDir });
    }
  }

  /** Compiles a directory, rendering each file with the given context. */
  async compileDir(src: string) {
    if (!this.__config.cache.active) {
      throw new MutorError(
        "Caching is not active, cannot compile directory. Set 'cache.active' to true in the config.",
      );
    }

    const absolutePath = toAbsolutePath(src);
    const previousRootDir = this.__config.rootDir;

    this.addConfig({ rootDir: absolutePath });

    try {
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

            if (LAYOUT_DIRECTIVE_REGEX.test(template)) {
              this.addLayout(template);
              return;
            }

            const cached = this.__compiledTemplatesMap.get(absoluteSrcPath);

            // Reuse cached entry if it exists
            if (cached) {
              this.__compiledTemplatesMap.delete(absoluteSrcPath);
              this.__cacheSize -= cached.size;
            }

            const templateSize = template.length * 2 + 500;

            if (this.__cacheSize - templateSize > this.__config.cache.maxSize) {
              throw new MutorError(
                `Max cache size exceeded. Consider increasing 'cache.maxSize' in the config`,
              );
            }

            const compiled = this.__compile(template);
            const deps = this.__extractInheritanceDeps(template) || [];

            this.__compiledTemplatesMap.set(absoluteSrcPath, {
              fn: compiled,
              size: templateSize,
              deps,
            });
            this.__cacheSize += templateSize;
          }
        }),
      );
    } finally {
      // Restore previous rootDir
      this.addConfig({ rootDir: previousRootDir });
    }
  }
}
