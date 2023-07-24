export function toArrayBuffer(buffer) {
  if (Buffer.isBuffer(buffer)) {
    const typedArray = new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.length);
    return typedArray.slice().buffer;
  }
  return buffer;
}
export function toBuffer(binaryData) {
  if (Buffer.isBuffer(binaryData)) {
    return binaryData;
  }
  if (ArrayBuffer.isView(binaryData)) {
    binaryData = binaryData.buffer;
  }
  if (typeof Buffer !== 'undefined' && binaryData instanceof ArrayBuffer) {
    return Buffer.from(binaryData);
  }
  throw new Error('toBuffer');
}
//# sourceMappingURL=buffer.js.map