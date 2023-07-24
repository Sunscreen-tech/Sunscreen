"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getLodStatus = getLodStatus;
exports.getProjectedRadius = getProjectedRadius;
var _toConsumableArray2 = _interopRequireDefault(require("@babel/runtime/helpers/toConsumableArray"));
var _core = require("@math.gl/core");
var _geospatial = require("@math.gl/geospatial");
var cameraPositionCartesian = new _core.Vector3();
var toEye = new _core.Vector3();
var cameraPositionEnu = new _core.Vector3();
var extraVertexEnu = new _core.Vector3();
var projectedOriginVector = new _core.Vector3();
var enuToCartesianMatrix = new _core.Matrix4();
var cartesianToEnuMatrix = new _core.Matrix4();
function getLodStatus(tile, frameState) {
  if (tile.lodMetricValue === 0 || isNaN(tile.lodMetricValue)) {
    return 'DIG';
  }
  var screenSize = 2 * getProjectedRadius(tile, frameState);
  if (screenSize < 2) {
    return 'OUT';
  }
  if (!tile.header.children || screenSize <= tile.lodMetricValue) {
    return 'DRAW';
  } else if (tile.header.children) {
    return 'DIG';
  }
  return 'OUT';
}
function getProjectedRadius(tile, frameState) {
  var viewport = frameState.topDownViewport;
  var mbsLat = tile.header.mbs[1];
  var mbsLon = tile.header.mbs[0];
  var mbsZ = tile.header.mbs[2];
  var mbsR = tile.header.mbs[3];
  var mbsCenterCartesian = (0, _toConsumableArray2.default)(tile.boundingVolume.center);
  var cameraPositionCartographic = viewport.unprojectPosition(viewport.cameraPosition);
  _geospatial.Ellipsoid.WGS84.cartographicToCartesian(cameraPositionCartographic, cameraPositionCartesian);
  toEye.copy(cameraPositionCartesian).subtract(mbsCenterCartesian).normalize();
  _geospatial.Ellipsoid.WGS84.eastNorthUpToFixedFrame(mbsCenterCartesian, enuToCartesianMatrix);
  cartesianToEnuMatrix.copy(enuToCartesianMatrix).invert();
  cameraPositionEnu.copy(cameraPositionCartesian).transform(cartesianToEnuMatrix);
  var projection = Math.sqrt(cameraPositionEnu[0] * cameraPositionEnu[0] + cameraPositionEnu[1] * cameraPositionEnu[1]);
  var extraZ = projection * projection / cameraPositionEnu[2];
  extraVertexEnu.copy([cameraPositionEnu[0], cameraPositionEnu[1], extraZ]);
  var extraVertexCartesian = extraVertexEnu.transform(enuToCartesianMatrix);
  var extraVectorCartesian = extraVertexCartesian.subtract(mbsCenterCartesian).normalize();
  var radiusVector = toEye.cross(extraVectorCartesian).normalize().scale(mbsR);
  var sphereMbsBorderVertexCartesian = radiusVector.add(mbsCenterCartesian);
  var sphereMbsBorderVertexCartographic = _geospatial.Ellipsoid.WGS84.cartesianToCartographic(sphereMbsBorderVertexCartesian);
  var projectedOrigin = viewport.project([mbsLon, mbsLat, mbsZ]);
  var projectedMbsBorderVertex = viewport.project(sphereMbsBorderVertexCartographic);
  var projectedRadius = projectedOriginVector.copy(projectedOrigin).subtract(projectedMbsBorderVertex).magnitude();
  return projectedRadius;
}
//# sourceMappingURL=i3s-lod.js.map