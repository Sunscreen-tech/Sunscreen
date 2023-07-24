/**
 * compare two binary arrays for equality
 * @param a
 * @param b
 * @param byteLength
 */
export declare function compareArrayBuffers(arrayBuffer1: ArrayBuffer, arrayBuffer2: ArrayBuffer, byteLength?: number): boolean;
/**
 * Concatenate a sequence of ArrayBuffers
 * @return A concatenated ArrayBuffer
 */
export declare function concatenateArrayBuffers(...sources: (ArrayBuffer | Uint8Array)[]): ArrayBuffer;
/**
 * Concatenate arbitrary count of typed arrays
 * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Typed_arrays
 * @param - list of arrays. All arrays should be the same type
 * @return A concatenated TypedArray
 */
export declare function concatenateTypedArrays<T>(...typedArrays: T[]): T;
/**
 * Copy a view of an ArrayBuffer into new ArrayBuffer with byteOffset = 0
 * @param arrayBuffer
 * @param byteOffset
 * @param byteLength
 */
export declare function sliceArrayBuffer(arrayBuffer: ArrayBuffer, byteOffset: number, byteLength?: number): ArrayBuffer;
//# sourceMappingURL=array-buffer-utils.d.ts.map