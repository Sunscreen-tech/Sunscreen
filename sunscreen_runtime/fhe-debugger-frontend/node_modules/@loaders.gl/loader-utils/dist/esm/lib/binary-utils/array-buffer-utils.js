export function compareArrayBuffers(arrayBuffer1, arrayBuffer2, byteLength) {
  byteLength = byteLength || arrayBuffer1.byteLength;
  if (arrayBuffer1.byteLength < byteLength || arrayBuffer2.byteLength < byteLength) {
    return false;
  }
  const array1 = new Uint8Array(arrayBuffer1);
  const array2 = new Uint8Array(arrayBuffer2);
  for (let i = 0; i < array1.length; ++i) {
    if (array1[i] !== array2[i]) {
      return false;
    }
  }
  return true;
}
export function concatenateArrayBuffers() {
  for (var _len = arguments.length, sources = new Array(_len), _key = 0; _key < _len; _key++) {
    sources[_key] = arguments[_key];
  }
  const sourceArrays = sources.map(source2 => source2 instanceof ArrayBuffer ? new Uint8Array(source2) : source2);
  const byteLength = sourceArrays.reduce((length, typedArray) => length + typedArray.byteLength, 0);
  const result = new Uint8Array(byteLength);
  let offset = 0;
  for (const sourceArray of sourceArrays) {
    result.set(sourceArray, offset);
    offset += sourceArray.byteLength;
  }
  return result.buffer;
}
export function concatenateTypedArrays() {
  for (var _len2 = arguments.length, typedArrays = new Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
    typedArrays[_key2] = arguments[_key2];
  }
  const arrays = typedArrays;
  const TypedArrayConstructor = arrays && arrays.length > 1 && arrays[0].constructor || null;
  if (!TypedArrayConstructor) {
    throw new Error('"concatenateTypedArrays" - incorrect quantity of arguments or arguments have incompatible data types');
  }
  const sumLength = arrays.reduce((acc, value) => acc + value.length, 0);
  const result = new TypedArrayConstructor(sumLength);
  let offset = 0;
  for (const array of arrays) {
    result.set(array, offset);
    offset += array.length;
  }
  return result;
}
export function sliceArrayBuffer(arrayBuffer, byteOffset, byteLength) {
  const subArray = byteLength !== undefined ? new Uint8Array(arrayBuffer).subarray(byteOffset, byteOffset + byteLength) : new Uint8Array(arrayBuffer).subarray(byteOffset);
  const arrayCopy = new Uint8Array(subArray);
  return arrayCopy.buffer;
}
//# sourceMappingURL=array-buffer-utils.js.map