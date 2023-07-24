"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getTypedArrayForBufferView = getTypedArrayForBufferView;
exports.getTypedArrayForImageData = getTypedArrayForImageData;
var _assert = require("../utils/assert");
function getTypedArrayForBufferView(json, buffers, bufferViewIndex) {
  var bufferView = json.bufferViews[bufferViewIndex];
  (0, _assert.assert)(bufferView);
  var bufferIndex = bufferView.buffer;
  var binChunk = buffers[bufferIndex];
  (0, _assert.assert)(binChunk);
  var byteOffset = (bufferView.byteOffset || 0) + binChunk.byteOffset;
  return new Uint8Array(binChunk.arrayBuffer, byteOffset, bufferView.byteLength);
}
function getTypedArrayForImageData(json, buffers, imageIndex) {
  var image = json.images[imageIndex];
  var bufferViewIndex = json.bufferViews[image.bufferView];
  return getTypedArrayForBufferView(json, buffers, bufferViewIndex);
}
//# sourceMappingURL=get-typed-array.js.map