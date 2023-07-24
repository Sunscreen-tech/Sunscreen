"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.readBlob = exports.readArrayBuffer = void 0;
//
const loader_utils_1 = require("@loaders.gl/loader-utils");
/**
 * Reads a chunk from a random access file
 * @param file
 * @param start
 * @param length
 * @returns
 */
async function readArrayBuffer(file, start, length) {
    if (typeof file === 'number') {
        return await loader_utils_1.fs._readToArrayBuffer(file, start, length);
    }
    // TODO - we can do better for ArrayBuffer and string
    if (!(file instanceof Blob)) {
        file = new Blob([file]);
    }
    const slice = file.slice(start, start + length);
    return await readBlob(slice);
}
exports.readArrayBuffer = readArrayBuffer;
/**
 * Read a slice of a Blob or File, without loading the entire file into memory
 * The trick when reading File objects is to read successive "slices" of the File
 * Per spec https://w3c.github.io/FileAPI/, slicing a File only updates the start and end fields
 * Actually reading from file happens in `readAsArrayBuffer`
 * @param blob to read
 */
async function readBlob(blob) {
    return await new Promise((resolve, reject) => {
        const fileReader = new FileReader();
        fileReader.onload = (event) => resolve(event?.target?.result);
        // TODO - reject with a proper Error
        fileReader.onerror = (error) => reject(error);
        fileReader.readAsArrayBuffer(blob);
    });
}
exports.readBlob = readBlob;
