const DEFAULT_CHUNK_SIZE = 256 * 1024;
export function makeArrayBufferIterator(arrayBuffer) {
  let options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
  return function* () {
    const {
      chunkSize = DEFAULT_CHUNK_SIZE
    } = options;
    let byteOffset = 0;
    while (byteOffset < arrayBuffer.byteLength) {
      const chunkByteLength = Math.min(arrayBuffer.byteLength - byteOffset, chunkSize);
      const chunk = new ArrayBuffer(chunkByteLength);
      const sourceArray = new Uint8Array(arrayBuffer, byteOffset, chunkByteLength);
      const chunkArray = new Uint8Array(chunk);
      chunkArray.set(sourceArray);
      byteOffset += chunkByteLength;
      yield chunk;
    }
  }();
}
//# sourceMappingURL=make-array-buffer-iterator.js.map