"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.convertS2BoundingVolumetoOBB = convertS2BoundingVolumetoOBB;
var _toConsumableArray2 = _interopRequireDefault(require("@babel/runtime/helpers/toConsumableArray"));
var _core = require("@math.gl/core");
var _culling = require("@math.gl/culling");
var _index = require("../../utils/s2/index");
var _geospatial = require("@math.gl/geospatial");
function convertS2BoundingVolumetoOBB(s2VolumeInfo) {
  var token = s2VolumeInfo.token;
  var heightInfo = {
    minimumHeight: s2VolumeInfo.minimumHeight,
    maximumHeight: s2VolumeInfo.maximumHeight
  };
  var corners = (0, _index.getS2OrientedBoundingBoxCornerPoints)(token, heightInfo);
  var center = (0, _index.getS2LngLat)(token);
  var centerLng = center[0];
  var centerLat = center[1];
  var point = _geospatial.Ellipsoid.WGS84.cartographicToCartesian([centerLng, centerLat, heightInfo.maximumHeight]);
  var centerPointAdditional = new _core.Vector3(point[0], point[1], point[2]);
  corners.push(centerPointAdditional);
  var obb = (0, _culling.makeOrientedBoundingBoxFromPoints)(corners);
  var box = [].concat((0, _toConsumableArray2.default)(obb.center), (0, _toConsumableArray2.default)(obb.halfAxes));
  return box;
}
//# sourceMappingURL=s2-corners-to-obb.js.map