"use strict";
// This file is derived from the Cesium code base under Apache 2 license
// See LICENSE.md and https://github.com/AnalyticalGraphicsInc/cesium/blob/master/LICENSE.md
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMagicString = exports.getStringFromTypedArray = exports.getStringFromArrayBuffer = void 0;
const loader_utils_1 = require("@loaders.gl/loader-utils");
// Decode the JSON binary array into clear text
function getStringFromArrayBuffer(arrayBuffer, byteOffset, byteLength) {
    (0, loader_utils_1.assert)(arrayBuffer instanceof ArrayBuffer);
    const textDecoder = new TextDecoder('utf8');
    const typedArray = new Uint8Array(arrayBuffer, byteOffset, byteLength);
    const string = textDecoder.decode(typedArray);
    return string;
}
exports.getStringFromArrayBuffer = getStringFromArrayBuffer;
// Decode the JSON binary array into clear text
function getStringFromTypedArray(typedArray) {
    (0, loader_utils_1.assert)(ArrayBuffer.isView(typedArray));
    const textDecoder = new TextDecoder('utf8');
    const string = textDecoder.decode(typedArray);
    return string;
}
exports.getStringFromTypedArray = getStringFromTypedArray;
function getMagicString(arrayBuffer, byteOffset = 0) {
    const dataView = new DataView(arrayBuffer);
    return `\
${String.fromCharCode(dataView.getUint8(byteOffset + 0))}\
${String.fromCharCode(dataView.getUint8(byteOffset + 1))}\
${String.fromCharCode(dataView.getUint8(byteOffset + 2))}\
${String.fromCharCode(dataView.getUint8(byteOffset + 3))}`;
}
exports.getMagicString = getMagicString;
