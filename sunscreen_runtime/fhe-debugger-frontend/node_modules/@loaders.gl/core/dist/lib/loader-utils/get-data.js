"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getReadableStream = exports.getAsyncIterableFromData = exports.getArrayBufferOrStringFromData = exports.getArrayBufferOrStringFromDataSync = void 0;
const loader_utils_1 = require("@loaders.gl/loader-utils");
const is_type_1 = require("../../javascript-utils/is-type");
const make_iterator_1 = require("../../iterators/make-iterator/make-iterator");
const response_utils_1 = require("../utils/response-utils");
const ERR_DATA = 'Cannot convert supplied data type';
// eslint-disable-next-line complexity
function getArrayBufferOrStringFromDataSync(data, loader, options) {
    if (loader.text && typeof data === 'string') {
        return data;
    }
    if ((0, is_type_1.isBuffer)(data)) {
        // @ts-ignore
        data = data.buffer;
    }
    if (data instanceof ArrayBuffer) {
        const arrayBuffer = data;
        if (loader.text && !loader.binary) {
            const textDecoder = new TextDecoder('utf8');
            return textDecoder.decode(arrayBuffer);
        }
        return arrayBuffer;
    }
    // We may need to handle offsets
    if (ArrayBuffer.isView(data)) {
        // TextDecoder is invoked on typed arrays and will handle offsets
        if (loader.text && !loader.binary) {
            const textDecoder = new TextDecoder('utf8');
            return textDecoder.decode(data);
        }
        let arrayBuffer = data.buffer;
        // Since we are returning the underlying arrayBuffer, we must create a new copy
        // if this typed array / Buffer is a partial view into the ArryayBuffer
        // TODO - this is a potentially unnecessary copy
        const byteLength = data.byteLength || data.length;
        if (data.byteOffset !== 0 || byteLength !== arrayBuffer.byteLength) {
            // console.warn(`loaders.gl copying arraybuffer of length ${byteLength}`);
            arrayBuffer = arrayBuffer.slice(data.byteOffset, data.byteOffset + byteLength);
        }
        return arrayBuffer;
    }
    throw new Error(ERR_DATA);
}
exports.getArrayBufferOrStringFromDataSync = getArrayBufferOrStringFromDataSync;
// Convert async iterator to a promise
async function getArrayBufferOrStringFromData(data, loader, options) {
    const isArrayBuffer = data instanceof ArrayBuffer || ArrayBuffer.isView(data);
    if (typeof data === 'string' || isArrayBuffer) {
        return getArrayBufferOrStringFromDataSync(data, loader, options);
    }
    // Blobs and files are FileReader compatible
    if ((0, is_type_1.isBlob)(data)) {
        data = await (0, response_utils_1.makeResponse)(data);
    }
    if ((0, is_type_1.isResponse)(data)) {
        const response = data;
        await (0, response_utils_1.checkResponse)(response);
        return loader.binary ? await response.arrayBuffer() : await response.text();
    }
    if ((0, is_type_1.isReadableStream)(data)) {
        // @ts-expect-error TS2559 options type
        data = (0, make_iterator_1.makeIterator)(data, options);
    }
    if ((0, is_type_1.isIterable)(data) || (0, is_type_1.isAsyncIterable)(data)) {
        // Assume arrayBuffer iterator - attempt to concatenate
        return (0, loader_utils_1.concatenateArrayBuffersAsync)(data);
    }
    throw new Error(ERR_DATA);
}
exports.getArrayBufferOrStringFromData = getArrayBufferOrStringFromData;
async function getAsyncIterableFromData(data, options) {
    if ((0, is_type_1.isIterator)(data)) {
        return data;
    }
    if ((0, is_type_1.isResponse)(data)) {
        const response = data;
        // Note Since this function is not async, we currently can't load error message, just status
        await (0, response_utils_1.checkResponse)(response);
        // TODO - bug in polyfill, body can be a Promise under Node.js
        // eslint-disable-next-line @typescript-eslint/await-thenable
        const body = await response.body;
        // TODO - body can be null?
        return (0, make_iterator_1.makeIterator)(body, options);
    }
    if ((0, is_type_1.isBlob)(data) || (0, is_type_1.isReadableStream)(data)) {
        return (0, make_iterator_1.makeIterator)(data, options);
    }
    if ((0, is_type_1.isAsyncIterable)(data)) {
        return data[Symbol.asyncIterator]();
    }
    return getIterableFromData(data);
}
exports.getAsyncIterableFromData = getAsyncIterableFromData;
async function getReadableStream(data) {
    if ((0, is_type_1.isReadableStream)(data)) {
        return data;
    }
    if ((0, is_type_1.isResponse)(data)) {
        // @ts-ignore
        return data.body;
    }
    const response = await (0, response_utils_1.makeResponse)(data);
    // @ts-ignore
    return response.body;
}
exports.getReadableStream = getReadableStream;
// HELPERS
function getIterableFromData(data) {
    // generate an iterator that emits a single chunk
    if (ArrayBuffer.isView(data)) {
        return (function* oneChunk() {
            yield data.buffer;
        })();
    }
    if (data instanceof ArrayBuffer) {
        return (function* oneChunk() {
            yield data;
        })();
    }
    if ((0, is_type_1.isIterator)(data)) {
        return data;
    }
    if ((0, is_type_1.isIterable)(data)) {
        return data[Symbol.iterator]();
    }
    throw new Error(ERR_DATA);
}
