"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.parseBatchedModel3DTile = parseBatchedModel3DTile;
var _regenerator = _interopRequireDefault(require("@babel/runtime/regenerator"));
var _asyncToGenerator2 = _interopRequireDefault(require("@babel/runtime/helpers/asyncToGenerator"));
var _math = require("@loaders.gl/math");
var _tile3dFeatureTable = _interopRequireDefault(require("../classes/tile-3d-feature-table"));
var _parse3dTileHeader = require("./helpers/parse-3d-tile-header");
var _parse3dTileTables = require("./helpers/parse-3d-tile-tables");
var _parse3dTileGltfView = require("./helpers/parse-3d-tile-gltf-view");
function parseBatchedModel3DTile(_x, _x2, _x3, _x4, _x5) {
  return _parseBatchedModel3DTile.apply(this, arguments);
}
function _parseBatchedModel3DTile() {
  _parseBatchedModel3DTile = (0, _asyncToGenerator2.default)(_regenerator.default.mark(function _callee(tile, arrayBuffer, byteOffset, options, context) {
    var _tile$gltf;
    var extensions;
    return _regenerator.default.wrap(function _callee$(_context) {
      while (1) switch (_context.prev = _context.next) {
        case 0:
          byteOffset = parseBatchedModel(tile, arrayBuffer, byteOffset, options, context);
          _context.next = 3;
          return (0, _parse3dTileGltfView.extractGLTF)(tile, _parse3dTileGltfView.GLTF_FORMAT.EMBEDDED, options, context);
        case 3:
          extensions = tile === null || tile === void 0 ? void 0 : (_tile$gltf = tile.gltf) === null || _tile$gltf === void 0 ? void 0 : _tile$gltf.extensions;
          if (extensions && extensions.CESIUM_RTC) {
            tile.rtcCenter = extensions.CESIUM_RTC.center;
          }
          return _context.abrupt("return", byteOffset);
        case 6:
        case "end":
          return _context.stop();
      }
    }, _callee);
  }));
  return _parseBatchedModel3DTile.apply(this, arguments);
}
function parseBatchedModel(tile, arrayBuffer, byteOffset, options, context) {
  byteOffset = (0, _parse3dTileHeader.parse3DTileHeaderSync)(tile, arrayBuffer, byteOffset);
  byteOffset = (0, _parse3dTileTables.parse3DTileTablesHeaderSync)(tile, arrayBuffer, byteOffset);
  byteOffset = (0, _parse3dTileTables.parse3DTileTablesSync)(tile, arrayBuffer, byteOffset, options);
  byteOffset = (0, _parse3dTileGltfView.parse3DTileGLTFViewSync)(tile, arrayBuffer, byteOffset, options);
  var featureTable = new _tile3dFeatureTable.default(tile.featureTableJson, tile.featureTableBinary);
  tile.rtcCenter = featureTable.getGlobalProperty('RTC_CENTER', _math.GL.FLOAT, 3);
  return byteOffset;
}
//# sourceMappingURL=parse-3d-tile-batched-model.js.map