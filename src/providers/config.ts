import { config, delimiters, namespaces } from "../core/utils/defaults";
import type { MutorConfig, PartialMutorConfig } from "../types/types";

const defaultConfig: MutorConfig = {
  autoEscape: true,
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
  dev: false,
};

const configProvider = {
  __config: { ...defaultConfig },

  getConfig(): MutorConfig {
    return this.__config;
  },

  restoreDefaultConfig() {
    this.__config = { ...defaultConfig };
    return this.__config;
  },

  setConfig(conf: PartialMutorConfig): MutorConfig {
    const {
      autoEscape,
      delimiters: overrideDelimeters,
      allowedProps,
      forbiddenProps,
      keepOpeningTagEscapeDelimiter,
      namespaces: userNamespaces,
      allowFnCalls,
      dev,
    } = conf;

    this.__config = {
      ...config,
      autoEscape: autoEscape === true ? true : autoEscape !== false,
      allowedProps: allowedProps || new Set(),
      allowFnCalls: !!allowFnCalls,
      dev: dev === true ? true : dev !== false,
      forbiddenProps: forbiddenProps || new Set(),
      keepOpeningTagEscapeDelimiter:
        keepOpeningTagEscapeDelimiter === true
          ? true
          : keepOpeningTagEscapeDelimiter !== false,
      delimiters: { ...delimiters, ...(overrideDelimeters || {}) },
      namespaces: { ...(userNamespaces || {}), ...namespaces },
    };

    return this.__config;
  },
};

export const getConfig = configProvider.getConfig.bind(configProvider);
export const setConfig = configProvider.setConfig.bind(configProvider);
export const restoreDefaultConfig =
  configProvider.restoreDefaultConfig.bind(configProvider);
