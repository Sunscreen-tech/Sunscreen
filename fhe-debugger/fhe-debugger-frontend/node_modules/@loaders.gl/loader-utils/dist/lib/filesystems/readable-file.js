"use strict";
// loaders.gl, MIT license
Object.defineProperty(exports, "__esModule", { value: true });
exports.makeReadableFile = void 0;
/** Helper function to create an envelope reader for a binary memory input */
function makeReadableFile(data) {
    if (data instanceof ArrayBuffer) {
        const arrayBuffer = data;
        return {
            read: async (start, length) => Buffer.from(data, start, length),
            close: async () => { },
            size: arrayBuffer.byteLength
        };
    }
    const blob = data;
    return {
        read: async (start, length) => {
            const arrayBuffer = await blob.slice(start, start + length).arrayBuffer();
            return Buffer.from(arrayBuffer);
        },
        close: async () => { },
        size: blob.size
    };
}
exports.makeReadableFile = makeReadableFile;
