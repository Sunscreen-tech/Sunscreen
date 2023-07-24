export type MakeStreamOptions = {
    /** Stream allocates an arrayBuffer. Enables use of a default reader. */
    autoAllocateChunkSize?: number;
    /** Total number of chunks in queue before back pressure is applied */
    highWaterMark?: number;
};
/**
 * Builds a DOM stream from an iterator
 * This stream is currently used in browsers only,
 * but note that Web stream support is present in Node from Node 16
 * https://nodejs.org/api/webstreams.html#webstreams_web_streams_api
 */
export declare function makeStream<ArrayBuffer>(source: Iterable<ArrayBuffer> | AsyncIterable<ArrayBuffer>, options?: MakeStreamOptions): ReadableStream;
//# sourceMappingURL=make-dom-stream.d.ts.map