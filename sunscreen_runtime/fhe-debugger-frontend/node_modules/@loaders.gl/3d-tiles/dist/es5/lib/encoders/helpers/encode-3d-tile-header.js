"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.encode3DTileByteLength = encode3DTileByteLength;
exports.encode3DTileHeader = encode3DTileHeader;
var _loaderUtils = require("@loaders.gl/loader-utils");
function encode3DTileHeader(tile, dataView, byteOffset) {
  var HEADER_SIZE = 12;
  if (!dataView) {
    return byteOffset + HEADER_SIZE;
  }
  var magic = tile.magic,
    _tile$version = tile.version,
    version = _tile$version === void 0 ? 1 : _tile$version,
    _tile$byteLength = tile.byteLength,
    byteLength = _tile$byteLength === void 0 ? 12 : _tile$byteLength;
  (0, _loaderUtils.assert)(Array.isArray(magic) && Number.isFinite(version) && Number.isFinite(byteLength));
  dataView.setUint8(byteOffset + 0, magic[0]);
  dataView.setUint8(byteOffset + 1, magic[1]);
  dataView.setUint8(byteOffset + 2, magic[2]);
  dataView.setUint8(byteOffset + 3, magic[3]);
  dataView.setUint32(byteOffset + 4, version, true);
  dataView.setUint32(byteOffset + 8, byteLength, true);
  byteOffset += HEADER_SIZE;
  return byteOffset;
}
function encode3DTileByteLength(dataView, byteOffsetTileStart, byteLength) {
  if (!dataView) {
    return;
  }
  dataView.setUint32(byteOffsetTileStart + 8, byteLength, true);
}
//# sourceMappingURL=encode-3d-tile-header.js.map