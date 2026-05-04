import { config, delimiters, namespaces } from "../core/utils/defaults";
import type { MutorConfig, PartialMutorConfig } from "../types/types";

const configProvider = {
  __config: {
    allowedProps: new Set(),
    forbiddenProps: new Set(["__proto__", "constructor", "prototype"]),
    allowFnCalls: false,
    delimiters: {
      closingTag: "}}",
      openingTag: "{{",
      openingTagEscape: "\\",
      whitespaceTrim: "~",
    },
    keepOpeningTagEscapeDelimiter: false,
    namespaces,
  } as MutorConfig,

  getConfig(): MutorConfig {
    return this.__config;
  },

  setConfig(conf: PartialMutorConfig): MutorConfig {
    const {
      delimiters: overrideDelimeters,
      allowedProps,
      forbiddenProps,
      keepOpeningTagEscapeDelimiter,
      namespaces: userNamespaces,
      allowFnCalls,
    } = conf;

    this.__config = {
      ...config,
      allowedProps: allowedProps || new Set(),
      allowFnCalls: allowFnCalls === true,
      forbiddenProps: forbiddenProps || new Set(),
      keepOpeningTagEscapeDelimiter: keepOpeningTagEscapeDelimiter ?? false,
      delimiters: { ...delimiters, ...(overrideDelimeters || {}) },
      namespaces: { ...(userNamespaces || {}), ...namespaces },
    } as Required<MutorConfig>;

    return this.__config;
  },
};

export const getConfig = configProvider.getConfig.bind(configProvider);
export const setConfig = configProvider.setConfig.bind(configProvider);
