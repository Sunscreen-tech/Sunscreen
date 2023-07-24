import { assert } from '@loaders.gl/loader-utils';
export function encode3DTileHeader(tile, dataView, byteOffset) {
  const HEADER_SIZE = 12;
  if (!dataView) {
    return byteOffset + HEADER_SIZE;
  }
  const {
    magic,
    version = 1,
    byteLength = 12
  } = tile;
  assert(Array.isArray(magic) && Number.isFinite(version) && Number.isFinite(byteLength));
  dataView.setUint8(byteOffset + 0, magic[0]);
  dataView.setUint8(byteOffset + 1, magic[1]);
  dataView.setUint8(byteOffset + 2, magic[2]);
  dataView.setUint8(byteOffset + 3, magic[3]);
  dataView.setUint32(byteOffset + 4, version, true);
  dataView.setUint32(byteOffset + 8, byteLength, true);
  byteOffset += HEADER_SIZE;
  return byteOffset;
}
export function encode3DTileByteLength(dataView, byteOffsetTileStart, byteLength) {
  if (!dataView) {
    return;
  }
  dataView.setUint32(byteOffsetTileStart + 8, byteLength, true);
}
//# sourceMappingURL=encode-3d-tile-header.js.map