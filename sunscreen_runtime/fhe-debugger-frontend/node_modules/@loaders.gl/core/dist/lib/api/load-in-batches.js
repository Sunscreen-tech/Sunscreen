"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadInBatches = void 0;
const normalize_loader_1 = require("../loader-utils/normalize-loader");
const get_fetch_function_1 = require("../loader-utils/get-fetch-function");
const parse_in_batches_1 = require("./parse-in-batches");
function loadInBatches(files, loaders, options, context) {
    // Signature: load(url, options)
    if (!Array.isArray(loaders) && !(0, normalize_loader_1.isLoaderObject)(loaders)) {
        context = undefined; // context not supported in short signature
        options = loaders;
        loaders = null;
    }
    // Select fetch function
    const fetch = (0, get_fetch_function_1.getFetchFunction)(options || {});
    // Single url/file
    if (!Array.isArray(files)) {
        return loadOneFileInBatches(files, loaders, options, fetch);
    }
    // Multiple URLs / files
    const promises = files.map((file) => loadOneFileInBatches(file, loaders, options, fetch));
    // No point in waiting here for all responses before starting to stream individual streams?
    return promises;
}
exports.loadInBatches = loadInBatches;
async function loadOneFileInBatches(file, loaders, options, fetch) {
    if (typeof file === 'string') {
        const url = file;
        const response = await fetch(url);
        return await (0, parse_in_batches_1.parseInBatches)(response, loaders, options);
    }
    return await (0, parse_in_batches_1.parseInBatches)(file, loaders, options);
}
