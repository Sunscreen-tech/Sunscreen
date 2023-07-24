/// <reference types="node" />
import type { Readable } from 'stream';
export type StreamIteratorOptions = {
    _streamReadAhead?: boolean;
};
/**
 * Returns an async iterable that reads from a stream (works in both Node.js and browsers)
 * @param stream stream to iterator over
 */
export declare function makeStreamIterator(stream: ReadableStream | Readable, options?: StreamIteratorOptions): AsyncIterable<ArrayBuffer>;
//# sourceMappingURL=make-stream-iterator.d.ts.map