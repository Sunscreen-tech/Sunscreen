const SIZEOF_UINT32 = 4;
export function parse3DTileHeaderSync(tile, arrayBuffer) {
  let byteOffset = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 0;
  const view = new DataView(arrayBuffer);
  tile.magic = view.getUint32(byteOffset, true);
  byteOffset += SIZEOF_UINT32;
  tile.version = view.getUint32(byteOffset, true);
  byteOffset += SIZEOF_UINT32;
  tile.byteLength = view.getUint32(byteOffset, true);
  byteOffset += SIZEOF_UINT32;
  if (tile.version !== 1) {
    throw new Error("3D Tile Version ".concat(tile.version, " not supported"));
  }
  return byteOffset;
}
//# sourceMappingURL=parse-3d-tile-header.js.map