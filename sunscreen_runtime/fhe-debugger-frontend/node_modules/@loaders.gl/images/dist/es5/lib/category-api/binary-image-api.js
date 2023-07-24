"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getBinaryImageMetadata = getBinaryImageMetadata;
exports.getBmpMetadata = getBmpMetadata;
var _parseIsobmffBinary = require("./parse-isobmff-binary");
var BIG_ENDIAN = false;
var LITTLE_ENDIAN = true;
function getBinaryImageMetadata(binaryData) {
  var dataView = toDataView(binaryData);
  return getPngMetadata(dataView) || getJpegMetadata(dataView) || getGifMetadata(dataView) || getBmpMetadata(dataView) || getISOBMFFMetadata(dataView);
}
function getISOBMFFMetadata(binaryData) {
  var buffer = new Uint8Array(binaryData instanceof DataView ? binaryData.buffer : binaryData);
  var mediaType = (0, _parseIsobmffBinary.getISOBMFFMediaType)(buffer);
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
  var dataView = toDataView(binaryData);
  var isPng = dataView.byteLength >= 24 && dataView.getUint32(0, BIG_ENDIAN) === 0x89504e47;
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
  var dataView = toDataView(binaryData);
  var isGif = dataView.byteLength >= 10 && dataView.getUint32(0, BIG_ENDIAN) === 0x47494638;
  if (!isGif) {
    return null;
  }
  return {
    mimeType: 'image/gif',
    width: dataView.getUint16(6, LITTLE_ENDIAN),
    height: dataView.getUint16(8, LITTLE_ENDIAN)
  };
}
function getBmpMetadata(binaryData) {
  var dataView = toDataView(binaryData);
  var isBmp = dataView.byteLength >= 14 && dataView.getUint16(0, BIG_ENDIAN) === 0x424d && dataView.getUint32(2, LITTLE_ENDIAN) === dataView.byteLength;
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
  var dataView = toDataView(binaryData);
  var isJpeg = dataView.byteLength >= 3 && dataView.getUint16(0, BIG_ENDIAN) === 0xffd8 && dataView.getUint8(2) === 0xff;
  if (!isJpeg) {
    return null;
  }
  var _getJpegMarkers = getJpegMarkers(),
    tableMarkers = _getJpegMarkers.tableMarkers,
    sofMarkers = _getJpegMarkers.sofMarkers;
  var i = 2;
  while (i + 9 < dataView.byteLength) {
    var marker = dataView.getUint16(i, BIG_ENDIAN);
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
  var tableMarkers = new Set([0xffdb, 0xffc4, 0xffcc, 0xffdd, 0xfffe]);
  for (var i = 0xffe0; i < 0xfff0; ++i) {
    tableMarkers.add(i);
  }
  var sofMarkers = new Set([0xffc0, 0xffc1, 0xffc2, 0xffc3, 0xffc5, 0xffc6, 0xffc7, 0xffc9, 0xffca, 0xffcb, 0xffcd, 0xffce, 0xffcf, 0xffde]);
  return {
    tableMarkers: tableMarkers,
    sofMarkers: sofMarkers
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