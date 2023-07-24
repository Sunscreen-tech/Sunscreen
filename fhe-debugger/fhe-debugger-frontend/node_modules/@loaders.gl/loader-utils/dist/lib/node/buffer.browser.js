"use strict";
// loaders.gl, MIT license
Object.defineProperty(exports, "__esModule", { value: true });
exports.toBuffer = exports.toArrayBuffer = void 0;
// Isolates Buffer references to ensure they are only bundled under Node.js (avoids big webpack polyfill)
// this file is selected by the package.json "browser" field).
/**
 * Convert Buffer to ArrayBuffer
 * Converts Node.js `Buffer` to `ArrayBuffer` (without triggering bundler to include Buffer polyfill on browser)
 * @todo better data type
 */
function toArrayBuffer(buffer) {
    return buffer;
}
exports.toArrayBuffer = toArrayBuffer;
/**
 * Convert (copy) ArrayBuffer to Buffer
 */
function toBuffer(binaryData) {
    throw new Error('Buffer not supported in browser');
}
exports.toBuffer = toBuffer;
