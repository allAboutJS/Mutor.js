import type { PartialMutorConfig, RuntimeFrame } from "../types/types";
import createRuntimeFrame from "../utils/create-runtime";
import escapeFn from "../utils/escape-fn";
import validateComputedProp from "../utils/validate-computed-prop";
import validateContext from "../utils/validate-context";
import { MutorError } from "./error";
import MutorBase from "./mutor.base";

export default class Mutor extends MutorBase {
  constructor(config: PartialMutorConfig = {}) {
    super(config);
  }

  private __setupIncludeForRuntime(runtime: RuntimeFrame) {
    this.__namespaces.Mutor.include = (path: string, context: any) => {
      if (runtime.includeStack.has(path)) {
        throw new MutorError(
          `Circular include detected.\n${Array.from(runtime.includeStack).join(" -> ")} -> ${path}`,
        );
      }

      const previousPath = runtime.renderedPath;
      runtime.includeStack.add(path);
      runtime.renderedPath = path;

      try {
        return this.__renderComponent(
          path,
          context ?? runtime.context,
          runtime,
        );
      } catch (err) {
        return this.handleError(err, previousPath, path, undefined);
      } finally {
        runtime.includeStack.delete(path);
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

  private __renderComponent(
    identifier: string,
    context: any,
    runtime: RuntimeFrame,
  ) {
    if (!this.__compiledTemplatesMap.has(identifier)) {
      throw new MutorError(
        `No template exists with the identifier '${identifier}'`,
      );
    }

    const compiled = this.__compiledTemplatesMap.get(identifier)!;

    // Save previous state for nested renders
    const previousContext = runtime.context;
    const previousPath = runtime.renderedPath;

    // Update runtime for this render
    runtime.context = context ?? previousContext;
    runtime.renderedPath = identifier;

    try {
      const result = compiled.fn(
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

  renderComponent(identifier: string, context: any): string {
    return this.__renderComponent(
      identifier,
      context,
      createRuntimeFrame(context, identifier),
    );
  }

  registerComponent(identifier: string, template: string) {
    return this.register(identifier, template);
  }
}
