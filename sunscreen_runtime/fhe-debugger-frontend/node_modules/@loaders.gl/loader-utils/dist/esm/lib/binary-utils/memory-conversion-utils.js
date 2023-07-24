import * as node from '../node/buffer';
export function isBuffer(value) {
  return value && typeof value === 'object' && value.isBuffer;
}
export function toBuffer(data) {
  return node.toBuffer ? node.toBuffer(data) : data;
}
export function toArrayBuffer(data) {
  if (isBuffer(data)) {
    return node.toArrayBuffer(data);
  }
  if (data instanceof ArrayBuffer) {
    return data;
  }
  if (ArrayBuffer.isView(data)) {
    if (data.byteOffset === 0 && data.byteLength === data.buffer.byteLength) {
      return data.buffer;
    }
    return data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
  }
  if (typeof data === 'string') {
    const text = data;
    const uint8Array = new TextEncoder().encode(text);
    return uint8Array.buffer;
  }
  if (data && typeof data === 'object' && data._toArrayBuffer) {
    return data._toArrayBuffer();
  }
  throw new Error('toArrayBuffer');
}
//# sourceMappingURL=memory-conversion-utils.js.map