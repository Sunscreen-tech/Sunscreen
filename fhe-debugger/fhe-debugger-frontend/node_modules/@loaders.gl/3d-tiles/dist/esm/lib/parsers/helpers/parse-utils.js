import { assert } from '@loaders.gl/loader-utils';
export function getStringFromArrayBuffer(arrayBuffer, byteOffset, byteLength) {
  assert(arrayBuffer instanceof ArrayBuffer);
  const textDecoder = new TextDecoder('utf8');
  const typedArray = new Uint8Array(arrayBuffer, byteOffset, byteLength);
  const string = textDecoder.decode(typedArray);
  return string;
}
export function getStringFromTypedArray(typedArray) {
  assert(ArrayBuffer.isView(typedArray));
  const textDecoder = new TextDecoder('utf8');
  const string = textDecoder.decode(typedArray);
  return string;
}
export function getMagicString(arrayBuffer) {
  let byteOffset = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 0;
  const dataView = new DataView(arrayBuffer);
  return "".concat(String.fromCharCode(dataView.getUint8(byteOffset + 0))).concat(String.fromCharCode(dataView.getUint8(byteOffset + 1))).concat(String.fromCharCode(dataView.getUint8(byteOffset + 2))).concat(String.fromCharCode(dataView.getUint8(byteOffset + 3)));
}
//# sourceMappingURL=parse-utils.js.map