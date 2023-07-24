"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.calculateDynamicScreenSpaceError = calculateDynamicScreenSpaceError;
exports.fog = fog;
exports.getDynamicScreenSpaceError = getDynamicScreenSpaceError;
exports.getTiles3DScreenSpaceError = getTiles3DScreenSpaceError;
var _core = require("@math.gl/core");
var scratchPositionNormal = new _core.Vector3();
var scratchCartographic = new _core.Vector3();
var scratchMatrix = new _core.Matrix4();
var scratchCenter = new _core.Vector3();
var scratchPosition = new _core.Vector3();
var scratchDirection = new _core.Vector3();
function calculateDynamicScreenSpaceError(root, _ref) {
  var camera = _ref.camera,
    mapProjection = _ref.mapProjection;
  var options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
  var _options$dynamicScree = options.dynamicScreenSpaceErrorHeightFalloff,
    dynamicScreenSpaceErrorHeightFalloff = _options$dynamicScree === void 0 ? 0.25 : _options$dynamicScree,
    _options$dynamicScree2 = options.dynamicScreenSpaceErrorDensity,
    dynamicScreenSpaceErrorDensity = _options$dynamicScree2 === void 0 ? 0.00278 : _options$dynamicScree2;
  var up;
  var direction;
  var height;
  var minimumHeight;
  var maximumHeight;
  var tileBoundingVolume = root.contentBoundingVolume;
  if (tileBoundingVolume instanceof TileBoundingRegion) {
    up = Cartesian3.normalize(camera.positionWC, scratchPositionNormal);
    direction = camera.directionWC;
    height = camera.positionCartographic.height;
    minimumHeight = tileBoundingVolume.minimumHeight;
    maximumHeight = tileBoundingVolume.maximumHeight;
  } else {
    var transformLocal = _core.Matrix4.inverseTransformation(root.computedTransform, scratchMatrix);
    var ellipsoid = mapProjection.ellipsoid;
    var boundingVolume = tileBoundingVolume.boundingVolume;
    var centerLocal = _core.Matrix4.multiplyByPoint(transformLocal, boundingVolume.center, scratchCenter);
    if (Cartesian3.magnitude(centerLocal) > ellipsoid.minimumRadius) {
      var centerCartographic = Cartographic.fromCartesian(centerLocal, ellipsoid, scratchCartographic);
      up = Cartesian3.normalize(camera.positionWC, scratchPositionNormal);
      direction = camera.directionWC;
      height = camera.positionCartographic.height;
      minimumHeight = 0.0;
      maximumHeight = centerCartographic.height * 2.0;
    } else {
      var positionLocal = _core.Matrix4.multiplyByPoint(transformLocal, camera.positionWC, scratchPosition);
      up = Cartesian3.UNIT_Z;
      direction = _core.Matrix4.multiplyByPointAsVector(transformLocal, camera.directionWC, scratchDirection);
      direction = Cartesian3.normalize(direction, direction);
      height = positionLocal.z;
      if (tileBoundingVolume instanceof TileOrientedBoundingBox) {
        var boxHeight = root._header.boundingVolume.box[11];
        minimumHeight = centerLocal.z - boxHeight;
        maximumHeight = centerLocal.z + boxHeight;
      } else if (tileBoundingVolume instanceof TileBoundingSphere) {
        var radius = boundingVolume.radius;
        minimumHeight = centerLocal.z - radius;
        maximumHeight = centerLocal.z + radius;
      }
    }
  }
  var heightFalloff = dynamicScreenSpaceErrorHeightFalloff;
  var heightClose = minimumHeight + (maximumHeight - minimumHeight) * heightFalloff;
  var heightFar = maximumHeight;
  var t = (0, _core.clamp)((height - heightClose) / (heightFar - heightClose), 0.0, 1.0);
  var dot = Math.abs(Cartesian3.dot(direction, up));
  var horizonFactor = 1.0 - dot;
  horizonFactor = horizonFactor * (1.0 - t);
  return dynamicScreenSpaceErrorDensity * horizonFactor;
}
function fog(distanceToCamera, density) {
  var scalar = distanceToCamera * density;
  return 1.0 - Math.exp(-(scalar * scalar));
}
function getDynamicScreenSpaceError(tileset, distanceToCamera) {
  if (tileset.dynamicScreenSpaceError && tileset.dynamicScreenSpaceErrorComputedDensity) {
    var density = tileset.dynamicScreenSpaceErrorComputedDensity;
    var factor = tileset.dynamicScreenSpaceErrorFactor;
    var dynamicError = fog(distanceToCamera, density) * factor;
    return dynamicError;
  }
  return 0;
}
function getTiles3DScreenSpaceError(tile, frameState, useParentLodMetric) {
  var tileset = tile.tileset;
  var parentLodMetricValue = tile.parent && tile.parent.lodMetricValue || tile.lodMetricValue;
  var lodMetricValue = useParentLodMetric ? parentLodMetricValue : tile.lodMetricValue;
  if (lodMetricValue === 0.0) {
    return 0.0;
  }
  var distance = Math.max(tile._distanceToCamera, 1e-7);
  var height = frameState.height,
    sseDenominator = frameState.sseDenominator;
  var viewDistanceScale = tileset.options.viewDistanceScale;
  var error = lodMetricValue * height * (viewDistanceScale || 1.0) / (distance * sseDenominator);
  error -= getDynamicScreenSpaceError(tileset, distance);
  return error;
}
//# sourceMappingURL=tiles-3d-lod.js.map