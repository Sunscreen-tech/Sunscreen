/// <reference types="node" />
import type { ReadableOptions } from 'stream';
import * as Stream from 'stream';
declare class _Readable {
}
type ReadableType = Stream.Readable | _Readable;
export type MakeStreamOptions = ReadableOptions;
/** Builds a node stream from an iterator */
export declare function makeStream<ArrayBuffer>(source: Iterable<ArrayBuffer> | AsyncIterable<ArrayBuffer>, options?: ReadableOptions): ReadableType;
export {};
//# sourceMappingURL=make-node-stream.d.ts.map