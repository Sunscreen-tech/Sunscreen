"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.loadDraco = loadDraco;
exports.parsePointCloud3DTile = parsePointCloud3DTile;
var _regenerator = _interopRequireDefault(require("@babel/runtime/regenerator"));
var _defineProperty2 = _interopRequireDefault(require("@babel/runtime/helpers/defineProperty"));
var _asyncToGenerator2 = _interopRequireDefault(require("@babel/runtime/helpers/asyncToGenerator"));
var _draco = require("@loaders.gl/draco");
var _math = require("@loaders.gl/math");
var _core = require("@math.gl/core");
var _tile3dFeatureTable = _interopRequireDefault(require("../classes/tile-3d-feature-table"));
var _tile3dBatchTable = _interopRequireDefault(require("../classes/tile-3d-batch-table"));
var _parse3dTileHeader = require("./helpers/parse-3d-tile-header");
var _parse3dTileTables = require("./helpers/parse-3d-tile-tables");
var _normalize3dTileColors = require("./helpers/normalize-3d-tile-colors");
var _normalize3dTileNormals = require("./helpers/normalize-3d-tile-normals");
var _normalize3dTilePositions = require("./helpers/normalize-3d-tile-positions");
function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); enumerableOnly && (symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; })), keys.push.apply(keys, symbols); } return keys; }
function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = null != arguments[i] ? arguments[i] : {}; i % 2 ? ownKeys(Object(source), !0).forEach(function (key) { (0, _defineProperty2.default)(target, key, source[key]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)) : ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } return target; }
function parsePointCloud3DTile(_x, _x2, _x3, _x4, _x5) {
  return _parsePointCloud3DTile.apply(this, arguments);
}
function _parsePointCloud3DTile() {
  _parsePointCloud3DTile = (0, _asyncToGenerator2.default)(_regenerator.default.mark(function _callee(tile, arrayBuffer, byteOffset, options, context) {
    var _parsePointCloudTable, featureTable, batchTable;
    return _regenerator.default.wrap(function _callee$(_context) {
      while (1) switch (_context.prev = _context.next) {
        case 0:
          byteOffset = (0, _parse3dTileHeader.parse3DTileHeaderSync)(tile, arrayBuffer, byteOffset);
          byteOffset = (0, _parse3dTileTables.parse3DTileTablesHeaderSync)(tile, arrayBuffer, byteOffset);
          byteOffset = (0, _parse3dTileTables.parse3DTileTablesSync)(tile, arrayBuffer, byteOffset, options);
          initializeTile(tile);
          _parsePointCloudTable = parsePointCloudTables(tile), featureTable = _parsePointCloudTable.featureTable, batchTable = _parsePointCloudTable.batchTable;
          _context.next = 7;
          return parseDraco(tile, featureTable, batchTable, options, context);
        case 7:
          parsePositions(tile, featureTable, options);
          parseColors(tile, featureTable, batchTable);
          parseNormals(tile, featureTable);
          return _context.abrupt("return", byteOffset);
        case 11:
        case "end":
          return _context.stop();
      }
    }, _callee);
  }));
  return _parsePointCloud3DTile.apply(this, arguments);
}
function initializeTile(tile) {
  tile.attributes = {
    positions: null,
    colors: null,
    normals: null,
    batchIds: null
  };
  tile.isQuantized = false;
  tile.isTranslucent = false;
  tile.isRGB565 = false;
  tile.isOctEncoded16P = false;
}
function parsePointCloudTables(tile) {
  var featureTable = new _tile3dFeatureTable.default(tile.featureTableJson, tile.featureTableBinary);
  var pointsLength = featureTable.getGlobalProperty('POINTS_LENGTH');
  if (!Number.isFinite(pointsLength)) {
    throw new Error('POINTS_LENGTH must be defined');
  }
  featureTable.featuresLength = pointsLength;
  tile.featuresLength = pointsLength;
  tile.pointsLength = pointsLength;
  tile.pointCount = pointsLength;
  tile.rtcCenter = featureTable.getGlobalProperty('RTC_CENTER', _math.GL.FLOAT, 3);
  var batchTable = parseBatchIds(tile, featureTable);
  return {
    featureTable: featureTable,
    batchTable: batchTable
  };
}
function parsePositions(tile, featureTable, options) {
  if (!tile.attributes.positions) {
    if (featureTable.hasProperty('POSITION')) {
      tile.attributes.positions = featureTable.getPropertyArray('POSITION', _math.GL.FLOAT, 3);
    } else if (featureTable.hasProperty('POSITION_QUANTIZED')) {
      var positions = featureTable.getPropertyArray('POSITION_QUANTIZED', _math.GL.UNSIGNED_SHORT, 3);
      tile.isQuantized = true;
      tile.quantizedRange = (1 << 16) - 1;
      tile.quantizedVolumeScale = featureTable.getGlobalProperty('QUANTIZED_VOLUME_SCALE', _math.GL.FLOAT, 3);
      if (!tile.quantizedVolumeScale) {
        throw new Error('QUANTIZED_VOLUME_SCALE must be defined for quantized positions.');
      }
      tile.quantizedVolumeOffset = featureTable.getGlobalProperty('QUANTIZED_VOLUME_OFFSET', _math.GL.FLOAT, 3);
      if (!tile.quantizedVolumeOffset) {
        throw new Error('QUANTIZED_VOLUME_OFFSET must be defined for quantized positions.');
      }
      tile.attributes.positions = (0, _normalize3dTilePositions.normalize3DTilePositionAttribute)(tile, positions, options);
    }
  }
  if (!tile.attributes.positions) {
    throw new Error('Either POSITION or POSITION_QUANTIZED must be defined.');
  }
}
function parseColors(tile, featureTable, batchTable) {
  if (!tile.attributes.colors) {
    var colors = null;
    if (featureTable.hasProperty('RGBA')) {
      colors = featureTable.getPropertyArray('RGBA', _math.GL.UNSIGNED_BYTE, 4);
      tile.isTranslucent = true;
    } else if (featureTable.hasProperty('RGB')) {
      colors = featureTable.getPropertyArray('RGB', _math.GL.UNSIGNED_BYTE, 3);
    } else if (featureTable.hasProperty('RGB565')) {
      colors = featureTable.getPropertyArray('RGB565', _math.GL.UNSIGNED_SHORT, 1);
      tile.isRGB565 = true;
    }
    tile.attributes.colors = (0, _normalize3dTileColors.normalize3DTileColorAttribute)(tile, colors, batchTable);
  }
  if (featureTable.hasProperty('CONSTANT_RGBA')) {
    tile.constantRGBA = featureTable.getGlobalProperty('CONSTANT_RGBA', _math.GL.UNSIGNED_BYTE, 4);
  }
}
function parseNormals(tile, featureTable) {
  if (!tile.attributes.normals) {
    var normals = null;
    if (featureTable.hasProperty('NORMAL')) {
      normals = featureTable.getPropertyArray('NORMAL', _math.GL.FLOAT, 3);
    } else if (featureTable.hasProperty('NORMAL_OCT16P')) {
      normals = featureTable.getPropertyArray('NORMAL_OCT16P', _math.GL.UNSIGNED_BYTE, 2);
      tile.isOctEncoded16P = true;
    }
    tile.attributes.normals = (0, _normalize3dTileNormals.normalize3DTileNormalAttribute)(tile, normals);
  }
}
function parseBatchIds(tile, featureTable) {
  var batchTable = null;
  if (!tile.batchIds && featureTable.hasProperty('BATCH_ID')) {
    tile.batchIds = featureTable.getPropertyArray('BATCH_ID', _math.GL.UNSIGNED_SHORT, 1);
    if (tile.batchIds) {
      var batchFeatureLength = featureTable.getGlobalProperty('BATCH_LENGTH');
      if (!batchFeatureLength) {
        throw new Error('Global property: BATCH_LENGTH must be defined when BATCH_ID is defined.');
      }
      var batchTableJson = tile.batchTableJson,
        batchTableBinary = tile.batchTableBinary;
      batchTable = new _tile3dBatchTable.default(batchTableJson, batchTableBinary, batchFeatureLength);
    }
  }
  return batchTable;
}
function parseDraco(_x6, _x7, _x8, _x9, _x10) {
  return _parseDraco.apply(this, arguments);
}
function _parseDraco() {
  _parseDraco = (0, _asyncToGenerator2.default)(_regenerator.default.mark(function _callee2(tile, featureTable, batchTable, options, context) {
    var dracoBuffer, dracoFeatureTableProperties, dracoBatchTableProperties, batchTableDraco, featureTableDraco, dracoByteOffset, dracoByteLength, dracoData;
    return _regenerator.default.wrap(function _callee2$(_context2) {
      while (1) switch (_context2.prev = _context2.next) {
        case 0:
          batchTableDraco = tile.batchTableJson && tile.batchTableJson.extensions && tile.batchTableJson.extensions['3DTILES_draco_point_compression'];
          if (batchTableDraco) {
            dracoBatchTableProperties = batchTableDraco.properties;
          }
          featureTableDraco = featureTable.getExtension('3DTILES_draco_point_compression');
          if (!featureTableDraco) {
            _context2.next = 15;
            break;
          }
          dracoFeatureTableProperties = featureTableDraco.properties;
          dracoByteOffset = featureTableDraco.byteOffset;
          dracoByteLength = featureTableDraco.byteLength;
          if (!(!dracoFeatureTableProperties || !Number.isFinite(dracoByteOffset) || !dracoByteLength)) {
            _context2.next = 9;
            break;
          }
          throw new Error('Draco properties, byteOffset, and byteLength must be defined');
        case 9:
          dracoBuffer = tile.featureTableBinary.slice(dracoByteOffset, dracoByteOffset + dracoByteLength);
          tile.hasPositions = Number.isFinite(dracoFeatureTableProperties.POSITION);
          tile.hasColors = Number.isFinite(dracoFeatureTableProperties.RGB) || Number.isFinite(dracoFeatureTableProperties.RGBA);
          tile.hasNormals = Number.isFinite(dracoFeatureTableProperties.NORMAL);
          tile.hasBatchIds = Number.isFinite(dracoFeatureTableProperties.BATCH_ID);
          tile.isTranslucent = Number.isFinite(dracoFeatureTableProperties.RGBA);
        case 15:
          if (dracoBuffer) {
            _context2.next = 17;
            break;
          }
          return _context2.abrupt("return", true);
        case 17:
          dracoData = {
            buffer: dracoBuffer,
            properties: _objectSpread(_objectSpread({}, dracoFeatureTableProperties), dracoBatchTableProperties),
            featureTableProperties: dracoFeatureTableProperties,
            batchTableProperties: dracoBatchTableProperties,
            dequantizeInShader: false
          };
          _context2.next = 20;
          return loadDraco(tile, dracoData, options, context);
        case 20:
          return _context2.abrupt("return", _context2.sent);
        case 21:
        case "end":
          return _context2.stop();
      }
    }, _callee2);
  }));
  return _parseDraco.apply(this, arguments);
}
function loadDraco(_x11, _x12, _x13, _x14) {
  return _loadDraco.apply(this, arguments);
}
function _loadDraco() {
  _loadDraco = (0, _asyncToGenerator2.default)(_regenerator.default.mark(function _callee3(tile, dracoData, options, context) {
    var parse, dracoOptions, data, decodedPositions, decodedColors, decodedNormals, decodedBatchIds, isQuantizedDraco, isOctEncodedDraco, quantization, range, batchTableAttributes, _i, _Object$keys, attributeName;
    return _regenerator.default.wrap(function _callee3$(_context3) {
      while (1) switch (_context3.prev = _context3.next) {
        case 0:
          parse = context.parse;
          dracoOptions = _objectSpread(_objectSpread({}, options), {}, {
            draco: _objectSpread(_objectSpread({}, options.draco), {}, {
              extraAttributes: dracoData.batchTableProperties || {}
            })
          });
          delete dracoOptions['3d-tiles'];
          _context3.next = 5;
          return parse(dracoData.buffer, _draco.DracoLoader, dracoOptions);
        case 5:
          data = _context3.sent;
          decodedPositions = data.attributes.POSITION && data.attributes.POSITION.value;
          decodedColors = data.attributes.COLOR_0 && data.attributes.COLOR_0.value;
          decodedNormals = data.attributes.NORMAL && data.attributes.NORMAL.value;
          decodedBatchIds = data.attributes.BATCH_ID && data.attributes.BATCH_ID.value;
          isQuantizedDraco = decodedPositions && data.attributes.POSITION.value.quantization;
          isOctEncodedDraco = decodedNormals && data.attributes.NORMAL.value.quantization;
          if (isQuantizedDraco) {
            quantization = data.POSITION.data.quantization;
            range = quantization.range;
            tile.quantizedVolumeScale = new _core.Vector3(range, range, range);
            tile.quantizedVolumeOffset = new _core.Vector3(quantization.minValues);
            tile.quantizedRange = (1 << quantization.quantizationBits) - 1.0;
            tile.isQuantizedDraco = true;
          }
          if (isOctEncodedDraco) {
            tile.octEncodedRange = (1 << data.NORMAL.data.quantization.quantizationBits) - 1.0;
            tile.isOctEncodedDraco = true;
          }
          batchTableAttributes = {};
          if (dracoData.batchTableProperties) {
            for (_i = 0, _Object$keys = Object.keys(dracoData.batchTableProperties); _i < _Object$keys.length; _i++) {
              attributeName = _Object$keys[_i];
              if (data.attributes[attributeName] && data.attributes[attributeName].value) {
                batchTableAttributes[attributeName.toLowerCase()] = data.attributes[attributeName].value;
              }
            }
          }
          tile.attributes = _objectSpread({
            positions: decodedPositions,
            colors: (0, _normalize3dTileColors.normalize3DTileColorAttribute)(tile, decodedColors, undefined),
            normals: decodedNormals,
            batchIds: decodedBatchIds
          }, batchTableAttributes);
        case 17:
        case "end":
          return _context3.stop();
      }
    }, _callee3);
  }));
  return _loadDraco.apply(this, arguments);
}
//# sourceMappingURL=parse-3d-tile-point-cloud.js.map