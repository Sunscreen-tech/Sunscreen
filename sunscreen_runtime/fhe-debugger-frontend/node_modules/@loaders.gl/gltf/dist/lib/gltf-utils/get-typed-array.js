"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTypedArrayForImageData = exports.getTypedArrayForBufferView = void 0;
// TODO - GLTFScenegraph should use these
const assert_1 = require("../utils/assert");
// accepts buffer view index or buffer view object
// returns a `Uint8Array`
function getTypedArrayForBufferView(json, buffers, bufferViewIndex) {
    const bufferView = json.bufferViews[bufferViewIndex];
    (0, assert_1.assert)(bufferView);
    // Get hold of the arrayBuffer
    const bufferIndex = bufferView.buffer;
    const binChunk = buffers[bufferIndex];
    (0, assert_1.assert)(binChunk);
    const byteOffset = (bufferView.byteOffset || 0) + binChunk.byteOffset;
    return new Uint8Array(binChunk.arrayBuffer, byteOffset, bufferView.byteLength);
}
exports.getTypedArrayForBufferView = getTypedArrayForBufferView;
// accepts accessor index or accessor object
// returns a `Uint8Array`
function getTypedArrayForImageData(json, buffers, imageIndex) {
    const image = json.images[imageIndex];
    const bufferViewIndex = json.bufferViews[image.bufferView];
    return getTypedArrayForBufferView(json, buffers, bufferViewIndex);
}
exports.getTypedArrayForImageData = getTypedArrayForImageData;
/*
// accepts accessor index or accessor object
// returns a typed array with type that matches the types
export function getTypedArrayForAccessor(accessor) {
  accessor = this.getAccessor(accessor);
  const bufferView = this.getBufferView(accessor.bufferView);
  const buffer = this.getBuffer(bufferView.buffer);
  const arrayBuffer = buffer.data;

  // Create a new typed array as a view into the combined buffer
  const {ArrayType, length} = getAccessorArrayTypeAndLength(accessor, bufferView);
  const byteOffset = bufferView.byteOffset + accessor.byteOffset;
  return new ArrayType(arrayBuffer, byteOffset, length);
}
*/
