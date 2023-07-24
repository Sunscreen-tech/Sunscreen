"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.compareArrayBuffers = compareArrayBuffers;
exports.concatenateArrayBuffers = concatenateArrayBuffers;
exports.concatenateTypedArrays = concatenateTypedArrays;
exports.sliceArrayBuffer = sliceArrayBuffer;
function _createForOfIteratorHelper(o, allowArrayLike) { var it = typeof Symbol !== "undefined" && o[Symbol.iterator] || o["@@iterator"]; if (!it) { if (Array.isArray(o) || (it = _unsupportedIterableToArray(o)) || allowArrayLike && o && typeof o.length === "number") { if (it) o = it; var i = 0; var F = function F() {}; return { s: F, n: function n() { if (i >= o.length) return { done: true }; return { done: false, value: o[i++] }; }, e: function e(_e) { throw _e; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var normalCompletion = true, didErr = false, err; return { s: function s() { it = it.call(o); }, n: function n() { var step = it.next(); normalCompletion = step.done; return step; }, e: function e(_e2) { didErr = true; err = _e2; }, f: function f() { try { if (!normalCompletion && it.return != null) it.return(); } finally { if (didErr) throw err; } } }; }
function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }
function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) arr2[i] = arr[i]; return arr2; }
function compareArrayBuffers(arrayBuffer1, arrayBuffer2, byteLength) {
  byteLength = byteLength || arrayBuffer1.byteLength;
  if (arrayBuffer1.byteLength < byteLength || arrayBuffer2.byteLength < byteLength) {
    return false;
  }
  var array1 = new Uint8Array(arrayBuffer1);
  var array2 = new Uint8Array(arrayBuffer2);
  for (var i = 0; i < array1.length; ++i) {
    if (array1[i] !== array2[i]) {
      return false;
    }
  }
  return true;
}
function concatenateArrayBuffers() {
  for (var _len = arguments.length, sources = new Array(_len), _key = 0; _key < _len; _key++) {
    sources[_key] = arguments[_key];
  }
  var sourceArrays = sources.map(function (source2) {
    return source2 instanceof ArrayBuffer ? new Uint8Array(source2) : source2;
  });
  var byteLength = sourceArrays.reduce(function (length, typedArray) {
    return length + typedArray.byteLength;
  }, 0);
  var result = new Uint8Array(byteLength);
  var offset = 0;
  var _iterator = _createForOfIteratorHelper(sourceArrays),
    _step;
  try {
    for (_iterator.s(); !(_step = _iterator.n()).done;) {
      var sourceArray = _step.value;
      result.set(sourceArray, offset);
      offset += sourceArray.byteLength;
    }
  } catch (err) {
    _iterator.e(err);
  } finally {
    _iterator.f();
  }
  return result.buffer;
}
function concatenateTypedArrays() {
  for (var _len2 = arguments.length, typedArrays = new Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
    typedArrays[_key2] = arguments[_key2];
  }
  var arrays = typedArrays;
  var TypedArrayConstructor = arrays && arrays.length > 1 && arrays[0].constructor || null;
  if (!TypedArrayConstructor) {
    throw new Error('"concatenateTypedArrays" - incorrect quantity of arguments or arguments have incompatible data types');
  }
  var sumLength = arrays.reduce(function (acc, value) {
    return acc + value.length;
  }, 0);
  var result = new TypedArrayConstructor(sumLength);
  var offset = 0;
  for (var _i = 0, _arrays = arrays; _i < _arrays.length; _i++) {
    var array = _arrays[_i];
    result.set(array, offset);
    offset += array.length;
  }
  return result;
}
function sliceArrayBuffer(arrayBuffer, byteOffset, byteLength) {
  var subArray = byteLength !== undefined ? new Uint8Array(arrayBuffer).subarray(byteOffset, byteOffset + byteLength) : new Uint8Array(arrayBuffer).subarray(byteOffset);
  var arrayCopy = new Uint8Array(subArray);
  return arrayCopy.buffer;
}
//# sourceMappingURL=array-buffer-utils.js.map