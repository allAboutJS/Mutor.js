const cacheProvider = {
  compiledMap: new Map<string, Function>(),

  getCompiledTemplate(path: string) {
    return this.compiledMap.get(path);
  },

  setCompiledTemplate(path: string, compiled: Function) {
    return this.compiledMap.set(path, compiled);
  },

  hasCompiledTemplate(path: string) {
    return this.compiledMap.has(path);
  },
};

export const setCompiledTemplate =
  cacheProvider.setCompiledTemplate.bind(cacheProvider);

export const getCompiledTemplate =
  cacheProvider.getCompiledTemplate.bind(cacheProvider);

export const hasCompiledTemplate =
  cacheProvider.hasCompiledTemplate.bind(cacheProvider);
