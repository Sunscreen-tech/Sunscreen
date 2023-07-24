"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.readFileSync = void 0;
// File read
const loader_utils_1 = require("@loaders.gl/loader-utils");
const loader_utils_2 = require("@loaders.gl/loader-utils");
// TODO - this is not tested
// const isDataURL = (url) => url.startsWith('data:');
/**
 * In a few cases (data URIs, node.js) "files" can be read synchronously
 */
function readFileSync(url, options = {}) {
    url = (0, loader_utils_1.resolvePath)(url);
    // Only support this if we can also support sync data URL decoding in browser
    // if (isDataURL(url)) {
    //   return decodeDataUri(url);
    // }
    if (!loader_utils_1.isBrowser) {
        const buffer = loader_utils_1.fs.readFileSync(url, options);
        return typeof buffer !== 'string' ? (0, loader_utils_1.toArrayBuffer)(buffer) : buffer;
    }
    // @ts-ignore
    if (!options.nothrow) {
        // throw new Error('Cant load URI synchronously');
        (0, loader_utils_2.assert)(false);
    }
    return null;
}
exports.readFileSync = readFileSync;
