import render from "./api/render";
import renderTemplate from "./api/render-template";
import compile from "./core/compile";

export * from "./providers/cache";
export * from "./providers/config";
export * from "./types/enums";
export * from "./types/types";

export { compile, render, renderTemplate };
