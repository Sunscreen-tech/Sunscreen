"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.createBoundingVolume = createBoundingVolume;
exports.getCartographicBounds = getCartographicBounds;
var _toConsumableArray2 = _interopRequireDefault(require("@babel/runtime/helpers/toConsumableArray"));
var _slicedToArray2 = _interopRequireDefault(require("@babel/runtime/helpers/slicedToArray"));
var _core = require("@math.gl/core");
var _culling = require("@math.gl/culling");
var _geospatial = require("@math.gl/geospatial");
var _loaderUtils = require("@loaders.gl/loader-utils");
function defined(x) {
  return x !== undefined && x !== null;
}
var scratchPoint = new _core.Vector3();
var scratchScale = new _core.Vector3();
var scratchNorthWest = new _core.Vector3();
var scratchSouthEast = new _core.Vector3();
function createBoundingVolume(boundingVolumeHeader, transform, result) {
  (0, _loaderUtils.assert)(boundingVolumeHeader, '3D Tile: boundingVolume must be defined');
  if (boundingVolumeHeader.box) {
    return createBox(boundingVolumeHeader.box, transform, result);
  }
  if (boundingVolumeHeader.region) {
    var _boundingVolumeHeader = (0, _slicedToArray2.default)(boundingVolumeHeader.region, 6),
      west = _boundingVolumeHeader[0],
      south = _boundingVolumeHeader[1],
      east = _boundingVolumeHeader[2],
      north = _boundingVolumeHeader[3],
      minHeight = _boundingVolumeHeader[4],
      maxHeight = _boundingVolumeHeader[5];
    var northWest = _geospatial.Ellipsoid.WGS84.cartographicToCartesian([(0, _core.degrees)(west), (0, _core.degrees)(north), minHeight], scratchNorthWest);
    var southEast = _geospatial.Ellipsoid.WGS84.cartographicToCartesian([(0, _core.degrees)(east), (0, _core.degrees)(south), maxHeight], scratchSouthEast);
    var centerInCartesian = new _core.Vector3().addVectors(northWest, southEast).multiplyScalar(0.5);
    var radius = new _core.Vector3().subVectors(northWest, southEast).len() / 2.0;
    return createSphere([centerInCartesian[0], centerInCartesian[1], centerInCartesian[2], radius], new _core.Matrix4());
  }
  if (boundingVolumeHeader.sphere) {
    return createSphere(boundingVolumeHeader.sphere, transform, result);
  }
  throw new Error('3D Tile: boundingVolume must contain a sphere, region, or box');
}
function getCartographicBounds(boundingVolumeHeader, boundingVolume) {
  if (boundingVolumeHeader.box) {
    return orientedBoundingBoxToCartographicBounds(boundingVolume);
  }
  if (boundingVolumeHeader.region) {
    var _boundingVolumeHeader2 = (0, _slicedToArray2.default)(boundingVolumeHeader.region, 6),
      west = _boundingVolumeHeader2[0],
      south = _boundingVolumeHeader2[1],
      east = _boundingVolumeHeader2[2],
      north = _boundingVolumeHeader2[3],
      minHeight = _boundingVolumeHeader2[4],
      maxHeight = _boundingVolumeHeader2[5];
    return [[(0, _core.degrees)(west), (0, _core.degrees)(south), minHeight], [(0, _core.degrees)(east), (0, _core.degrees)(north), maxHeight]];
  }
  if (boundingVolumeHeader.sphere) {
    return boundingSphereToCartographicBounds(boundingVolume);
  }
  throw new Error('Unkown boundingVolume type');
}
function createBox(box, transform, result) {
  var center = new _core.Vector3(box[0], box[1], box[2]);
  transform.transform(center, center);
  var origin = [];
  if (box.length === 10) {
    var halfSize = box.slice(3, 6);
    var quaternion = new _core.Quaternion();
    quaternion.fromArray(box, 6);
    var x = new _core.Vector3([1, 0, 0]);
    var y = new _core.Vector3([0, 1, 0]);
    var z = new _core.Vector3([0, 0, 1]);
    x.transformByQuaternion(quaternion);
    x.scale(halfSize[0]);
    y.transformByQuaternion(quaternion);
    y.scale(halfSize[1]);
    z.transformByQuaternion(quaternion);
    z.scale(halfSize[2]);
    origin = [].concat((0, _toConsumableArray2.default)(x.toArray()), (0, _toConsumableArray2.default)(y.toArray()), (0, _toConsumableArray2.default)(z.toArray()));
  } else {
    origin = [].concat((0, _toConsumableArray2.default)(box.slice(3, 6)), (0, _toConsumableArray2.default)(box.slice(6, 9)), (0, _toConsumableArray2.default)(box.slice(9, 12)));
  }
  var xAxis = transform.transformAsVector(origin.slice(0, 3));
  var yAxis = transform.transformAsVector(origin.slice(3, 6));
  var zAxis = transform.transformAsVector(origin.slice(6, 9));
  var halfAxes = new _core.Matrix3([xAxis[0], xAxis[1], xAxis[2], yAxis[0], yAxis[1], yAxis[2], zAxis[0], zAxis[1], zAxis[2]]);
  if (defined(result)) {
    result.center = center;
    result.halfAxes = halfAxes;
    return result;
  }
  return new _culling.OrientedBoundingBox(center, halfAxes);
}
function createSphere(sphere, transform, result) {
  var center = new _core.Vector3(sphere[0], sphere[1], sphere[2]);
  transform.transform(center, center);
  var scale = transform.getScale(scratchScale);
  var uniformScale = Math.max(Math.max(scale[0], scale[1]), scale[2]);
  var radius = sphere[3] * uniformScale;
  if (defined(result)) {
    result.center = center;
    result.radius = radius;
    return result;
  }
  return new _culling.BoundingSphere(center, radius);
}
function orientedBoundingBoxToCartographicBounds(boundingVolume) {
  var result = emptyCartographicBounds();
  var _ref = boundingVolume,
    halfAxes = _ref.halfAxes;
  var xAxis = new _core.Vector3(halfAxes.getColumn(0));
  var yAxis = new _core.Vector3(halfAxes.getColumn(1));
  var zAxis = new _core.Vector3(halfAxes.getColumn(2));
  for (var x = 0; x < 2; x++) {
    for (var y = 0; y < 2; y++) {
      for (var z = 0; z < 2; z++) {
        scratchPoint.copy(boundingVolume.center);
        scratchPoint.add(xAxis);
        scratchPoint.add(yAxis);
        scratchPoint.add(zAxis);
        addToCartographicBounds(result, scratchPoint);
        zAxis.negate();
      }
      yAxis.negate();
    }
    xAxis.negate();
  }
  return result;
}
function boundingSphereToCartographicBounds(boundingVolume) {
  var result = emptyCartographicBounds();
  var _ref2 = boundingVolume,
    center = _ref2.center,
    radius = _ref2.radius;
  var point = _geospatial.Ellipsoid.WGS84.scaleToGeodeticSurface(center, scratchPoint);
  var zAxis;
  if (point) {
    zAxis = _geospatial.Ellipsoid.WGS84.geodeticSurfaceNormal(point);
  } else {
    zAxis = new _core.Vector3(0, 0, 1);
  }
  var xAxis = new _core.Vector3(zAxis[2], -zAxis[1], 0);
  if (xAxis.len() > 0) {
    xAxis.normalize();
  } else {
    xAxis = new _core.Vector3(0, 1, 0);
  }
  var yAxis = xAxis.clone().cross(zAxis);
  for (var _i = 0, _arr = [xAxis, yAxis, zAxis]; _i < _arr.length; _i++) {
    var axis = _arr[_i];
    scratchScale.copy(axis).scale(radius);
    for (var dir = 0; dir < 2; dir++) {
      scratchPoint.copy(center);
      scratchPoint.add(scratchScale);
      addToCartographicBounds(result, scratchPoint);
      scratchScale.negate();
    }
  }
  return result;
}
function emptyCartographicBounds() {
  return [[Infinity, Infinity, Infinity], [-Infinity, -Infinity, -Infinity]];
}
function addToCartographicBounds(target, cartesian) {
  _geospatial.Ellipsoid.WGS84.cartesianToCartographic(cartesian, scratchPoint);
  target[0][0] = Math.min(target[0][0], scratchPoint[0]);
  target[0][1] = Math.min(target[0][1], scratchPoint[1]);
  target[0][2] = Math.min(target[0][2], scratchPoint[2]);
  target[1][0] = Math.max(target[1][0], scratchPoint[0]);
  target[1][1] = Math.max(target[1][1], scratchPoint[1]);
  target[1][2] = Math.max(target[1][2], scratchPoint[2]);
}
//# sourceMappingURL=bounding-volume.js.map