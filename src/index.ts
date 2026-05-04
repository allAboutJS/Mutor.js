import registerComponent from "./api/register-component";
import render from "./api/render";
import renderFromFile from "./api/render-from-file";
import renderTemplate from "./api/render-template";
import validateContext from "./api/validate-context";
import compile from "./core/compile";

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
  renderFromFile,
  renderTemplate,
  validateContext,
};
