const cacheProvider = {
  compiledMap: new Map<string, Function>(),
  currentContext: null as Record<any, any> | null,

  getCompiledTemplate(path: string) {
    return this.compiledMap.get(path);
  },

  setCompiledTemplate(path: string, compiled: Function) {
    return this.compiledMap.set(path, compiled);
  },

  hasCompiledTemplate(path: string) {
    return this.compiledMap.has(path);
  },

  getCurrentContext() {
    return this.currentContext;
  },

  setCurrentContext(ctx: Record<any, any> | null) {
    this.currentContext = ctx;
    return ctx;
  },
};

export const setCompiledTemplate =
  cacheProvider.setCompiledTemplate.bind(cacheProvider);

export const getCompiledTemplate =
  cacheProvider.getCompiledTemplate.bind(cacheProvider);

export const hasCompiledTemplate =
  cacheProvider.hasCompiledTemplate.bind(cacheProvider);

export const getCurrentContext =
  cacheProvider.getCurrentContext.bind(cacheProvider);

export const setCurrentContext =
  cacheProvider.setCurrentContext.bind(cacheProvider);
