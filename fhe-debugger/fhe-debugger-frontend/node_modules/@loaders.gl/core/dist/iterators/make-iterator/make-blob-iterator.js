"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.makeBlobIterator = void 0;
const DEFAULT_CHUNK_SIZE = 1024 * 1024; // 1MB — biggest value that keeps UI responsive
/**
 * Returns an iterator that breaks a big Blob into chunks and yields them one-by-one
 * @param blob Blob or File object
 * @param options
 * @param options.chunkSize
 */
async function* makeBlobIterator(blob, options) {
    const chunkSize = options?.chunkSize || DEFAULT_CHUNK_SIZE;
    let offset = 0;
    while (offset < blob.size) {
        const end = offset + chunkSize;
        const chunk = await blob.slice(offset, end).arrayBuffer();
        offset = end;
        yield chunk;
    }
}
exports.makeBlobIterator = makeBlobIterator;
