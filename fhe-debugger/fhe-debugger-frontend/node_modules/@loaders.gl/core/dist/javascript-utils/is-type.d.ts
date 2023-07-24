/// <reference types="node" />
import type { Readable } from 'stream';
/** A DOM or Node readable stream */
export type ReadableStreamType = ReadableStream | Readable;
export declare const isObject: (x: any) => boolean;
export declare const isPureObject: (x: any) => boolean;
export declare const isPromise: (x: any) => boolean;
export declare const isIterable: (x: any) => boolean;
export declare const isAsyncIterable: (x: any) => boolean;
export declare const isIterator: (x: any) => boolean;
export declare const isResponse: (x: any) => boolean;
export declare const isFile: (x: any) => boolean;
export declare const isBlob: (x: any) => boolean;
/** Check for Node.js `Buffer` without triggering bundler to include buffer polyfill */
export declare const isBuffer: (x: any) => boolean;
export declare const isWritableDOMStream: (x: any) => boolean;
export declare const isReadableDOMStream: (x: any) => boolean;
export declare const isWritableNodeStream: (x: any) => boolean;
export declare const isReadableNodeStream: (x: any) => boolean;
export declare const isReadableStream: (x: any) => boolean;
export declare const isWritableStream: (x: any) => boolean;
//# sourceMappingURL=is-type.d.ts.map