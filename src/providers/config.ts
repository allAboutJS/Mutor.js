import { config, delimiters } from "../core/utils/defaults";
import type { MutorConfig, PartialMutorConfig } from "../types/types";

const configProvider = {
  __config: {
    allowedProps: new Set(),
    forbiddenProps: new Set(["__proto__", "constructor", "prototype"]),
    delimiters: {
      closingTag: "}}",
      openingTag: "{{",
      openingTagEscape: "\\",
      whitespaceTrim: "~",
    },
    keepOpeningTagEscapeDelimiter: false,
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
    } = conf;

    this.__config = {
      ...config,
      allowedProps: allowedProps || new Set(),
      forbiddenProps: forbiddenProps || new Set(),
      keepOpeningTagEscapeDelimiter: keepOpeningTagEscapeDelimiter ?? false,
      delimiters: { ...delimiters, ...(overrideDelimeters || {}) },
    } as Required<MutorConfig>;

    return this.__config;
  },
};

export const getConfig = configProvider.getConfig.bind(configProvider);
export const setConfig = configProvider.setConfig.bind(configProvider);
