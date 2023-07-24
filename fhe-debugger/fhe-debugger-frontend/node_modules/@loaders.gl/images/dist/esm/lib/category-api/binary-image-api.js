import { getISOBMFFMediaType } from './parse-isobmff-binary';
const BIG_ENDIAN = false;
const LITTLE_ENDIAN = true;
export function getBinaryImageMetadata(binaryData) {
  const dataView = toDataView(binaryData);
  return getPngMetadata(dataView) || getJpegMetadata(dataView) || getGifMetadata(dataView) || getBmpMetadata(dataView) || getISOBMFFMetadata(dataView);
}
function getISOBMFFMetadata(binaryData) {
  const buffer = new Uint8Array(binaryData instanceof DataView ? binaryData.buffer : binaryData);
  const mediaType = getISOBMFFMediaType(buffer);
  if (!mediaType) {
    return null;
  }
  return {
    mimeType: mediaType.mimeType,
    width: 0,
    height: 0
  };
}
function getPngMetadata(binaryData) {
  const dataView = toDataView(binaryData);
  const isPng = dataView.byteLength >= 24 && dataView.getUint32(0, BIG_ENDIAN) === 0x89504e47;
  if (!isPng) {
    return null;
  }
  return {
    mimeType: 'image/png',
    width: dataView.getUint32(16, BIG_ENDIAN),
    height: dataView.getUint32(20, BIG_ENDIAN)
  };
}
function getGifMetadata(binaryData) {
  const dataView = toDataView(binaryData);
  const isGif = dataView.byteLength >= 10 && dataView.getUint32(0, BIG_ENDIAN) === 0x47494638;
  if (!isGif) {
    return null;
  }
  return {
    mimeType: 'image/gif',
    width: dataView.getUint16(6, LITTLE_ENDIAN),
    height: dataView.getUint16(8, LITTLE_ENDIAN)
  };
}
export function getBmpMetadata(binaryData) {
  const dataView = toDataView(binaryData);
  const isBmp = dataView.byteLength >= 14 && dataView.getUint16(0, BIG_ENDIAN) === 0x424d && dataView.getUint32(2, LITTLE_ENDIAN) === dataView.byteLength;
  if (!isBmp) {
    return null;
  }
  return {
    mimeType: 'image/bmp',
    width: dataView.getUint32(18, LITTLE_ENDIAN),
    height: dataView.getUint32(22, LITTLE_ENDIAN)
  };
}
function getJpegMetadata(binaryData) {
  const dataView = toDataView(binaryData);
  const isJpeg = dataView.byteLength >= 3 && dataView.getUint16(0, BIG_ENDIAN) === 0xffd8 && dataView.getUint8(2) === 0xff;
  if (!isJpeg) {
    return null;
  }
  const {
    tableMarkers,
    sofMarkers
  } = getJpegMarkers();
  let i = 2;
  while (i + 9 < dataView.byteLength) {
    const marker = dataView.getUint16(i, BIG_ENDIAN);
    if (sofMarkers.has(marker)) {
      return {
        mimeType: 'image/jpeg',
        height: dataView.getUint16(i + 5, BIG_ENDIAN),
        width: dataView.getUint16(i + 7, BIG_ENDIAN)
      };
    }
    if (!tableMarkers.has(marker)) {
      return null;
    }
    i += 2;
    i += dataView.getUint16(i, BIG_ENDIAN);
  }
  return null;
}
function getJpegMarkers() {
  const tableMarkers = new Set([0xffdb, 0xffc4, 0xffcc, 0xffdd, 0xfffe]);
  for (let i = 0xffe0; i < 0xfff0; ++i) {
    tableMarkers.add(i);
  }
  const sofMarkers = new Set([0xffc0, 0xffc1, 0xffc2, 0xffc3, 0xffc5, 0xffc6, 0xffc7, 0xffc9, 0xffca, 0xffcb, 0xffcd, 0xffce, 0xffcf, 0xffde]);
  return {
    tableMarkers,
    sofMarkers
  };
}
function toDataView(data) {
  if (data instanceof DataView) {
    return data;
  }
  if (ArrayBuffer.isView(data)) {
    return new DataView(data.buffer);
  }
  if (data instanceof ArrayBuffer) {
    return new DataView(data);
  }
  throw new Error('toDataView');
}
//# sourceMappingURL=binary-image-api.js.map