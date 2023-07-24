"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.copyArrayBuffer = copyArrayBuffer;
exports.copyToArray = copyToArray;
exports.padToNBytes = padToNBytes;
var _assert = require("../env-utils/assert");
function padToNBytes(byteLength, padding) {
  (0, _assert.assert)(byteLength >= 0);
  (0, _assert.assert)(padding > 0);
  return byteLength + (padding - 1) & ~(padding - 1);
}
function copyArrayBuffer(targetBuffer, sourceBuffer, byteOffset) {
  var byteLength = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : sourceBuffer.byteLength;
  var targetArray = new Uint8Array(targetBuffer, byteOffset, byteLength);
  var sourceArray = new Uint8Array(sourceBuffer);
  targetArray.set(sourceArray);
  return targetBuffer;
}
function copyToArray(source, target, targetOffset) {
  var sourceArray;
  if (source instanceof ArrayBuffer) {
    sourceArray = new Uint8Array(source);
  } else {
    var srcByteOffset = source.byteOffset;
    var srcByteLength = source.byteLength;
    sourceArray = new Uint8Array(source.buffer || source.arrayBuffer, srcByteOffset, srcByteLength);
  }
  target.set(sourceArray, targetOffset);
  return targetOffset + padToNBytes(sourceArray.byteLength, 4);
}
//# sourceMappingURL=memory-copy-utils.js.map