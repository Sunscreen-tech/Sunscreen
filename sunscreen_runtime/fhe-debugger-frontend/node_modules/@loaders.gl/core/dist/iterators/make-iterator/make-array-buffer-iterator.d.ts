import type { IteratorOptions } from './make-iterator';
/**
 * Returns an iterator that breaks a big ArrayBuffer into chunks and yields them one-by-one
 * @param blob ArrayBuffer to iterate over
 * @param options
 * @param options.chunkSize
 */
export declare function makeArrayBufferIterator(arrayBuffer: ArrayBuffer, options?: IteratorOptions): Iterable<ArrayBuffer>;
//# sourceMappingURL=make-array-buffer-iterator.d.ts.map