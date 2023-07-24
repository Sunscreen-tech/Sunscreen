"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDefaultImageType = exports.isImageTypeSupported = void 0;
const loader_utils_1 = require("@loaders.gl/loader-utils");
// @ts-ignore TS2339: Property does not exist on type
const { _parseImageNode } = globalThis;
const IMAGE_SUPPORTED = typeof Image !== 'undefined'; // NOTE: "false" positives if jsdom is installed
const IMAGE_BITMAP_SUPPORTED = typeof ImageBitmap !== 'undefined';
const NODE_IMAGE_SUPPORTED = Boolean(_parseImageNode);
const DATA_SUPPORTED = loader_utils_1.isBrowser ? true : NODE_IMAGE_SUPPORTED;
/**
 * Checks if a loaders.gl image type is supported
 * @param type image type string
 */
function isImageTypeSupported(type) {
    switch (type) {
        case 'auto':
            // Should only ever be false in Node.js, if polyfills have not been installed...
            return IMAGE_BITMAP_SUPPORTED || IMAGE_SUPPORTED || DATA_SUPPORTED;
        case 'imagebitmap':
            return IMAGE_BITMAP_SUPPORTED;
        case 'image':
            return IMAGE_SUPPORTED;
        case 'data':
            return DATA_SUPPORTED;
        default:
            throw new Error(`@loaders.gl/images: image ${type} not supported in this environment`);
    }
}
exports.isImageTypeSupported = isImageTypeSupported;
/**
 * Returns the "most performant" supported image type on this platform
 * @returns image type string
 */
function getDefaultImageType() {
    if (IMAGE_BITMAP_SUPPORTED) {
        return 'imagebitmap';
    }
    if (IMAGE_SUPPORTED) {
        return 'image';
    }
    if (DATA_SUPPORTED) {
        return 'data';
    }
    // This should only happen in Node.js
    throw new Error('Install \'@loaders.gl/polyfills\' to parse images under Node.js');
}
exports.getDefaultImageType = getDefaultImageType;
