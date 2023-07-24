"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isWritableStream = exports.isReadableStream = exports.isReadableNodeStream = exports.isWritableNodeStream = exports.isReadableDOMStream = exports.isWritableDOMStream = exports.isBuffer = exports.isBlob = exports.isFile = exports.isResponse = exports.isIterator = exports.isAsyncIterable = exports.isIterable = exports.isPromise = exports.isPureObject = exports.isObject = void 0;
const isBoolean = (x) => typeof x === 'boolean';
const isFunction = (x) => typeof x === 'function';
const isObject = (x) => x !== null && typeof x === 'object';
exports.isObject = isObject;
const isPureObject = (x) => (0, exports.isObject)(x) && x.constructor === {}.constructor;
exports.isPureObject = isPureObject;
const isPromise = (x) => (0, exports.isObject)(x) && isFunction(x.then);
exports.isPromise = isPromise;
const isIterable = (x) => x && typeof x[Symbol.iterator] === 'function';
exports.isIterable = isIterable;
const isAsyncIterable = (x) => x && typeof x[Symbol.asyncIterator] === 'function';
exports.isAsyncIterable = isAsyncIterable;
const isIterator = (x) => x && isFunction(x.next);
exports.isIterator = isIterator;
const isResponse = (x) => (typeof Response !== 'undefined' && x instanceof Response) ||
    (x && x.arrayBuffer && x.text && x.json);
exports.isResponse = isResponse;
const isFile = (x) => typeof File !== 'undefined' && x instanceof File;
exports.isFile = isFile;
const isBlob = (x) => typeof Blob !== 'undefined' && x instanceof Blob;
exports.isBlob = isBlob;
/** Check for Node.js `Buffer` without triggering bundler to include buffer polyfill */
const isBuffer = (x) => x && typeof x === 'object' && x.isBuffer;
exports.isBuffer = isBuffer;
const isWritableDOMStream = (x) => (0, exports.isObject)(x) && isFunction(x.abort) && isFunction(x.getWriter);
exports.isWritableDOMStream = isWritableDOMStream;
const isReadableDOMStream = (x) => (typeof ReadableStream !== 'undefined' && x instanceof ReadableStream) ||
    ((0, exports.isObject)(x) && isFunction(x.tee) && isFunction(x.cancel) && isFunction(x.getReader));
exports.isReadableDOMStream = isReadableDOMStream;
// Not implemented in Firefox: && isFunction(x.pipeTo)
const isWritableNodeStream = (x) => (0, exports.isObject)(x) && isFunction(x.end) && isFunction(x.write) && isBoolean(x.writable);
exports.isWritableNodeStream = isWritableNodeStream;
const isReadableNodeStream = (x) => (0, exports.isObject)(x) && isFunction(x.read) && isFunction(x.pipe) && isBoolean(x.readable);
exports.isReadableNodeStream = isReadableNodeStream;
const isReadableStream = (x) => (0, exports.isReadableDOMStream)(x) || (0, exports.isReadableNodeStream)(x);
exports.isReadableStream = isReadableStream;
const isWritableStream = (x) => (0, exports.isWritableDOMStream)(x) || (0, exports.isWritableNodeStream)(x);
exports.isWritableStream = isWritableStream;
