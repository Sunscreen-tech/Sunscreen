"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.encodeBatchedModel3DTile = encodeBatchedModel3DTile;
var _defineProperty2 = _interopRequireDefault(require("@babel/runtime/helpers/defineProperty"));
var _loaderUtils = require("@loaders.gl/loader-utils");
var _constants = require("../constants");
var _encode3dTileHeader = require("./helpers/encode-3d-tile-header");
function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); enumerableOnly && (symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; })), keys.push.apply(keys, symbols); } return keys; }
function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = null != arguments[i] ? arguments[i] : {}; i % 2 ? ownKeys(Object(source), !0).forEach(function (key) { (0, _defineProperty2.default)(target, key, source[key]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)) : ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } return target; }
function encodeBatchedModel3DTile(tile, dataView, byteOffset, options) {
  var _tile = tile,
    _tile$featuresLength = _tile.featuresLength,
    featuresLength = _tile$featuresLength === void 0 ? 0 : _tile$featuresLength,
    batchTable = _tile.batchTable;
  var featureTableJson = {
    BATCH_LENGTH: featuresLength
  };
  var featureTableJsonString = JSON.stringify(featureTableJson);
  var batchTableJsonString = batchTable ? JSON.stringify(batchTable) : '';
  var featureTableJsonByteLength = (0, _loaderUtils.padToNBytes)(featureTableJsonString.length, 8);
  var batchTableJsonByteLength = batchTableJsonString ? (0, _loaderUtils.padToNBytes)(batchTableJsonString.length, 8) : 0;
  tile = _objectSpread({
    magic: _constants.MAGIC_ARRAY.BATCHED_MODEL
  }, tile);
  var byteOffsetStart = byteOffset;
  byteOffset = (0, _encode3dTileHeader.encode3DTileHeader)(tile, dataView, byteOffset);
  if (dataView) {
    dataView.setUint32(12, featureTableJsonByteLength, true);
    dataView.setUint32(16, 0, true);
    dataView.setUint32(20, batchTableJsonByteLength, true);
    dataView.setUint32(24, 0, true);
  }
  byteOffset += 16;
  byteOffset = (0, _loaderUtils.copyPaddedStringToDataView)(dataView, byteOffset, featureTableJsonString, 8);
  if (batchTable) {
    byteOffset = (0, _loaderUtils.copyPaddedStringToDataView)(dataView, byteOffset, batchTableJsonString, 8);
  }
  var gltfEncoded = tile.gltfEncoded;
  if (gltfEncoded) {
    byteOffset = (0, _loaderUtils.copyBinaryToDataView)(dataView, byteOffset, gltfEncoded, gltfEncoded.byteLength);
  }
  (0, _encode3dTileHeader.encode3DTileByteLength)(dataView, byteOffsetStart, byteOffset - byteOffsetStart);
  return byteOffset;
}
//# sourceMappingURL=encode-3d-tile-batched-model.js.map