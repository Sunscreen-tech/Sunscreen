/**
 * Iterate over async iterator, without resetting iterator if end is not reached
 * - forEach intentionally does not reset iterator if exiting loop prematurely
 *   so that iteration can continue in a second loop
 * - It is recommended to use a standard for-await as last loop to ensure
 *   iterator gets properly reset
 *
 * TODO - optimize using sync iteration if argument is an Iterable?
 *
 * @param iterator
 * @param visitor
 */
export declare function forEach(iterator: any, visitor: any): Promise<void>;
/**
 * Concatenates all data chunks yielded by an (async) iterator
 * This function can e.g. be used to enable atomic parsers to work on (async) iterator inputs
 */
export declare function concatenateArrayBuffersAsync(asyncIterator: AsyncIterable<ArrayBuffer> | Iterable<ArrayBuffer>): Promise<ArrayBuffer>;
export declare function concatenateStringsAsync(asyncIterator: AsyncIterable<string> | Iterable<string>): Promise<string>;
//# sourceMappingURL=async-iteration.d.ts.map