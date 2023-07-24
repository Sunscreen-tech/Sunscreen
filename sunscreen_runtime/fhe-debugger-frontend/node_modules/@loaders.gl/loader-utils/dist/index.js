"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.makeWritableFile = exports.makeReadableFile = exports.stream = exports.fs = exports.path = exports.promisify2 = exports.promisify1 = exports.toArrayBuffer = exports.toBuffer = exports.isBuffer = exports.JSONLoader = exports._addAliases = exports.resolvePath = exports.getPathPrefix = exports.setPathPrefix = exports.RequestScheduler = exports.concatenateArrayBuffersAsync = exports.forEach = exports.makeNumberedLineIterator = exports.makeLineIterator = exports.makeTextDecoderIterator = exports.makeTextEncoderIterator = exports.getMagicString = exports.getFirstCharacters = exports.copyPaddedStringToDataView = exports.copyPaddedArrayBufferToDataView = exports.copyBinaryToDataView = exports.copyStringToDataView = exports.padStringToByteAlignment = exports.copyArrayBuffer = exports.copyToArray = exports.padToNBytes = exports.compareArrayBuffers = exports.concatenateTypedArrays = exports.concatenateArrayBuffers = exports.sliceArrayBuffer = exports.parseJSON = exports.canEncodeWithWorker = exports.canParseWithWorker = exports.parseWithWorker = exports.createLoaderWorker = exports.mergeLoaderOptions = exports.document = exports.global = exports.window = exports.self = exports.nodeVersion = exports.isWorker = exports.isBrowser = exports.assert = void 0;
exports._NodeFileSystem = void 0;
// GENERAL UTILS
var assert_1 = require("./lib/env-utils/assert");
Object.defineProperty(exports, "assert", { enumerable: true, get: function () { return assert_1.assert; } });
var globals_1 = require("./lib/env-utils/globals");
Object.defineProperty(exports, "isBrowser", { enumerable: true, get: function () { return globals_1.isBrowser; } });
Object.defineProperty(exports, "isWorker", { enumerable: true, get: function () { return globals_1.isWorker; } });
Object.defineProperty(exports, "nodeVersion", { enumerable: true, get: function () { return globals_1.nodeVersion; } });
Object.defineProperty(exports, "self", { enumerable: true, get: function () { return globals_1.self; } });
Object.defineProperty(exports, "window", { enumerable: true, get: function () { return globals_1.window; } });
Object.defineProperty(exports, "global", { enumerable: true, get: function () { return globals_1.global; } });
Object.defineProperty(exports, "document", { enumerable: true, get: function () { return globals_1.document; } });
var merge_loader_options_1 = require("./lib/option-utils/merge-loader-options");
Object.defineProperty(exports, "mergeLoaderOptions", { enumerable: true, get: function () { return merge_loader_options_1.mergeLoaderOptions; } });
// LOADERS.GL-SPECIFIC WORKER UTILS
var create_loader_worker_1 = require("./lib/worker-loader-utils/create-loader-worker");
Object.defineProperty(exports, "createLoaderWorker", { enumerable: true, get: function () { return create_loader_worker_1.createLoaderWorker; } });
var parse_with_worker_1 = require("./lib/worker-loader-utils/parse-with-worker");
Object.defineProperty(exports, "parseWithWorker", { enumerable: true, get: function () { return parse_with_worker_1.parseWithWorker; } });
Object.defineProperty(exports, "canParseWithWorker", { enumerable: true, get: function () { return parse_with_worker_1.canParseWithWorker; } });
var encode_with_worker_1 = require("./lib/worker-loader-utils/encode-with-worker");
Object.defineProperty(exports, "canEncodeWithWorker", { enumerable: true, get: function () { return encode_with_worker_1.canEncodeWithWorker; } });
// PARSER UTILS
var parse_json_1 = require("./lib/parser-utils/parse-json");
Object.defineProperty(exports, "parseJSON", { enumerable: true, get: function () { return parse_json_1.parseJSON; } });
// MEMORY COPY UTILS
var array_buffer_utils_1 = require("./lib/binary-utils/array-buffer-utils");
Object.defineProperty(exports, "sliceArrayBuffer", { enumerable: true, get: function () { return array_buffer_utils_1.sliceArrayBuffer; } });
Object.defineProperty(exports, "concatenateArrayBuffers", { enumerable: true, get: function () { return array_buffer_utils_1.concatenateArrayBuffers; } });
Object.defineProperty(exports, "concatenateTypedArrays", { enumerable: true, get: function () { return array_buffer_utils_1.concatenateTypedArrays; } });
Object.defineProperty(exports, "compareArrayBuffers", { enumerable: true, get: function () { return array_buffer_utils_1.compareArrayBuffers; } });
var memory_copy_utils_1 = require("./lib/binary-utils/memory-copy-utils");
Object.defineProperty(exports, "padToNBytes", { enumerable: true, get: function () { return memory_copy_utils_1.padToNBytes; } });
Object.defineProperty(exports, "copyToArray", { enumerable: true, get: function () { return memory_copy_utils_1.copyToArray; } });
Object.defineProperty(exports, "copyArrayBuffer", { enumerable: true, get: function () { return memory_copy_utils_1.copyArrayBuffer; } });
var dataview_copy_utils_1 = require("./lib/binary-utils/dataview-copy-utils");
Object.defineProperty(exports, "padStringToByteAlignment", { enumerable: true, get: function () { return dataview_copy_utils_1.padStringToByteAlignment; } });
Object.defineProperty(exports, "copyStringToDataView", { enumerable: true, get: function () { return dataview_copy_utils_1.copyStringToDataView; } });
Object.defineProperty(exports, "copyBinaryToDataView", { enumerable: true, get: function () { return dataview_copy_utils_1.copyBinaryToDataView; } });
Object.defineProperty(exports, "copyPaddedArrayBufferToDataView", { enumerable: true, get: function () { return dataview_copy_utils_1.copyPaddedArrayBufferToDataView; } });
Object.defineProperty(exports, "copyPaddedStringToDataView", { enumerable: true, get: function () { return dataview_copy_utils_1.copyPaddedStringToDataView; } });
var get_first_characters_1 = require("./lib/binary-utils/get-first-characters");
Object.defineProperty(exports, "getFirstCharacters", { enumerable: true, get: function () { return get_first_characters_1.getFirstCharacters; } });
Object.defineProperty(exports, "getMagicString", { enumerable: true, get: function () { return get_first_characters_1.getMagicString; } });
// ITERATOR UTILS
var text_iterators_1 = require("./lib/iterators/text-iterators");
Object.defineProperty(exports, "makeTextEncoderIterator", { enumerable: true, get: function () { return text_iterators_1.makeTextEncoderIterator; } });
Object.defineProperty(exports, "makeTextDecoderIterator", { enumerable: true, get: function () { return text_iterators_1.makeTextDecoderIterator; } });
Object.defineProperty(exports, "makeLineIterator", { enumerable: true, get: function () { return text_iterators_1.makeLineIterator; } });
Object.defineProperty(exports, "makeNumberedLineIterator", { enumerable: true, get: function () { return text_iterators_1.makeNumberedLineIterator; } });
var async_iteration_1 = require("./lib/iterators/async-iteration");
Object.defineProperty(exports, "forEach", { enumerable: true, get: function () { return async_iteration_1.forEach; } });
Object.defineProperty(exports, "concatenateArrayBuffersAsync", { enumerable: true, get: function () { return async_iteration_1.concatenateArrayBuffersAsync; } });
// REQUEST UTILS
var request_scheduler_1 = require("./lib/request-utils/request-scheduler");
Object.defineProperty(exports, "RequestScheduler", { enumerable: true, get: function () { return __importDefault(request_scheduler_1).default; } });
// PATH HELPERS
var file_aliases_1 = require("./lib/path-utils/file-aliases");
Object.defineProperty(exports, "setPathPrefix", { enumerable: true, get: function () { return file_aliases_1.setPathPrefix; } });
Object.defineProperty(exports, "getPathPrefix", { enumerable: true, get: function () { return file_aliases_1.getPathPrefix; } });
Object.defineProperty(exports, "resolvePath", { enumerable: true, get: function () { return file_aliases_1.resolvePath; } });
var file_aliases_2 = require("./lib/path-utils/file-aliases");
Object.defineProperty(exports, "_addAliases", { enumerable: true, get: function () { return file_aliases_2.addAliases; } });
// MICRO LOADERS
var json_loader_1 = require("./json-loader");
Object.defineProperty(exports, "JSONLoader", { enumerable: true, get: function () { return json_loader_1.JSONLoader; } });
// NODE support
// Node.js emulation (can be used in browser)
// Avoid direct use of `Buffer` which pulls in 50KB polyfill
var memory_conversion_utils_1 = require("./lib/binary-utils/memory-conversion-utils");
Object.defineProperty(exports, "isBuffer", { enumerable: true, get: function () { return memory_conversion_utils_1.isBuffer; } });
Object.defineProperty(exports, "toBuffer", { enumerable: true, get: function () { return memory_conversion_utils_1.toBuffer; } });
Object.defineProperty(exports, "toArrayBuffer", { enumerable: true, get: function () { return memory_conversion_utils_1.toArrayBuffer; } });
// Note.js wrappers (can be safely imported, but not used in browser)
// Use instead of importing 'util' to avoid node dependencies
var promisify_1 = require("./lib/node/promisify");
Object.defineProperty(exports, "promisify1", { enumerable: true, get: function () { return promisify_1.promisify1; } });
Object.defineProperty(exports, "promisify2", { enumerable: true, get: function () { return promisify_1.promisify2; } });
// `path` replacement (avoids bundling big path polyfill)
const path = __importStar(require("./lib/path-utils/path"));
exports.path = path;
// Use instead of importing 'fs' to avoid node dependencies`
const fs = __importStar(require("./lib/node/fs"));
exports.fs = fs;
// Use instead of importing 'stream' to avoid node dependencies`
const stream = __importStar(require("./lib/node/stream"));
exports.stream = stream;
var readable_file_1 = require("./lib/filesystems/readable-file");
Object.defineProperty(exports, "makeReadableFile", { enumerable: true, get: function () { return readable_file_1.makeReadableFile; } });
var writable_file_1 = require("./lib/filesystems/writable-file");
Object.defineProperty(exports, "makeWritableFile", { enumerable: true, get: function () { return writable_file_1.makeWritableFile; } });
var node_filesystem_1 = require("./lib/filesystems/node-filesystem");
Object.defineProperty(exports, "_NodeFileSystem", { enumerable: true, get: function () { return __importDefault(node_filesystem_1).default; } });
