"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.get3dTilesOptions = get3dTilesOptions;
function get3dTilesOptions(tileset) {
  return {
    assetGltfUpAxis: tileset.asset && tileset.asset.gltfUpAxis || 'Y'
  };
}
//# sourceMappingURL=3d-tiles-options.js.map