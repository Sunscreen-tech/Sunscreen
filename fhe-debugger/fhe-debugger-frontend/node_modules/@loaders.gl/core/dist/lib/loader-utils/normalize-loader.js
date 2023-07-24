"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeLoader = exports.isLoaderObject = void 0;
const loader_utils_1 = require("@loaders.gl/loader-utils");
function isLoaderObject(loader) {
    if (!loader) {
        return false;
    }
    if (Array.isArray(loader)) {
        loader = loader[0];
    }
    const hasExtensions = Array.isArray(loader?.extensions);
    /* Now handled by types and worker loaders do not have these
    let hasParser =
      loader.parseTextSync ||
      loader.parseSync ||
      loader.parse ||
      loader.parseStream || // TODO Remove, Replace with parseInBatches
      loader.parseInBatches;
    */
    return hasExtensions;
}
exports.isLoaderObject = isLoaderObject;
function normalizeLoader(loader) {
    // This error is fairly easy to trigger by mixing up import statements etc
    // So we make an exception and add a developer error message for this case
    // To help new users from getting stuck here
    (0, loader_utils_1.assert)(loader, 'null loader');
    (0, loader_utils_1.assert)(isLoaderObject(loader), 'invalid loader');
    // NORMALIZE [LOADER, OPTIONS] => LOADER
    // If [loader, options], create a new loaders object with options merged in
    let options;
    if (Array.isArray(loader)) {
        options = loader[1];
        loader = loader[0];
        loader = {
            ...loader,
            options: { ...loader.options, ...options }
        };
    }
    // NORMALIZE text and binary flags
    // Ensure at least one of text/binary flags are properly set
    // @ts-expect-error
    if (loader?.parseTextSync || loader?.parseText) {
        loader.text = true;
    }
    if (!loader.text) {
        loader.binary = true;
    }
    return loader;
}
exports.normalizeLoader = normalizeLoader;
