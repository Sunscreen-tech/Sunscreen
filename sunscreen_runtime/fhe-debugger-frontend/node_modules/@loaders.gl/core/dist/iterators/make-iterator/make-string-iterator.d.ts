import type { IteratorOptions } from './make-iterator';
/**
 * Returns an iterator that breaks a big string into chunks and yields them one-by-one as ArrayBuffers
 * @param blob string to iterate over
 * @param options
 * @param options.chunkSize
 */
export declare function makeStringIterator(string: string, options?: IteratorOptions): Iterable<ArrayBuffer>;
//# sourceMappingURL=make-string-iterator.d.ts.map