import render from "./api/render";
import renderTemplate from "./api/render-template";
import compile from "./core/compile";

export * from "./providers/cache";
export * from "./providers/config";
export * from "./types/enums";
export * from "./types/types";

const g = globalThis as any;

g.MUTOR_RENDER = renderTemplate;

export { compile, render, renderTemplate };
