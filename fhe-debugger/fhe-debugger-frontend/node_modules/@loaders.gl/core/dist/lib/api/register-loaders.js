"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports._unregisterLoaders = exports.getRegisteredLoaders = exports.registerLoaders = void 0;
const normalize_loader_1 = require("../loader-utils/normalize-loader");
const option_utils_1 = require("../loader-utils/option-utils");
// Store global registered loaders on the global object to increase chances of cross loaders-version interoperability
// This use case is not reliable but can help when testing new versions of loaders.gl with existing frameworks
const getGlobalLoaderRegistry = () => {
    const state = (0, option_utils_1.getGlobalLoaderState)();
    state.loaderRegistry = state.loaderRegistry || [];
    return state.loaderRegistry;
};
/** Register a list of global loaders */
function registerLoaders(loaders) {
    const loaderRegistry = getGlobalLoaderRegistry();
    loaders = Array.isArray(loaders) ? loaders : [loaders];
    for (const loader of loaders) {
        const normalizedLoader = (0, normalize_loader_1.normalizeLoader)(loader);
        if (!loaderRegistry.find((registeredLoader) => normalizedLoader === registeredLoader)) {
            // add to the beginning of the loaderRegistry, so the last registeredLoader get picked
            loaderRegistry.unshift(normalizedLoader);
        }
    }
}
exports.registerLoaders = registerLoaders;
function getRegisteredLoaders() {
    return getGlobalLoaderRegistry();
}
exports.getRegisteredLoaders = getRegisteredLoaders;
/** @deprecated For testing only  */
function _unregisterLoaders() {
    const state = (0, option_utils_1.getGlobalLoaderState)();
    state.loaderRegistry = [];
}
exports._unregisterLoaders = _unregisterLoaders;
