import { assert } from '../utils/assert';
export function getTypedArrayForBufferView(json, buffers, bufferViewIndex) {
  const bufferView = json.bufferViews[bufferViewIndex];
  assert(bufferView);
  const bufferIndex = bufferView.buffer;
  const binChunk = buffers[bufferIndex];
  assert(binChunk);
  const byteOffset = (bufferView.byteOffset || 0) + binChunk.byteOffset;
  return new Uint8Array(binChunk.arrayBuffer, byteOffset, bufferView.byteLength);
}
export function getTypedArrayForImageData(json, buffers, imageIndex) {
  const image = json.images[imageIndex];
  const bufferViewIndex = json.bufferViews[image.bufferView];
  return getTypedArrayForBufferView(json, buffers, bufferViewIndex);
}
//# sourceMappingURL=get-typed-array.js.map