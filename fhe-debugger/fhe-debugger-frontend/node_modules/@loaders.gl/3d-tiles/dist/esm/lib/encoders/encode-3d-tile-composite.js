import { MAGIC_ARRAY } from '../constants';
import { encode3DTileHeader, encode3DTileByteLength } from './helpers/encode-3d-tile-header';
export function encodeComposite3DTile(tile, dataView, byteOffset, options, encode3DTile) {
  tile = {
    magic: MAGIC_ARRAY.COMPOSITE,
    tiles: [],
    ...tile
  };
  const byteOffsetStart = byteOffset;
  byteOffset += encode3DTileHeader(tile, dataView, byteOffset);
  if (dataView) {
    dataView.setUint32(byteOffset, tile.tiles.length, true);
  }
  byteOffset += 4;
  for (let i = 0; i < tile.tiles.length; ++i) {
    byteOffset += encode3DTile(tile.tiles[i], dataView, byteOffset, options);
  }
  encode3DTileByteLength(dataView, byteOffsetStart, byteOffset - byteOffsetStart);
  return byteOffset;
}
//# sourceMappingURL=encode-3d-tile-composite.js.map