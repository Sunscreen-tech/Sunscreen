"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.parse3DTileHeaderSync = parse3DTileHeaderSync;
var SIZEOF_UINT32 = 4;
function parse3DTileHeaderSync(tile, arrayBuffer) {
  var byteOffset = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 0;
  var view = new DataView(arrayBuffer);
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