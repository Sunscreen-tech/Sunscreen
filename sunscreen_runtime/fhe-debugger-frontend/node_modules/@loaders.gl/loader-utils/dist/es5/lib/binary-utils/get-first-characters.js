"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getFirstCharacters = getFirstCharacters;
exports.getMagicString = getMagicString;
function getFirstCharacters(data) {
  var length = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 5;
  if (typeof data === 'string') {
    return data.slice(0, length);
  } else if (ArrayBuffer.isView(data)) {
    return getMagicString(data.buffer, data.byteOffset, length);
  } else if (data instanceof ArrayBuffer) {
    var byteOffset = 0;
    return getMagicString(data, byteOffset, length);
  }
  return '';
}
function getMagicString(arrayBuffer, byteOffset, length) {
  if (arrayBuffer.byteLength <= byteOffset + length) {
    return '';
  }
  var dataView = new DataView(arrayBuffer);
  var magic = '';
  for (var i = 0; i < length; i++) {
    magic += String.fromCharCode(dataView.getUint8(byteOffset + i));
  }
  return magic;
}
//# sourceMappingURL=get-first-characters.js.map