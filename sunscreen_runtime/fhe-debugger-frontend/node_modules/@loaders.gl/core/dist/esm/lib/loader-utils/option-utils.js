import { isPureObject, isObject } from '../../javascript-utils/is-type';
import { probeLog, NullLog } from './loggers';
import { DEFAULT_LOADER_OPTIONS, REMOVED_LOADER_OPTIONS } from './option-defaults';
export function getGlobalLoaderState() {
  globalThis.loaders = globalThis.loaders || {};
  const {
    loaders
  } = globalThis;
  loaders._state = loaders._state || {};
  return loaders._state;
}
export const getGlobalLoaderOptions = () => {
  const state = getGlobalLoaderState();
  state.globalOptions = state.globalOptions || {
    ...DEFAULT_LOADER_OPTIONS
  };
  return state.globalOptions;
};
export function setGlobalOptions(options) {
  const state = getGlobalLoaderState();
  const globalOptions = getGlobalLoaderOptions();
  state.globalOptions = normalizeOptionsInternal(globalOptions, options);
}
export function normalizeOptions(options, loader, loaders, url) {
  loaders = loaders || [];
  loaders = Array.isArray(loaders) ? loaders : [loaders];
  validateOptions(options, loaders);
  return normalizeOptionsInternal(loader, options, url);
}
function validateOptions(options, loaders) {
  validateOptionsObject(options, null, DEFAULT_LOADER_OPTIONS, REMOVED_LOADER_OPTIONS, loaders);
  for (const loader of loaders) {
    const idOptions = options && options[loader.id] || {};
    const loaderOptions = loader.options && loader.options[loader.id] || {};
    const deprecatedOptions = loader.deprecatedOptions && loader.deprecatedOptions[loader.id] || {};
    validateOptionsObject(idOptions, loader.id, loaderOptions, deprecatedOptions, loaders);
  }
}
function validateOptionsObject(options, id, defaultOptions, deprecatedOptions, loaders) {
  const loaderName = id || 'Top level';
  const prefix = id ? "".concat(id, ".") : '';
  for (const key in options) {
    const isSubOptions = !id && isObject(options[key]);
    const isBaseUriOption = key === 'baseUri' && !id;
    const isWorkerUrlOption = key === 'workerUrl' && id;
    if (!(key in defaultOptions) && !isBaseUriOption && !isWorkerUrlOption) {
      if (key in deprecatedOptions) {
        probeLog.warn("".concat(loaderName, " loader option '").concat(prefix).concat(key, "' no longer supported, use '").concat(deprecatedOptions[key], "'"))();
      } else if (!isSubOptions) {
        const suggestion = findSimilarOption(key, loaders);
        probeLog.warn("".concat(loaderName, " loader option '").concat(prefix).concat(key, "' not recognized. ").concat(suggestion))();
      }
    }
  }
}
function findSimilarOption(optionKey, loaders) {
  const lowerCaseOptionKey = optionKey.toLowerCase();
  let bestSuggestion = '';
  for (const loader of loaders) {
    for (const key in loader.options) {
      if (optionKey === key) {
        return "Did you mean '".concat(loader.id, ".").concat(key, "'?");
      }
      const lowerCaseKey = key.toLowerCase();
      const isPartialMatch = lowerCaseOptionKey.startsWith(lowerCaseKey) || lowerCaseKey.startsWith(lowerCaseOptionKey);
      if (isPartialMatch) {
        bestSuggestion = bestSuggestion || "Did you mean '".concat(loader.id, ".").concat(key, "'?");
      }
    }
  }
  return bestSuggestion;
}
function normalizeOptionsInternal(loader, options, url) {
  const loaderDefaultOptions = loader.options || {};
  const mergedOptions = {
    ...loaderDefaultOptions
  };
  addUrlOptions(mergedOptions, url);
  if (mergedOptions.log === null) {
    mergedOptions.log = new NullLog();
  }
  mergeNestedFields(mergedOptions, getGlobalLoaderOptions());
  mergeNestedFields(mergedOptions, options);
  return mergedOptions;
}
function mergeNestedFields(mergedOptions, options) {
  for (const key in options) {
    if (key in options) {
      const value = options[key];
      if (isPureObject(value) && isPureObject(mergedOptions[key])) {
        mergedOptions[key] = {
          ...mergedOptions[key],
          ...options[key]
        };
      } else {
        mergedOptions[key] = options[key];
      }
    }
  }
}
function addUrlOptions(options, url) {
  if (url && !('baseUri' in options)) {
    options.baseUri = url;
  }
}
//# sourceMappingURL=option-utils.js.map