"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.copyBinaryToDataView = copyBinaryToDataView;
exports.copyPaddedArrayBufferToDataView = copyPaddedArrayBufferToDataView;
exports.copyPaddedStringToDataView = copyPaddedStringToDataView;
exports.copyStringToDataView = copyStringToDataView;
exports.padStringToByteAlignment = padStringToByteAlignment;
var _memoryCopyUtils = require("./memory-copy-utils");
function padStringToByteAlignment(string, byteAlignment) {
  var length = string.length;
  var paddedLength = Math.ceil(length / byteAlignment) * byteAlignment;
  var padding = paddedLength - length;
  var whitespace = '';
  for (var i = 0; i < padding; ++i) {
    whitespace += ' ';
  }
  return string + whitespace;
}
function copyStringToDataView(dataView, byteOffset, string, byteLength) {
  if (dataView) {
    for (var i = 0; i < byteLength; i++) {
      dataView.setUint8(byteOffset + i, string.charCodeAt(i));
    }
  }
  return byteOffset + byteLength;
}
function copyBinaryToDataView(dataView, byteOffset, binary, byteLength) {
  if (dataView) {
    for (var i = 0; i < byteLength; i++) {
      dataView.setUint8(byteOffset + i, binary[i]);
    }
  }
  return byteOffset + byteLength;
}
function copyPaddedArrayBufferToDataView(dataView, byteOffset, sourceBuffer, padding) {
  var paddedLength = (0, _memoryCopyUtils.padToNBytes)(sourceBuffer.byteLength, padding);
  var padLength = paddedLength - sourceBuffer.byteLength;
  if (dataView) {
    var targetArray = new Uint8Array(dataView.buffer, dataView.byteOffset + byteOffset, sourceBuffer.byteLength);
    var sourceArray = new Uint8Array(sourceBuffer);
    targetArray.set(sourceArray);
    for (var i = 0; i < padLength; ++i) {
      dataView.setUint8(byteOffset + sourceBuffer.byteLength + i, 0x20);
    }
  }
  byteOffset += paddedLength;
  return byteOffset;
}
function copyPaddedStringToDataView(dataView, byteOffset, string, padding) {
  var textEncoder = new TextEncoder();
  var stringBuffer = textEncoder.encode(string);
  byteOffset = copyPaddedArrayBufferToDataView(dataView, byteOffset, stringBuffer, padding);
  return byteOffset;
}
//# sourceMappingURL=dataview-copy-utils.js.map