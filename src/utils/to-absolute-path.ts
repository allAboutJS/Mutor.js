import { dirname, isAbsolute, resolve } from "node:path";

/**
 * Converts a relative path to an absolute path, optionally resolving it against a base path.
 *
 * @param basePath - The base path to resolve against.
 * @param relativePaths - The relative paths to resolve.
 * @returns The absolute path.
 */
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
