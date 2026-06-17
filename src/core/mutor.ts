import type { PartialMutorConfig, RuntimeFrame } from "../types/types";
import createRuntimeFrame from "../utils/create-runtime";
import escapeFn from "../utils/escape-fn";
import validateComputedProp from "../utils/validate-computed-prop";
import { MutorError, MutorRuntimeError } from "./error";
import MutorBase from "./mutor.base";

/**
 * Mutor is the main client class for the Mutor template engine.
 * It extends MutorBase and provides client-specific functionality.
 */
export default class Mutor extends MutorBase {
  constructor(config: PartialMutorConfig = {}) {
    super(config);
    this.__setupIncludeForRuntime(createRuntimeFrame(null));
  }

  private __setupIncludeForRuntime(runtime: RuntimeFrame) {
    this.__namespaces.Mutor.include = (path: string, context: any) => {
      if (runtime.renderStack.has(path)) {
        const stackArr = Array.from(runtime.renderStack);
        throw new MutorError(
          `Circular dependency detected during rendering.\n${stackArr.join("\n-> ")}\n-> ${stackArr[stackArr.length - 2] || path}`,
        );
      }

      const previousPath = runtime.renderedPath;

      runtime.renderStack.add(path);
      runtime.renderedPath = path;

      try {
        return this.__renderComponent(
          path,
          context ?? runtime.context,
          runtime,
        );
      } catch (err) {
        return this.__handleError(err, previousPath, path, undefined);
      } finally {
        runtime.renderStack.delete(path);
        runtime.renderedPath = previousPath;
      }
    };
  }

  render(template: string, context?: any): string {
    const runtime = createRuntimeFrame(context);
    this.__setupIncludeForRuntime(runtime);
    return this.__renderWithRuntime(template, runtime);
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
      this.__setupIncludeForRuntime(runtime);

      const result = compiled.fn(
        runtime.context,
        this.__createNamespacesWithRuntime(runtime),
        this.__config.allowedProps,
        this.__config.forbiddenProps,
        escapeFn,
        validateComputedProp,
        MutorRuntimeError,
      );

      return this.__renderWithLayout(runtime, compiled.deps, result);
    } finally {
      // Restore previous state
      runtime.context = previousContext;
      runtime.renderedPath = previousPath;
    }
  }

  renderComponent(identifier: string, context?: any): string {
    return this.__renderComponent(
      identifier,
      context,
      createRuntimeFrame(context, identifier),
    );
  }

  registerComponent(identifier: string, template: string) {
    return this.__register(identifier, template);
  }
}
