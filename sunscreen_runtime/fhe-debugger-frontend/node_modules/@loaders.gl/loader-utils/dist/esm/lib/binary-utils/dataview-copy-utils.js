import { padToNBytes } from './memory-copy-utils';
export function padStringToByteAlignment(string, byteAlignment) {
  const length = string.length;
  const paddedLength = Math.ceil(length / byteAlignment) * byteAlignment;
  const padding = paddedLength - length;
  let whitespace = '';
  for (let i = 0; i < padding; ++i) {
    whitespace += ' ';
  }
  return string + whitespace;
}
export function copyStringToDataView(dataView, byteOffset, string, byteLength) {
  if (dataView) {
    for (let i = 0; i < byteLength; i++) {
      dataView.setUint8(byteOffset + i, string.charCodeAt(i));
    }
  }
  return byteOffset + byteLength;
}
export function copyBinaryToDataView(dataView, byteOffset, binary, byteLength) {
  if (dataView) {
    for (let i = 0; i < byteLength; i++) {
      dataView.setUint8(byteOffset + i, binary[i]);
    }
  }
  return byteOffset + byteLength;
}
export function copyPaddedArrayBufferToDataView(dataView, byteOffset, sourceBuffer, padding) {
  const paddedLength = padToNBytes(sourceBuffer.byteLength, padding);
  const padLength = paddedLength - sourceBuffer.byteLength;
  if (dataView) {
    const targetArray = new Uint8Array(dataView.buffer, dataView.byteOffset + byteOffset, sourceBuffer.byteLength);
    const sourceArray = new Uint8Array(sourceBuffer);
    targetArray.set(sourceArray);
    for (let i = 0; i < padLength; ++i) {
      dataView.setUint8(byteOffset + sourceBuffer.byteLength + i, 0x20);
    }
  }
  byteOffset += paddedLength;
  return byteOffset;
}
export function copyPaddedStringToDataView(dataView, byteOffset, string, padding) {
  const textEncoder = new TextEncoder();
  const stringBuffer = textEncoder.encode(string);
  byteOffset = copyPaddedArrayBufferToDataView(dataView, byteOffset, stringBuffer, padding);
  return byteOffset;
}
//# sourceMappingURL=dataview-copy-utils.js.map