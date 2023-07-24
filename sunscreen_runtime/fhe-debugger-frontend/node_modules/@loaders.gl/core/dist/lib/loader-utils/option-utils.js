"use strict";
// loaders.gl, MIT license
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeOptions = exports.setGlobalOptions = exports.getGlobalLoaderOptions = exports.getGlobalLoaderState = void 0;
const is_type_1 = require("../../javascript-utils/is-type");
const loggers_1 = require("./loggers");
const option_defaults_1 = require("./option-defaults");
/**
 * Helper for safely accessing global loaders.gl variables
 * Wraps initialization of global variable in function to defeat overly aggressive tree-shakers
 */
function getGlobalLoaderState() {
    // @ts-ignore
    globalThis.loaders = globalThis.loaders || {};
    // @ts-ignore
    const { loaders } = globalThis;
    // Add _state object to keep separate from modules added to globalThis.loaders
    loaders._state = loaders._state || {};
    return loaders._state;
}
exports.getGlobalLoaderState = getGlobalLoaderState;
/**
 * Store global loader options on the global object to increase chances of cross loaders-version interoperability
 * NOTE: This use case is not reliable but can help when testing new versions of loaders.gl with existing frameworks
 * @returns global loader options merged with default loader options
 */
const getGlobalLoaderOptions = () => {
    const state = getGlobalLoaderState();
    // Ensure all default loader options from this library are mentioned
    state.globalOptions = state.globalOptions || { ...option_defaults_1.DEFAULT_LOADER_OPTIONS };
    return state.globalOptions;
};
exports.getGlobalLoaderOptions = getGlobalLoaderOptions;
/**
 * Set global loader options
 * @param options
 */
function setGlobalOptions(options) {
    const state = getGlobalLoaderState();
    const globalOptions = (0, exports.getGlobalLoaderOptions)();
    state.globalOptions = normalizeOptionsInternal(globalOptions, options);
}
exports.setGlobalOptions = setGlobalOptions;
/**
 * Merges options with global opts and loader defaults, also injects baseUri
 * @param options
 * @param loader
 * @param loaders
 * @param url
 */
function normalizeOptions(options, loader, loaders, url) {
    loaders = loaders || [];
    loaders = Array.isArray(loaders) ? loaders : [loaders];
    validateOptions(options, loaders);
    return normalizeOptionsInternal(loader, options, url);
}
exports.normalizeOptions = normalizeOptions;
// VALIDATE OPTIONS
/**
 * Warn for unsupported options
 * @param options
 * @param loaders
 */
function validateOptions(options, loaders) {
    // Check top level options
    validateOptionsObject(options, null, option_defaults_1.DEFAULT_LOADER_OPTIONS, option_defaults_1.REMOVED_LOADER_OPTIONS, loaders);
    for (const loader of loaders) {
        // Get the scoped, loader specific options from the user supplied options
        const idOptions = (options && options[loader.id]) || {};
        // Get scoped, loader specific default and deprecated options from the selected loader
        const loaderOptions = (loader.options && loader.options[loader.id]) || {};
        const deprecatedOptions = (loader.deprecatedOptions && loader.deprecatedOptions[loader.id]) || {};
        // Validate loader specific options
        validateOptionsObject(idOptions, loader.id, loaderOptions, deprecatedOptions, loaders);
    }
}
// eslint-disable-next-line max-params, complexity
function validateOptionsObject(options, id, defaultOptions, deprecatedOptions, loaders) {
    const loaderName = id || 'Top level';
    const prefix = id ? `${id}.` : '';
    for (const key in options) {
        // If top level option value is an object it could options for a loader, so ignore
        const isSubOptions = !id && (0, is_type_1.isObject)(options[key]);
        const isBaseUriOption = key === 'baseUri' && !id;
        const isWorkerUrlOption = key === 'workerUrl' && id;
        // <loader>.workerUrl requires special handling as it is now auto-generated and no longer specified as a default option.
        if (!(key in defaultOptions) && !isBaseUriOption && !isWorkerUrlOption) {
            // Issue deprecation warnings
            if (key in deprecatedOptions) {
                loggers_1.probeLog.warn(`${loaderName} loader option \'${prefix}${key}\' no longer supported, use \'${deprecatedOptions[key]}\'`)();
            }
            else if (!isSubOptions) {
                const suggestion = findSimilarOption(key, loaders);
                loggers_1.probeLog.warn(`${loaderName} loader option \'${prefix}${key}\' not recognized. ${suggestion}`)();
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
                return `Did you mean \'${loader.id}.${key}\'?`;
            }
            const lowerCaseKey = key.toLowerCase();
            const isPartialMatch = lowerCaseOptionKey.startsWith(lowerCaseKey) || lowerCaseKey.startsWith(lowerCaseOptionKey);
            if (isPartialMatch) {
                bestSuggestion = bestSuggestion || `Did you mean \'${loader.id}.${key}\'?`;
            }
        }
    }
    return bestSuggestion;
}
function normalizeOptionsInternal(loader, options, url) {
    const loaderDefaultOptions = loader.options || {};
    const mergedOptions = { ...loaderDefaultOptions };
    addUrlOptions(mergedOptions, url);
    // LOGGING: options.log can be set to `null` to defeat logging
    if (mergedOptions.log === null) {
        mergedOptions.log = new loggers_1.NullLog();
    }
    mergeNestedFields(mergedOptions, (0, exports.getGlobalLoaderOptions)());
    mergeNestedFields(mergedOptions, options);
    return mergedOptions;
}
// Merge nested options objects
function mergeNestedFields(mergedOptions, options) {
    for (const key in options) {
        // Check for nested options
        // object in options => either no key in defaultOptions or object in defaultOptions
        if (key in options) {
            const value = options[key];
            if ((0, is_type_1.isPureObject)(value) && (0, is_type_1.isPureObject)(mergedOptions[key])) {
                mergedOptions[key] = {
                    ...mergedOptions[key],
                    ...options[key]
                };
            }
            else {
                mergedOptions[key] = options[key];
            }
        }
        // else: No need to merge nested opts, and the initial merge already copied over the nested options
    }
}
/**
 * Harvest information from the url
 * @deprecated This is mainly there to support a hack in the GLTFLoader
 * TODO - baseUri should be a directory, i.e. remove file component from baseUri
 * TODO - extract extension?
 * TODO - extract query parameters?
 * TODO - should these be injected on context instead of options?
 */
function addUrlOptions(options, url) {
    if (url && !('baseUri' in options)) {
        options.baseUri = url;
    }
}
