"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = encode3DTile;
var _constants = require("../constants");
var _loaderUtils = require("@loaders.gl/loader-utils");
var _encode3dTileComposite = require("./encode-3d-tile-composite");
var _encode3dTileBatchedModel = require("./encode-3d-tile-batched-model");
var _encode3dTileInstancedModel = require("./encode-3d-tile-instanced-model");
var _encode3dTilePointCloud = require("./encode-3d-tile-point-cloud");
function encode3DTile(tile, options) {
  var byteLength = encode3DTileToDataView(tile, null, 0, options);
  var arrayBuffer = new ArrayBuffer(byteLength);
  var dataView = new DataView(arrayBuffer);
  encode3DTileToDataView(tile, dataView, 0, options);
  return arrayBuffer;
}
function encode3DTileToDataView(tile, dataView, byteOffset, options) {
  (0, _loaderUtils.assert)(typeof tile.type === 'string');
  switch (tile.type) {
    case _constants.TILE3D_TYPE.COMPOSITE:
      return (0, _encode3dTileComposite.encodeComposite3DTile)(tile, dataView, byteOffset, options, encode3DTileToDataView);
    case _constants.TILE3D_TYPE.POINT_CLOUD:
      return (0, _encode3dTilePointCloud.encodePointCloud3DTile)(tile, dataView, byteOffset, options);
    case _constants.TILE3D_TYPE.BATCHED_3D_MODEL:
      return (0, _encode3dTileBatchedModel.encodeBatchedModel3DTile)(tile, dataView, byteOffset, options);
    case _constants.TILE3D_TYPE.INSTANCED_3D_MODEL:
      return (0, _encode3dTileInstancedModel.encodeInstancedModel3DTile)(tile, dataView, byteOffset, options);
    default:
      throw new Error('3D Tiles: unknown tile type');
  }
}
//# sourceMappingURL=encode-3d-tile.js.map