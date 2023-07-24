"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getZoomFromBoundingVolume = getZoomFromBoundingVolume;
exports.getZoomFromExtent = getZoomFromExtent;
exports.getZoomFromFullExtent = getZoomFromFullExtent;
var _slicedToArray2 = _interopRequireDefault(require("@babel/runtime/helpers/slicedToArray"));
var _core = require("@math.gl/core");
var _culling = require("@math.gl/culling");
var _geospatial = require("@math.gl/geospatial");
var WGS84_RADIUS_X = 6378137.0;
var WGS84_RADIUS_Y = 6378137.0;
var WGS84_RADIUS_Z = 6356752.3142451793;
var scratchVector = new _core.Vector3();
function getZoomFromBoundingVolume(boundingVolume, cartorgraphicCenter) {
  if (boundingVolume instanceof _culling.OrientedBoundingBox) {
    var halfAxes = boundingVolume.halfAxes;
    var obbSize = getObbSize(halfAxes);
    return Math.log2(WGS84_RADIUS_Z / (obbSize + cartorgraphicCenter[2]));
  } else if (boundingVolume instanceof _culling.BoundingSphere) {
    var radius = boundingVolume.radius;
    return Math.log2(WGS84_RADIUS_Z / (radius + cartorgraphicCenter[2]));
  } else if (boundingVolume.width && boundingVolume.height) {
    var width = boundingVolume.width,
      height = boundingVolume.height;
    var zoomX = Math.log2(WGS84_RADIUS_X / width);
    var zoomY = Math.log2(WGS84_RADIUS_Y / height);
    return (zoomX + zoomY) / 2;
  }
  return 1;
}
function getZoomFromFullExtent(fullExtent, cartorgraphicCenter, cartesianCenter) {
  var extentVertex = _geospatial.Ellipsoid.WGS84.cartographicToCartesian([fullExtent.xmax, fullExtent.ymax, fullExtent.zmax], new _core.Vector3());
  var extentSize = Math.sqrt(Math.pow(extentVertex[0] - cartesianCenter[0], 2) + Math.pow(extentVertex[1] - cartesianCenter[1], 2) + Math.pow(extentVertex[2] - cartesianCenter[2], 2));
  return Math.log2(WGS84_RADIUS_Z / (extentSize + cartorgraphicCenter[2]));
}
function getZoomFromExtent(extent, cartorgraphicCenter, cartesianCenter) {
  var _extent = (0, _slicedToArray2.default)(extent, 4),
    xmin = _extent[0],
    ymin = _extent[1],
    xmax = _extent[2],
    ymax = _extent[3];
  return getZoomFromFullExtent({
    xmin: xmin,
    xmax: xmax,
    ymin: ymin,
    ymax: ymax,
    zmin: 0,
    zmax: 0
  }, cartorgraphicCenter, cartesianCenter);
}
function getObbSize(halfAxes) {
  halfAxes.getColumn(0, scratchVector);
  var axeY = halfAxes.getColumn(1);
  var axeZ = halfAxes.getColumn(2);
  var farthestVertex = scratchVector.add(axeY).add(axeZ);
  var size = farthestVertex.len();
  return size;
}
//# sourceMappingURL=zoom.js.map