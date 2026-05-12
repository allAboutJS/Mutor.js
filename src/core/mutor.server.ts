import { readFileSync } from "node:fs";
import {
  copyFile,
  mkdir,
  readdir,
  readFile,
  writeFile,
} from "node:fs/promises";
import { extname, join } from "node:path";
import type { PartialMutorConfig } from "../types/types";
import escapeFn from "../utils/escape-fn";
import toAbsolutePath from "../utils/to-absolute-path";
import validateComputedProp from "../utils/validate-computed-prop";
import validateContext from "../utils/validate-context";
import { MutorError } from "./error";
import MutorBase from "./mutor";

export default class Mutor extends MutorBase {
  constructor(config: PartialMutorConfig = {}) {
    super(config);
    this.__namespaces.Mutor.include = (path: string, context: any) => {
      const includeSource = this.__currentRenderedPath;
      const resolvedPath = toAbsolutePath(this.__currentRenderedPath, path);
      const errMsg = `[Mutor.js]\nFile '${resolvedPath}' not found.\nThe file was included from ${`'${includeSource}'` || "an anonymous template"}.\n`;

      if (this.__includeStack.has(resolvedPath)) {
        throw new MutorError(
          `Circular include detected.\n${Array.from(this.__includeStack).join("\n")}\n${resolvedPath}`,
        );
      }

      try {
        this.__includeStack.add(resolvedPath);
        return this.renderFile(resolvedPath, context ?? this.__currentContext);
      } catch (err) {
        if (this.__config.onIncludeFail === "throw") {
          throw new MutorError(errMsg);
        }

        // Log error if onIncludeFail is set to "ignoreLog" and onIncludeError is not defined
        if (
          this.__config.onIncludeFail === "ignoreLog" &&
          !this.__config.onIncludeError
        ) {
          console.log(errMsg);
        }

        return (
          this.__config.onIncludeError?.(
            { from: includeSource, path, absolutePath: resolvedPath },
            err,
          ) ?? ""
        );
      } finally {
        this.__includeStack.delete(resolvedPath);
        this.__currentRenderedPath = includeSource;
      }
    };
  }

  renderFile(path: string, context: any): string {
    const absolutePath = toAbsolutePath(path);
    let compiled: Function;

    const prevContext = this.__currentContext;
    const prevRenderComponentIdentifier = this.__currentRenderedPath;

    this.__currentContext = context;
    this.__currentRenderedPath = path;

    if (
      this.__config.cache.active &&
      this.__compiledTemplatesMap.has(absolutePath)
    ) {
      compiled = this.__compiledTemplatesMap.get(absolutePath)!.fn;
    } else {
      const template = readFileSync(absolutePath, "utf-8");
      compiled = this.compile(template);

      if (this.__config.cache.active) {
        const templateSize = template.length * 2 + 500; // Approximate byte size

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
            this.registerComponent(absoluteSrcPath, template);
          } catch {}
        }
      }),
    );
  }
}
