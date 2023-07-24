"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseSync = void 0;
const loader_utils_1 = require("@loaders.gl/loader-utils");
const select_loader_1 = require("./select-loader");
const normalize_loader_1 = require("../loader-utils/normalize-loader");
const option_utils_1 = require("../loader-utils/option-utils");
const get_data_1 = require("../loader-utils/get-data");
const loader_context_1 = require("../loader-utils/loader-context");
const resource_utils_1 = require("../utils/resource-utils");
/**
 * Parses `data` synchronously using a specified loader
 * @param data
 * @param loaders
 * @param options
 * @param context
 */
function parseSync(data, loaders, options, context) {
    (0, loader_utils_1.assert)(!context || typeof context === 'object'); // parseSync no longer accepts final url
    // Signature: parseSync(data, options)
    // Uses registered loaders
    if (!Array.isArray(loaders) && !(0, normalize_loader_1.isLoaderObject)(loaders)) {
        context = undefined; // context not supported in short signature
        options = loaders;
        loaders = undefined;
    }
    options = options || {};
    // Chooses a loader (and normalizes it)
    // Also use any loaders in the context, new loaders take priority
    const typedLoaders = loaders;
    const candidateLoaders = (0, loader_context_1.getLoadersFromContext)(typedLoaders, context);
    const loader = (0, select_loader_1.selectLoaderSync)(data, candidateLoaders, options);
    // Note: if nothrow option was set, it is possible that no loader was found, if so just return null
    if (!loader) {
        return null;
    }
    // Normalize options
    options = (0, option_utils_1.normalizeOptions)(options, loader, candidateLoaders);
    // Extract a url for auto detection
    const url = (0, resource_utils_1.getResourceUrl)(data);
    const parse = () => {
        throw new Error('parseSync called parse (which is async');
    };
    context = (0, loader_context_1.getLoaderContext)({ url, parseSync, parse, loaders: loaders }, options, context || null);
    return parseWithLoaderSync(loader, data, options, context);
}
exports.parseSync = parseSync;
// TODO - should accept loader.parseSync/parse and generate 1 chunk asyncIterator
function parseWithLoaderSync(loader, data, options, context) {
    data = (0, get_data_1.getArrayBufferOrStringFromDataSync)(data, loader, options);
    if (loader.parseTextSync && typeof data === 'string') {
        return loader.parseTextSync(data, options); // , context, loader);
    }
    if (loader.parseSync && data instanceof ArrayBuffer) {
        return loader.parseSync(data, options, context); // , loader);
    }
    // TBD - If synchronous parser not available, return null
    throw new Error(`${loader.name} loader: 'parseSync' not supported by this loader, use 'parse' instead. ${context.url || ''}`);
}
