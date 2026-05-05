import compile from "../core/compile";
import { setCompiledTemplate } from "../providers/cache";

export default function registerComponent(name: string, template: string) {
  setCompiledTemplate(name, compile(template, { path: name }));
}
