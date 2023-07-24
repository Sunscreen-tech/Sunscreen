import { assert } from '../env-utils/assert';
export function padToNBytes(byteLength, padding) {
  assert(byteLength >= 0);
  assert(padding > 0);
  return byteLength + (padding - 1) & ~(padding - 1);
}
export function copyArrayBuffer(targetBuffer, sourceBuffer, byteOffset) {
  let byteLength = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : sourceBuffer.byteLength;
  const targetArray = new Uint8Array(targetBuffer, byteOffset, byteLength);
  const sourceArray = new Uint8Array(sourceBuffer);
  targetArray.set(sourceArray);
  return targetBuffer;
}
export function copyToArray(source, target, targetOffset) {
  let sourceArray;
  if (source instanceof ArrayBuffer) {
    sourceArray = new Uint8Array(source);
  } else {
    const srcByteOffset = source.byteOffset;
    const srcByteLength = source.byteLength;
    sourceArray = new Uint8Array(source.buffer || source.arrayBuffer, srcByteOffset, srcByteLength);
  }
  target.set(sourceArray, targetOffset);
  return targetOffset + padToNBytes(sourceArray.byteLength, 4);
}
//# sourceMappingURL=memory-copy-utils.js.map