"use strict";
// loaders.gl, MIT license
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMagicString = exports.getFirstCharacters = void 0;
/**
 * Get the first characters from a binary file (interpret the first bytes as an ASCII string)
 * @param data
 * @param length
 * @returns
 */
function getFirstCharacters(data, length = 5) {
    if (typeof data === 'string') {
        return data.slice(0, length);
    }
    else if (ArrayBuffer.isView(data)) {
        // Typed Arrays can have offsets into underlying buffer
        return getMagicString(data.buffer, data.byteOffset, length);
    }
    else if (data instanceof ArrayBuffer) {
        const byteOffset = 0;
        return getMagicString(data, byteOffset, length);
    }
    return '';
}
exports.getFirstCharacters = getFirstCharacters;
/**
 * Gets a magic string from a "file"
 * Typically used to check or detect file format
 * @param arrayBuffer
 * @param byteOffset
 * @param length
 * @returns
 */
function getMagicString(arrayBuffer, byteOffset, length) {
    if (arrayBuffer.byteLength <= byteOffset + length) {
        return '';
    }
    const dataView = new DataView(arrayBuffer);
    let magic = '';
    for (let i = 0; i < length; i++) {
        magic += String.fromCharCode(dataView.getUint8(byteOffset + i));
    }
    return magic;
}
exports.getMagicString = getMagicString;
