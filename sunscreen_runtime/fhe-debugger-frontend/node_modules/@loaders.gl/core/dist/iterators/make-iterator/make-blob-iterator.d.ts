import type { IteratorOptions } from './make-iterator';
/**
 * Returns an iterator that breaks a big Blob into chunks and yields them one-by-one
 * @param blob Blob or File object
 * @param options
 * @param options.chunkSize
 */
export declare function makeBlobIterator(blob: Blob, options?: IteratorOptions): AsyncIterable<ArrayBuffer>;
//# sourceMappingURL=make-blob-iterator.d.ts.map