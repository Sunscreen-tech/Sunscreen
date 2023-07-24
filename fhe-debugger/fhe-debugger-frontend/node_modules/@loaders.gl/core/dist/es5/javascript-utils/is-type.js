"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.isWritableStream = exports.isWritableNodeStream = exports.isWritableDOMStream = exports.isResponse = exports.isReadableStream = exports.isReadableNodeStream = exports.isReadableDOMStream = exports.isPureObject = exports.isPromise = exports.isObject = exports.isIterator = exports.isIterable = exports.isFile = exports.isBuffer = exports.isBlob = exports.isAsyncIterable = void 0;
var _typeof2 = _interopRequireDefault(require("@babel/runtime/helpers/typeof"));
var isBoolean = function isBoolean(x) {
  return typeof x === 'boolean';
};
var isFunction = function isFunction(x) {
  return typeof x === 'function';
};
var isObject = function isObject(x) {
  return x !== null && (0, _typeof2.default)(x) === 'object';
};
exports.isObject = isObject;
var isPureObject = function isPureObject(x) {
  return isObject(x) && x.constructor === {}.constructor;
};
exports.isPureObject = isPureObject;
var isPromise = function isPromise(x) {
  return isObject(x) && isFunction(x.then);
};
exports.isPromise = isPromise;
var isIterable = function isIterable(x) {
  return x && typeof x[Symbol.iterator] === 'function';
};
exports.isIterable = isIterable;
var isAsyncIterable = function isAsyncIterable(x) {
  return x && typeof x[Symbol.asyncIterator] === 'function';
};
exports.isAsyncIterable = isAsyncIterable;
var isIterator = function isIterator(x) {
  return x && isFunction(x.next);
};
exports.isIterator = isIterator;
var isResponse = function isResponse(x) {
  return typeof Response !== 'undefined' && x instanceof Response || x && x.arrayBuffer && x.text && x.json;
};
exports.isResponse = isResponse;
var isFile = function isFile(x) {
  return typeof File !== 'undefined' && x instanceof File;
};
exports.isFile = isFile;
var isBlob = function isBlob(x) {
  return typeof Blob !== 'undefined' && x instanceof Blob;
};
exports.isBlob = isBlob;
var isBuffer = function isBuffer(x) {
  return x && (0, _typeof2.default)(x) === 'object' && x.isBuffer;
};
exports.isBuffer = isBuffer;
var isWritableDOMStream = function isWritableDOMStream(x) {
  return isObject(x) && isFunction(x.abort) && isFunction(x.getWriter);
};
exports.isWritableDOMStream = isWritableDOMStream;
var isReadableDOMStream = function isReadableDOMStream(x) {
  return typeof ReadableStream !== 'undefined' && x instanceof ReadableStream || isObject(x) && isFunction(x.tee) && isFunction(x.cancel) && isFunction(x.getReader);
};
exports.isReadableDOMStream = isReadableDOMStream;
var isWritableNodeStream = function isWritableNodeStream(x) {
  return isObject(x) && isFunction(x.end) && isFunction(x.write) && isBoolean(x.writable);
};
exports.isWritableNodeStream = isWritableNodeStream;
var isReadableNodeStream = function isReadableNodeStream(x) {
  return isObject(x) && isFunction(x.read) && isFunction(x.pipe) && isBoolean(x.readable);
};
exports.isReadableNodeStream = isReadableNodeStream;
var isReadableStream = function isReadableStream(x) {
  return isReadableDOMStream(x) || isReadableNodeStream(x);
};
exports.isReadableStream = isReadableStream;
var isWritableStream = function isWritableStream(x) {
  return isWritableDOMStream(x) || isWritableNodeStream(x);
};
exports.isWritableStream = isWritableStream;
//# sourceMappingURL=is-type.js.map