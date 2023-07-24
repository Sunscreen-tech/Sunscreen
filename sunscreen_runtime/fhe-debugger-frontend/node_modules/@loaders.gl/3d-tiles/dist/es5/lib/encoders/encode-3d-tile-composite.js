"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.encodeComposite3DTile = encodeComposite3DTile;
var _defineProperty2 = _interopRequireDefault(require("@babel/runtime/helpers/defineProperty"));
var _constants = require("../constants");
var _encode3dTileHeader = require("./helpers/encode-3d-tile-header");
function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); enumerableOnly && (symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; })), keys.push.apply(keys, symbols); } return keys; }
function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = null != arguments[i] ? arguments[i] : {}; i % 2 ? ownKeys(Object(source), !0).forEach(function (key) { (0, _defineProperty2.default)(target, key, source[key]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)) : ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } return target; }
function encodeComposite3DTile(tile, dataView, byteOffset, options, encode3DTile) {
  tile = _objectSpread({
    magic: _constants.MAGIC_ARRAY.COMPOSITE,
    tiles: []
  }, tile);
  var byteOffsetStart = byteOffset;
  byteOffset += (0, _encode3dTileHeader.encode3DTileHeader)(tile, dataView, byteOffset);
  if (dataView) {
    dataView.setUint32(byteOffset, tile.tiles.length, true);
  }
  byteOffset += 4;
  for (var i = 0; i < tile.tiles.length; ++i) {
    byteOffset += encode3DTile(tile.tiles[i], dataView, byteOffset, options);
  }
  (0, _encode3dTileHeader.encode3DTileByteLength)(dataView, byteOffsetStart, byteOffset - byteOffsetStart);
  return byteOffset;
}
//# sourceMappingURL=encode-3d-tile-composite.js.map