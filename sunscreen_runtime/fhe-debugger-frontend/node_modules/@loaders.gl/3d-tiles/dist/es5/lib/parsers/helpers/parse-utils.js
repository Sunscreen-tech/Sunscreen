"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getMagicString = getMagicString;
exports.getStringFromArrayBuffer = getStringFromArrayBuffer;
exports.getStringFromTypedArray = getStringFromTypedArray;
var _loaderUtils = require("@loaders.gl/loader-utils");
function getStringFromArrayBuffer(arrayBuffer, byteOffset, byteLength) {
  (0, _loaderUtils.assert)(arrayBuffer instanceof ArrayBuffer);
  var textDecoder = new TextDecoder('utf8');
  var typedArray = new Uint8Array(arrayBuffer, byteOffset, byteLength);
  var string = textDecoder.decode(typedArray);
  return string;
}
function getStringFromTypedArray(typedArray) {
  (0, _loaderUtils.assert)(ArrayBuffer.isView(typedArray));
  var textDecoder = new TextDecoder('utf8');
  var string = textDecoder.decode(typedArray);
  return string;
}
function getMagicString(arrayBuffer) {
  var byteOffset = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 0;
  var dataView = new DataView(arrayBuffer);
  return "".concat(String.fromCharCode(dataView.getUint8(byteOffset + 0))).concat(String.fromCharCode(dataView.getUint8(byteOffset + 1))).concat(String.fromCharCode(dataView.getUint8(byteOffset + 2))).concat(String.fromCharCode(dataView.getUint8(byteOffset + 3)));
}
//# sourceMappingURL=parse-utils.js.map