"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.concatTypedArrays = concatTypedArrays;
function concatTypedArrays() {
  var arrays = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [];
  var byteLength = 0;
  for (var i = 0; i < arrays.length; ++i) {
    byteLength += arrays[i].byteLength;
  }
  var buffer = new Uint8Array(byteLength);
  var byteOffset = 0;
  for (var _i = 0; _i < arrays.length; ++_i) {
    var data = new Uint8Array(arrays[_i].buffer);
    byteLength = data.length;
    for (var j = 0; j < byteLength; ++j) {
      buffer[byteOffset++] = data[j];
    }
  }
  return buffer;
}
//# sourceMappingURL=typed-array-utils.js.map