const DEFAULT_CHUNK_SIZE = 1024 * 1024;
export async function* makeBlobIterator(blob, options) {
  const chunkSize = (options === null || options === void 0 ? void 0 : options.chunkSize) || DEFAULT_CHUNK_SIZE;
  let offset = 0;
  while (offset < blob.size) {
    const end = offset + chunkSize;
    const chunk = await blob.slice(offset, end).arrayBuffer();
    offset = end;
    yield chunk;
  }
}
//# sourceMappingURL=make-blob-iterator.js.map