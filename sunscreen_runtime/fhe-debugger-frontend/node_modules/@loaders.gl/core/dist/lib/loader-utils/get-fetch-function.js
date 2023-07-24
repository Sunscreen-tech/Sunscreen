"use strict";
// loaders.gl, MIT license
Object.defineProperty(exports, "__esModule", { value: true });
exports.getFetchFunction = void 0;
const is_type_1 = require("../../javascript-utils/is-type");
const fetch_file_1 = require("../fetch/fetch-file");
const option_utils_1 = require("./option-utils");
/**
 * Gets the current fetch function from options and context
 * @param options
 * @param context
 */
function getFetchFunction(options, context) {
    const globalOptions = (0, option_utils_1.getGlobalLoaderOptions)();
    const fetchOptions = options || globalOptions;
    // options.fetch can be a function
    if (typeof fetchOptions.fetch === 'function') {
        return fetchOptions.fetch;
    }
    // options.fetch can be an options object
    if ((0, is_type_1.isObject)(fetchOptions.fetch)) {
        return (url) => (0, fetch_file_1.fetchFile)(url, fetchOptions);
    }
    // else refer to context (from parent loader) if available
    if (context?.fetch) {
        return context?.fetch;
    }
    // else return the default fetch function
    return fetch_file_1.fetchFile;
}
exports.getFetchFunction = getFetchFunction;
