"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.encodePointCloud3DTile = encodePointCloud3DTile;
var _defineProperty2 = _interopRequireDefault(require("@babel/runtime/helpers/defineProperty"));
var _constants = require("../constants");
var _encode3dTileHeader = require("./helpers/encode-3d-tile-header");
var _loaderUtils = require("@loaders.gl/loader-utils");
function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); enumerableOnly && (symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; })), keys.push.apply(keys, symbols); } return keys; }
function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = null != arguments[i] ? arguments[i] : {}; i % 2 ? ownKeys(Object(source), !0).forEach(function (key) { (0, _defineProperty2.default)(target, key, source[key]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)) : ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } return target; }
var DEFAULT_FEATURE_TABLE_JSON = {
  POINTS_LENGTH: 1,
  POSITIONS: {
    byteOffset: 0
  }
};
function encodePointCloud3DTile(tile, dataView, byteOffset, options) {
  var _tile = tile,
    _tile$featureTableJso = _tile.featureTableJson,
    featureTableJson = _tile$featureTableJso === void 0 ? DEFAULT_FEATURE_TABLE_JSON : _tile$featureTableJso;
  var featureTableJsonString = JSON.stringify(featureTableJson);
  featureTableJsonString = (0, _loaderUtils.padStringToByteAlignment)(featureTableJsonString, 4);
  var _tile2 = tile,
    _tile2$featureTableJs = _tile2.featureTableJsonByteLength,
    featureTableJsonByteLength = _tile2$featureTableJs === void 0 ? featureTableJsonString.length : _tile2$featureTableJs;
  var featureTableBinary = new ArrayBuffer(12);
  var featureTableBinaryByteLength = featureTableBinary.byteLength;
  tile = _objectSpread({
    magic: _constants.MAGIC_ARRAY.POINT_CLOUD
  }, tile);
  var byteOffsetStart = byteOffset;
  byteOffset += (0, _encode3dTileHeader.encode3DTileHeader)(tile, dataView, 0);
  if (dataView) {
    dataView.setUint32(byteOffset + 0, featureTableJsonByteLength, true);
    dataView.setUint32(byteOffset + 4, featureTableBinaryByteLength, true);
    dataView.setUint32(byteOffset + 8, 0, true);
    dataView.setUint32(byteOffset + 12, 0, true);
  }
  byteOffset += 16;
  byteOffset += (0, _loaderUtils.copyStringToDataView)(dataView, byteOffset, featureTableJsonString, featureTableJsonByteLength);
  byteOffset += (0, _loaderUtils.copyBinaryToDataView)(dataView, byteOffset, featureTableBinary, featureTableBinaryByteLength);
  (0, _encode3dTileHeader.encode3DTileByteLength)(dataView, byteOffsetStart, byteOffset - byteOffsetStart);
  return byteOffset;
}
//# sourceMappingURL=encode-3d-tile-point-cloud.js.map