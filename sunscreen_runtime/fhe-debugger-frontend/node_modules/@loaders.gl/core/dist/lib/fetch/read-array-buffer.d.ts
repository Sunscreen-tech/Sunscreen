/**
 * Reads a chunk from a random access file
 * @param file
 * @param start
 * @param length
 * @returns
 */
export declare function readArrayBuffer(file: Blob | ArrayBuffer | string | number, start: number, length: number): Promise<ArrayBuffer>;
/**
 * Read a slice of a Blob or File, without loading the entire file into memory
 * The trick when reading File objects is to read successive "slices" of the File
 * Per spec https://w3c.github.io/FileAPI/, slicing a File only updates the start and end fields
 * Actually reading from file happens in `readAsArrayBuffer`
 * @param blob to read
 */
export declare function readBlob(blob: Blob): Promise<ArrayBuffer>;
//# sourceMappingURL=read-array-buffer.d.ts.map