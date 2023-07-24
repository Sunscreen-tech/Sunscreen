"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const svg_utils_1 = require("./svg-utils");
const parse_to_image_1 = __importDefault(require("./parse-to-image"));
const EMPTY_OBJECT = {};
let imagebitmapOptionsSupported = true;
/**
 * Asynchronously parses an array buffer into an ImageBitmap - this contains the decoded data
 * ImageBitmaps are supported on worker threads, but not supported on Edge, IE11 and Safari
 * https://developer.mozilla.org/en-US/docs/Web/API/ImageBitmap#Browser_compatibility
 *
 * TODO - createImageBitmap supports source rect (5 param overload), pass through?
 */
async function parseToImageBitmap(arrayBuffer, options, url) {
    let blob;
    // Cannot parse SVG directly to ImageBitmap, parse to Image first
    if ((0, svg_utils_1.isSVG)(url)) {
        // Note: this only works on main thread
        const image = await (0, parse_to_image_1.default)(arrayBuffer, options, url);
        blob = image;
    }
    else {
        // Create blob from the array buffer
        blob = (0, svg_utils_1.getBlob)(arrayBuffer, url);
    }
    const imagebitmapOptions = options && options.imagebitmap;
    return await safeCreateImageBitmap(blob, imagebitmapOptions);
}
exports.default = parseToImageBitmap;
/**
 * Safely creates an imageBitmap with options
 * *
 * Firefox crashes if imagebitmapOptions is supplied
 * Avoid supplying if not provided or supported, remember if not supported
 */
async function safeCreateImageBitmap(blob, imagebitmapOptions = null) {
    if (isEmptyObject(imagebitmapOptions) || !imagebitmapOptionsSupported) {
        imagebitmapOptions = null;
    }
    if (imagebitmapOptions) {
        try {
            // @ts-ignore Options
            return await createImageBitmap(blob, imagebitmapOptions);
        }
        catch (error) {
            console.warn(error); // eslint-disable-line
            imagebitmapOptionsSupported = false;
        }
    }
    return await createImageBitmap(blob);
}
function isEmptyObject(object) {
    // @ts-ignore
    for (const key in object || EMPTY_OBJECT) {
        return false;
    }
    return true;
}
