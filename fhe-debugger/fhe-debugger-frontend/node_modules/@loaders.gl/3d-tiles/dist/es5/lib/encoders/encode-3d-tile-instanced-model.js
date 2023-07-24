"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.encodeInstancedModel3DTile = encodeInstancedModel3DTile;
var _defineProperty2 = _interopRequireDefault(require("@babel/runtime/helpers/defineProperty"));
var _loaderUtils = require("@loaders.gl/loader-utils");
var _constants = require("../constants");
var _encode3dTileHeader = require("./helpers/encode-3d-tile-header");
function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); enumerableOnly && (symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; })), keys.push.apply(keys, symbols); } return keys; }
function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = null != arguments[i] ? arguments[i] : {}; i % 2 ? ownKeys(Object(source), !0).forEach(function (key) { (0, _defineProperty2.default)(target, key, source[key]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)) : ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } return target; }
function encodeInstancedModel3DTile(tile, dataView, byteOffset, options) {
  var _tile = tile,
    _tile$featuresLength = _tile.featuresLength,
    featuresLength = _tile$featuresLength === void 0 ? 1 : _tile$featuresLength,
    _tile$gltfFormat = _tile.gltfFormat,
    gltfFormat = _tile$gltfFormat === void 0 ? 1 : _tile$gltfFormat,
    _tile$gltfUri = _tile.gltfUri,
    gltfUri = _tile$gltfUri === void 0 ? '' : _tile$gltfUri;
  var gltfUriByteLength = gltfUri.length;
  var featureTableJson = {
    INSTANCES_LENGTH: featuresLength,
    POSITION: new Array(featuresLength * 3).fill(0)
  };
  var featureTableJsonString = JSON.stringify(featureTableJson);
  var featureTableJsonByteLength = featureTableJsonString.length;
  tile = _objectSpread({
    magic: _constants.MAGIC_ARRAY.INSTANCED_MODEL
  }, tile);
  var byteOffsetStart = byteOffset;
  byteOffset = (0, _encode3dTileHeader.encode3DTileHeader)(tile, dataView, 0);
  if (dataView) {
    dataView.setUint32(12, featureTableJsonByteLength, true);
    dataView.setUint32(16, 0, true);
    dataView.setUint32(20, 0, true);
    dataView.setUint32(24, 0, true);
    dataView.setUint32(28, gltfFormat, true);
  }
  byteOffset += 20;
  byteOffset += (0, _loaderUtils.copyStringToDataView)(dataView, byteOffset, featureTableJsonString, featureTableJsonByteLength);
  byteOffset += (0, _loaderUtils.copyStringToDataView)(dataView, byteOffset, gltfUri, gltfUriByteLength);
  (0, _encode3dTileHeader.encode3DTileByteLength)(dataView, byteOffsetStart, byteOffset - byteOffsetStart);
  return byteOffset;
}
//# sourceMappingURL=encode-3d-tile-instanced-model.js.map