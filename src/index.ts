import registerComponent from "./api/register-component";
import render from "./api/render";
import renderComponent from "./api/render-component";
import renderFromFile from "./api/render-from-file";
import validateContext from "./api/validate-context";
import compile from "./core/compile";
import validateComputedProp from "./core/utils/validate-computed-props";

export * from "./providers/cache";
export * from "./providers/config";
export * from "./types/enums";
export * from "./types/types";

const g = globalThis as any;

g.MUTOR_RENDER = renderFromFile;

export {
  compile,
  registerComponent,
  render,
  renderComponent,
  renderFromFile,
  validateComputedProp,
  validateContext,
};
