"use strict";
// Random-Access read
Object.defineProperty(exports, "__esModule", { value: true });
exports.readArrayBuffer = void 0;
async function readArrayBuffer(file, start, length) {
    if (file instanceof Blob) {
        const slice = file.slice(start, start + length);
        return await slice.arrayBuffer();
    }
    return await file.read(start, start + length);
}
exports.readArrayBuffer = readArrayBuffer;
/**
 * Read a slice of a Blob or File, without loading the entire file into memory
 * The trick when reading File objects is to read successive "slices" of the File
 * Per spec https://w3c.github.io/FileAPI/, slicing a File only updates the start and end fields
 * Actually reading from file happens in `readAsArrayBuffer`
 * @param blob to read
 export async function readBlob(blob: Blob): Promise<ArrayBuffer> {
  return await new Promise((resolve, reject) => {
    const fileReader = new FileReader();
    fileReader.onload = (event: ProgressEvent<FileReader>) =>
      resolve(event?.target?.result as ArrayBuffer);
    // TODO - reject with a proper Error
    fileReader.onerror = (error: ProgressEvent<FileReader>) => reject(error);
    fileReader.readAsArrayBuffer(blob);
  });
}
*/
