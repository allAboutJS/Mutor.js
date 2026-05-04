import compile from "../core/compile";
import { setCompiledTemplate } from "../providers/cache";
import { getConfig } from "../providers/config";

export default function registerComponent(name: string, template: string) {
  const { allowedProps, forbiddenProps } = getConfig();
  setCompiledTemplate(
    name,
    compile(template, { allowedProps, forbiddenProps, path: name }),
  );
}
