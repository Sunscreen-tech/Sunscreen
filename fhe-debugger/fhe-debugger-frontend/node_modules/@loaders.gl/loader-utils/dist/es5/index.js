"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
var _typeof = require("@babel/runtime/helpers/typeof");
Object.defineProperty(exports, "__esModule", {
  value: true
});
Object.defineProperty(exports, "JSONLoader", {
  enumerable: true,
  get: function get() {
    return _jsonLoader.JSONLoader;
  }
});
Object.defineProperty(exports, "RequestScheduler", {
  enumerable: true,
  get: function get() {
    return _requestScheduler.default;
  }
});
Object.defineProperty(exports, "_NodeFileSystem", {
  enumerable: true,
  get: function get() {
    return _nodeFilesystem.default;
  }
});
Object.defineProperty(exports, "_addAliases", {
  enumerable: true,
  get: function get() {
    return _fileAliases.addAliases;
  }
});
Object.defineProperty(exports, "assert", {
  enumerable: true,
  get: function get() {
    return _assert.assert;
  }
});
Object.defineProperty(exports, "canEncodeWithWorker", {
  enumerable: true,
  get: function get() {
    return _encodeWithWorker.canEncodeWithWorker;
  }
});
Object.defineProperty(exports, "canParseWithWorker", {
  enumerable: true,
  get: function get() {
    return _parseWithWorker.canParseWithWorker;
  }
});
Object.defineProperty(exports, "compareArrayBuffers", {
  enumerable: true,
  get: function get() {
    return _arrayBufferUtils.compareArrayBuffers;
  }
});
Object.defineProperty(exports, "concatenateArrayBuffers", {
  enumerable: true,
  get: function get() {
    return _arrayBufferUtils.concatenateArrayBuffers;
  }
});
Object.defineProperty(exports, "concatenateArrayBuffersAsync", {
  enumerable: true,
  get: function get() {
    return _asyncIteration.concatenateArrayBuffersAsync;
  }
});
Object.defineProperty(exports, "concatenateTypedArrays", {
  enumerable: true,
  get: function get() {
    return _arrayBufferUtils.concatenateTypedArrays;
  }
});
Object.defineProperty(exports, "copyArrayBuffer", {
  enumerable: true,
  get: function get() {
    return _memoryCopyUtils.copyArrayBuffer;
  }
});
Object.defineProperty(exports, "copyBinaryToDataView", {
  enumerable: true,
  get: function get() {
    return _dataviewCopyUtils.copyBinaryToDataView;
  }
});
Object.defineProperty(exports, "copyPaddedArrayBufferToDataView", {
  enumerable: true,
  get: function get() {
    return _dataviewCopyUtils.copyPaddedArrayBufferToDataView;
  }
});
Object.defineProperty(exports, "copyPaddedStringToDataView", {
  enumerable: true,
  get: function get() {
    return _dataviewCopyUtils.copyPaddedStringToDataView;
  }
});
Object.defineProperty(exports, "copyStringToDataView", {
  enumerable: true,
  get: function get() {
    return _dataviewCopyUtils.copyStringToDataView;
  }
});
Object.defineProperty(exports, "copyToArray", {
  enumerable: true,
  get: function get() {
    return _memoryCopyUtils.copyToArray;
  }
});
Object.defineProperty(exports, "createLoaderWorker", {
  enumerable: true,
  get: function get() {
    return _createLoaderWorker.createLoaderWorker;
  }
});
Object.defineProperty(exports, "document", {
  enumerable: true,
  get: function get() {
    return _globals.document;
  }
});
Object.defineProperty(exports, "forEach", {
  enumerable: true,
  get: function get() {
    return _asyncIteration.forEach;
  }
});
exports.fs = void 0;
Object.defineProperty(exports, "getFirstCharacters", {
  enumerable: true,
  get: function get() {
    return _getFirstCharacters.getFirstCharacters;
  }
});
Object.defineProperty(exports, "getMagicString", {
  enumerable: true,
  get: function get() {
    return _getFirstCharacters.getMagicString;
  }
});
Object.defineProperty(exports, "getPathPrefix", {
  enumerable: true,
  get: function get() {
    return _fileAliases.getPathPrefix;
  }
});
Object.defineProperty(exports, "global", {
  enumerable: true,
  get: function get() {
    return _globals.global;
  }
});
Object.defineProperty(exports, "isBrowser", {
  enumerable: true,
  get: function get() {
    return _globals.isBrowser;
  }
});
Object.defineProperty(exports, "isBuffer", {
  enumerable: true,
  get: function get() {
    return _memoryConversionUtils.isBuffer;
  }
});
Object.defineProperty(exports, "isWorker", {
  enumerable: true,
  get: function get() {
    return _globals.isWorker;
  }
});
Object.defineProperty(exports, "makeLineIterator", {
  enumerable: true,
  get: function get() {
    return _textIterators.makeLineIterator;
  }
});
Object.defineProperty(exports, "makeNumberedLineIterator", {
  enumerable: true,
  get: function get() {
    return _textIterators.makeNumberedLineIterator;
  }
});
Object.defineProperty(exports, "makeReadableFile", {
  enumerable: true,
  get: function get() {
    return _readableFile.makeReadableFile;
  }
});
Object.defineProperty(exports, "makeTextDecoderIterator", {
  enumerable: true,
  get: function get() {
    return _textIterators.makeTextDecoderIterator;
  }
});
Object.defineProperty(exports, "makeTextEncoderIterator", {
  enumerable: true,
  get: function get() {
    return _textIterators.makeTextEncoderIterator;
  }
});
Object.defineProperty(exports, "makeWritableFile", {
  enumerable: true,
  get: function get() {
    return _writableFile.makeWritableFile;
  }
});
Object.defineProperty(exports, "mergeLoaderOptions", {
  enumerable: true,
  get: function get() {
    return _mergeLoaderOptions.mergeLoaderOptions;
  }
});
Object.defineProperty(exports, "nodeVersion", {
  enumerable: true,
  get: function get() {
    return _globals.nodeVersion;
  }
});
Object.defineProperty(exports, "padStringToByteAlignment", {
  enumerable: true,
  get: function get() {
    return _dataviewCopyUtils.padStringToByteAlignment;
  }
});
Object.defineProperty(exports, "padToNBytes", {
  enumerable: true,
  get: function get() {
    return _memoryCopyUtils.padToNBytes;
  }
});
Object.defineProperty(exports, "parseJSON", {
  enumerable: true,
  get: function get() {
    return _parseJson.parseJSON;
  }
});
Object.defineProperty(exports, "parseWithWorker", {
  enumerable: true,
  get: function get() {
    return _parseWithWorker.parseWithWorker;
  }
});
exports.path = void 0;
Object.defineProperty(exports, "promisify1", {
  enumerable: true,
  get: function get() {
    return _promisify.promisify1;
  }
});
Object.defineProperty(exports, "promisify2", {
  enumerable: true,
  get: function get() {
    return _promisify.promisify2;
  }
});
Object.defineProperty(exports, "resolvePath", {
  enumerable: true,
  get: function get() {
    return _fileAliases.resolvePath;
  }
});
Object.defineProperty(exports, "self", {
  enumerable: true,
  get: function get() {
    return _globals.self;
  }
});
Object.defineProperty(exports, "setPathPrefix", {
  enumerable: true,
  get: function get() {
    return _fileAliases.setPathPrefix;
  }
});
Object.defineProperty(exports, "sliceArrayBuffer", {
  enumerable: true,
  get: function get() {
    return _arrayBufferUtils.sliceArrayBuffer;
  }
});
exports.stream = void 0;
Object.defineProperty(exports, "toArrayBuffer", {
  enumerable: true,
  get: function get() {
    return _memoryConversionUtils.toArrayBuffer;
  }
});
Object.defineProperty(exports, "toBuffer", {
  enumerable: true,
  get: function get() {
    return _memoryConversionUtils.toBuffer;
  }
});
Object.defineProperty(exports, "window", {
  enumerable: true,
  get: function get() {
    return _globals.window;
  }
});
var _assert = require("./lib/env-utils/assert");
var _globals = require("./lib/env-utils/globals");
var _mergeLoaderOptions = require("./lib/option-utils/merge-loader-options");
var _createLoaderWorker = require("./lib/worker-loader-utils/create-loader-worker");
var _parseWithWorker = require("./lib/worker-loader-utils/parse-with-worker");
var _encodeWithWorker = require("./lib/worker-loader-utils/encode-with-worker");
var _parseJson = require("./lib/parser-utils/parse-json");
var _arrayBufferUtils = require("./lib/binary-utils/array-buffer-utils");
var _memoryCopyUtils = require("./lib/binary-utils/memory-copy-utils");
var _dataviewCopyUtils = require("./lib/binary-utils/dataview-copy-utils");
var _getFirstCharacters = require("./lib/binary-utils/get-first-characters");
var _textIterators = require("./lib/iterators/text-iterators");
var _asyncIteration = require("./lib/iterators/async-iteration");
var _requestScheduler = _interopRequireDefault(require("./lib/request-utils/request-scheduler"));
var _fileAliases = require("./lib/path-utils/file-aliases");
var _jsonLoader = require("./json-loader");
var _memoryConversionUtils = require("./lib/binary-utils/memory-conversion-utils");
var _promisify = require("./lib/node/promisify");
var path = _interopRequireWildcard(require("./lib/path-utils/path"));
exports.path = path;
var fs = _interopRequireWildcard(require("./lib/node/fs"));
exports.fs = fs;
var stream = _interopRequireWildcard(require("./lib/node/stream"));
exports.stream = stream;
var _readableFile = require("./lib/filesystems/readable-file");
var _writableFile = require("./lib/filesystems/writable-file");
var _nodeFilesystem = _interopRequireDefault(require("./lib/filesystems/node-filesystem"));
function _getRequireWildcardCache(nodeInterop) { if (typeof WeakMap !== "function") return null; var cacheBabelInterop = new WeakMap(); var cacheNodeInterop = new WeakMap(); return (_getRequireWildcardCache = function _getRequireWildcardCache(nodeInterop) { return nodeInterop ? cacheNodeInterop : cacheBabelInterop; })(nodeInterop); }
function _interopRequireWildcard(obj, nodeInterop) { if (!nodeInterop && obj && obj.__esModule) { return obj; } if (obj === null || _typeof(obj) !== "object" && typeof obj !== "function") { return { default: obj }; } var cache = _getRequireWildcardCache(nodeInterop); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (key !== "default" && Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj.default = obj; if (cache) { cache.set(obj, newObj); } return newObj; }
//# sourceMappingURL=index.js.map