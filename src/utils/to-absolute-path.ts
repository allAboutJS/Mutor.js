import { dirname, isAbsolute, resolve } from "node:path";

export default function toAbsolutePath(
  basePath: string,
  ...relativePaths: string[]
) {
  const absoluteBase = isAbsolute(basePath)
    ? basePath
    : resolve(process.cwd(), basePath);

  if (relativePaths.length) {
    const baseDir = dirname(absoluteBase);
    return resolve(baseDir, ...relativePaths);
  }

  return absoluteBase;
}
