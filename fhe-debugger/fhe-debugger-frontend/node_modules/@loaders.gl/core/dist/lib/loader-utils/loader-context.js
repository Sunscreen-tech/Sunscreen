"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLoadersFromContext = exports.getLoaderContext = void 0;
const get_fetch_function_1 = require("./get-fetch-function");
const url_utils_1 = require("../utils/url-utils");
const loader_utils_1 = require("@loaders.gl/loader-utils");
/**
 * "sub" loaders invoked by other loaders get a "context" injected on `this`
 * The context will inject core methods like `parse` and contain information
 * about loaders and options passed in to the top-level `parse` call.
 *
 * @param context
 * @param options
 * @param previousContext
 */
function getLoaderContext(context, options, parentContext) {
    // For recursive calls, we already have a context
    // TODO - add any additional loaders to context?
    if (parentContext) {
        return parentContext;
    }
    const newContext = {
        fetch: (0, get_fetch_function_1.getFetchFunction)(options, context),
        ...context
    };
    // Parse URLs so that subloaders can easily generate correct strings
    if (newContext.url) {
        const baseUrl = (0, url_utils_1.stripQueryString)(newContext.url);
        newContext.baseUrl = baseUrl;
        newContext.queryString = (0, url_utils_1.extractQueryString)(newContext.url);
        newContext.filename = loader_utils_1.path.filename(baseUrl);
        newContext.baseUrl = loader_utils_1.path.dirname(baseUrl);
    }
    // Recursive loading does not use single loader
    if (!Array.isArray(newContext.loaders)) {
        newContext.loaders = null;
    }
    return newContext;
}
exports.getLoaderContext = getLoaderContext;
// eslint-disable-next-line complexity
function getLoadersFromContext(loaders, context) {
    // A single non-array loader is force selected, but only on top-level (context === null)
    if (!context && loaders && !Array.isArray(loaders)) {
        return loaders;
    }
    // Create a merged list
    let candidateLoaders;
    if (loaders) {
        candidateLoaders = Array.isArray(loaders) ? loaders : [loaders];
    }
    if (context && context.loaders) {
        const contextLoaders = Array.isArray(context.loaders) ? context.loaders : [context.loaders];
        candidateLoaders = candidateLoaders ? [...candidateLoaders, ...contextLoaders] : contextLoaders;
    }
    // If no loaders, return null to look in globally registered loaders
    return candidateLoaders && candidateLoaders.length ? candidateLoaders : null;
}
exports.getLoadersFromContext = getLoadersFromContext;
