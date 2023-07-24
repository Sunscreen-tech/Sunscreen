"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadCrunchModule = void 0;
// @ts-nocheck
const worker_utils_1 = require("@loaders.gl/worker-utils");
/**
 * Load crunch decoder module
 * @param options - loader options
 * @returns Promise of module object
 */
async function loadCrunchModule(options) {
    const modules = options.modules || {};
    if (modules.crunch) {
        return modules.crunch;
    }
    return loadCrunch(options);
}
exports.loadCrunchModule = loadCrunchModule;
let crunchModule;
/**
 * Load crunch decoder module
 * @param {any} options - Loader options
 * @returns {Promise<any>} Promise of Module object
 */
async function loadCrunch(options) {
    if (crunchModule) {
        return crunchModule;
    }
    let loadCrunchDecoder = await (0, worker_utils_1.loadLibrary)('crunch.js', 'textures', options);
    // Depends on how import happened...
    // @ts-ignore TS2339: Property does not exist on type
    loadCrunchDecoder = loadCrunchDecoder || globalThis.LoadCrunchDecoder;
    crunchModule = loadCrunchDecoder();
    return crunchModule;
}
