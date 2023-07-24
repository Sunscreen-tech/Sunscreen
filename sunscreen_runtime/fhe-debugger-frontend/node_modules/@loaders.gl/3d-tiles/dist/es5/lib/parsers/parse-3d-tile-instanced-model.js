"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.parseInstancedModel3DTile = parseInstancedModel3DTile;
var _regenerator = _interopRequireDefault(require("@babel/runtime/regenerator"));
var _asyncToGenerator2 = _interopRequireDefault(require("@babel/runtime/helpers/asyncToGenerator"));
var _core = require("@math.gl/core");
var _geospatial = require("@math.gl/geospatial");
var _math = require("@loaders.gl/math");
var _tile3dFeatureTable = _interopRequireDefault(require("../classes/tile-3d-feature-table"));
var _tile3dBatchTable = _interopRequireDefault(require("../classes/tile-3d-batch-table"));
var _parse3dTileHeader = require("./helpers/parse-3d-tile-header");
var _parse3dTileTables = require("./helpers/parse-3d-tile-tables");
var _parse3dTileGltfView = require("./helpers/parse-3d-tile-gltf-view");
function parseInstancedModel3DTile(_x, _x2, _x3, _x4, _x5) {
  return _parseInstancedModel3DTile.apply(this, arguments);
}
function _parseInstancedModel3DTile() {
  _parseInstancedModel3DTile = (0, _asyncToGenerator2.default)(_regenerator.default.mark(function _callee(tile, arrayBuffer, byteOffset, options, context) {
    return _regenerator.default.wrap(function _callee$(_context) {
      while (1) switch (_context.prev = _context.next) {
        case 0:
          byteOffset = parseInstancedModel(tile, arrayBuffer, byteOffset, options, context);
          _context.next = 3;
          return (0, _parse3dTileGltfView.extractGLTF)(tile, tile.gltfFormat, options, context);
        case 3:
          return _context.abrupt("return", byteOffset);
        case 4:
        case "end":
          return _context.stop();
      }
    }, _callee);
  }));
  return _parseInstancedModel3DTile.apply(this, arguments);
}
function parseInstancedModel(tile, arrayBuffer, byteOffset, options, context) {
  byteOffset = (0, _parse3dTileHeader.parse3DTileHeaderSync)(tile, arrayBuffer, byteOffset);
  if (tile.version !== 1) {
    throw new Error("Instanced 3D Model version ".concat(tile.version, " is not supported"));
  }
  byteOffset = (0, _parse3dTileTables.parse3DTileTablesHeaderSync)(tile, arrayBuffer, byteOffset);
  var view = new DataView(arrayBuffer);
  tile.gltfFormat = view.getUint32(byteOffset, true);
  byteOffset += 4;
  byteOffset = (0, _parse3dTileTables.parse3DTileTablesSync)(tile, arrayBuffer, byteOffset, options);
  byteOffset = (0, _parse3dTileGltfView.parse3DTileGLTFViewSync)(tile, arrayBuffer, byteOffset, options);
  if (tile.featureTableJsonByteLength === 0) {
    throw new Error('i3dm parser: featureTableJsonByteLength is zero.');
  }
  var featureTable = new _tile3dFeatureTable.default(tile.featureTableJson, tile.featureTableBinary);
  var instancesLength = featureTable.getGlobalProperty('INSTANCES_LENGTH');
  featureTable.featuresLength = instancesLength;
  if (!Number.isFinite(instancesLength)) {
    throw new Error('i3dm parser: INSTANCES_LENGTH must be defined');
  }
  tile.eastNorthUp = featureTable.getGlobalProperty('EAST_NORTH_UP');
  tile.rtcCenter = featureTable.getGlobalProperty('RTC_CENTER', _math.GL.FLOAT, 3);
  var batchTable = new _tile3dBatchTable.default(tile.batchTableJson, tile.batchTableBinary, instancesLength);
  extractInstancedAttributes(tile, featureTable, batchTable, instancesLength);
  return byteOffset;
}
function extractInstancedAttributes(tile, featureTable, batchTable, instancesLength) {
  var collectionOptions = {
    instances: new Array(instancesLength),
    batchTable: tile._batchTable,
    cull: false,
    url: undefined,
    gltf: undefined,
    basePath: undefined,
    incrementallyLoadTextures: false,
    forwardAxis: [1, 0, 0]
  };
  var instances = collectionOptions.instances;
  var instancePosition = new _core.Vector3();
  var instanceNormalRight = new _core.Vector3();
  var instanceNormalUp = new _core.Vector3();
  var instanceNormalForward = new _core.Vector3();
  var instanceRotation = new _core.Matrix3();
  var instanceQuaternion = new _core.Quaternion();
  var instanceScale = new _core.Vector3();
  var instanceTranslationRotationScale = {};
  var instanceTransform = new _core.Matrix4();
  var scratch1 = [];
  var scratch2 = [];
  var scratchVector1 = new _core.Vector3();
  var scratchVector2 = new _core.Vector3();
  for (var i = 0; i < instancesLength; i++) {
    var position = void 0;
    if (featureTable.hasProperty('POSITION')) {
      position = featureTable.getProperty('POSITION', _math.GL.FLOAT, 3, i, instancePosition);
    } else if (featureTable.hasProperty('POSITION_QUANTIZED')) {
      position = featureTable.getProperty('POSITION_QUANTIZED', _math.GL.UNSIGNED_SHORT, 3, i, instancePosition);
      var quantizedVolumeOffset = featureTable.getGlobalProperty('QUANTIZED_VOLUME_OFFSET', _math.GL.FLOAT, 3, scratchVector1);
      if (!quantizedVolumeOffset) {
        throw new Error('i3dm parser: QUANTIZED_VOLUME_OFFSET must be defined for quantized positions.');
      }
      var quantizedVolumeScale = featureTable.getGlobalProperty('QUANTIZED_VOLUME_SCALE', _math.GL.FLOAT, 3, scratchVector2);
      if (!quantizedVolumeScale) {
        throw new Error('i3dm parser: QUANTIZED_VOLUME_SCALE must be defined for quantized positions.');
      }
      var MAX_UNSIGNED_SHORT = 65535.0;
      for (var j = 0; j < 3; j++) {
        position[j] = position[j] / MAX_UNSIGNED_SHORT * quantizedVolumeScale[j] + quantizedVolumeOffset[j];
      }
    }
    if (!position) {
      throw new Error('i3dm: POSITION or POSITION_QUANTIZED must be defined for each instance.');
    }
    instancePosition.copy(position);
    instanceTranslationRotationScale.translation = instancePosition;
    tile.normalUp = featureTable.getProperty('NORMAL_UP', _math.GL.FLOAT, 3, i, scratch1);
    tile.normalRight = featureTable.getProperty('NORMAL_RIGHT', _math.GL.FLOAT, 3, i, scratch2);
    var hasCustomOrientation = false;
    if (tile.normalUp) {
      if (!tile.normalRight) {
        throw new Error('i3dm: Custom orientation requires both NORMAL_UP and NORMAL_RIGHT.');
      }
      tile.hasCustomOrientation = true;
    } else {
      tile.octNormalUp = featureTable.getProperty('NORMAL_UP_OCT32P', _math.GL.UNSIGNED_SHORT, 2, scratch1);
      tile.octNormalRight = featureTable.getProperty('NORMAL_RIGHT_OCT32P', _math.GL.UNSIGNED_SHORT, 2, scratch2);
      if (tile.octNormalUp) {
        if (!tile.octNormalRight) {
          throw new Error('i3dm: oct-encoded orientation requires NORMAL_UP_OCT32P and NORMAL_RIGHT_OCT32P');
        }
        throw new Error('i3dm: oct-encoded orientation not implemented');
      } else if (tile.eastNorthUp) {
        _geospatial.Ellipsoid.WGS84.eastNorthUpToFixedFrame(instancePosition, instanceTransform);
        instanceTransform.getRotationMatrix3(instanceRotation);
      } else {
        instanceRotation.identity();
      }
    }
    if (hasCustomOrientation) {
      instanceNormalForward.copy(instanceNormalRight).cross(instanceNormalUp).normalize();
      instanceRotation.setColumn(0, instanceNormalRight);
      instanceRotation.setColumn(1, instanceNormalUp);
      instanceRotation.setColumn(2, instanceNormalForward);
    }
    instanceQuaternion.fromMatrix3(instanceRotation);
    instanceTranslationRotationScale.rotation = instanceQuaternion;
    instanceScale.set(1.0, 1.0, 1.0);
    var scale = featureTable.getProperty('SCALE', _math.GL.FLOAT, 1, i);
    if (Number.isFinite(scale)) {
      instanceScale.multiplyByScalar(scale);
    }
    var nonUniformScale = featureTable.getProperty('SCALE_NON_UNIFORM', _math.GL.FLOAT, 3, i, scratch1);
    if (nonUniformScale) {
      instanceScale.scale(nonUniformScale);
    }
    instanceTranslationRotationScale.scale = instanceScale;
    var batchId = featureTable.getProperty('BATCH_ID', _math.GL.UNSIGNED_SHORT, 1, i);
    if (batchId === undefined) {
      batchId = i;
    }
    var rotationMatrix = new _core.Matrix4().fromQuaternion(instanceTranslationRotationScale.rotation);
    instanceTransform.identity();
    instanceTransform.translate(instanceTranslationRotationScale.translation);
    instanceTransform.multiplyRight(rotationMatrix);
    instanceTransform.scale(instanceTranslationRotationScale.scale);
    var modelMatrix = instanceTransform.clone();
    instances[i] = {
      modelMatrix: modelMatrix,
      batchId: batchId
    };
  }
  tile.instances = instances;
}
//# sourceMappingURL=parse-3d-tile-instanced-model.js.map