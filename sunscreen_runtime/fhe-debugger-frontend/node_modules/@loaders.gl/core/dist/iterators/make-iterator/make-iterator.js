"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.makeIterator = void 0;
const make_string_iterator_1 = require("./make-string-iterator");
const make_array_buffer_iterator_1 = require("./make-array-buffer-iterator");
const make_blob_iterator_1 = require("./make-blob-iterator");
const make_stream_iterator_1 = require("./make-stream-iterator");
const is_type_1 = require("../../javascript-utils/is-type");
/**
 * Returns an iterator that breaks its input into chunks and yields them one-by-one.
 * @param data
 * @param options
 * @returns
 * This function can e.g. be used to enable data sources that can only be read atomically
 * (such as `Blob` and `File` via `FileReader`) to still be parsed in batches.
 */
function makeIterator(data, options) {
    if (typeof data === 'string') {
        // Note: Converts string chunks to binary
        return (0, make_string_iterator_1.makeStringIterator)(data, options);
    }
    if (data instanceof ArrayBuffer) {
        return (0, make_array_buffer_iterator_1.makeArrayBufferIterator)(data, options);
    }
    if ((0, is_type_1.isBlob)(data)) {
        return (0, make_blob_iterator_1.makeBlobIterator)(data, options);
    }
    if ((0, is_type_1.isReadableStream)(data)) {
        return (0, make_stream_iterator_1.makeStreamIterator)(data, options);
    }
    if ((0, is_type_1.isResponse)(data)) {
        const response = data;
        return (0, make_stream_iterator_1.makeStreamIterator)(response.body, options);
    }
    throw new Error('makeIterator');
}
exports.makeIterator = makeIterator;
