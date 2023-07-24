/// <reference types="node" />
import type { ReadStream } from 'fs';
import type { StreamIteratorOptions } from './make-stream-iterator';
/**
 * @param [options.chunkSize]
 */
export type IteratorOptions = StreamIteratorOptions & {
    chunkSize?: number;
};
/**
 * Returns an iterator that breaks its input into chunks and yields them one-by-one.
 * @param data
 * @param options
 * @returns
 * This function can e.g. be used to enable data sources that can only be read atomically
 * (such as `Blob` and `File` via `FileReader`) to still be parsed in batches.
 */
export declare function makeIterator(data: ArrayBuffer | string | Blob | Response | ReadableStream | ReadStream, options?: IteratorOptions): AsyncIterable<ArrayBuffer> | Iterable<ArrayBuffer>;
//# sourceMappingURL=make-iterator.d.ts.map