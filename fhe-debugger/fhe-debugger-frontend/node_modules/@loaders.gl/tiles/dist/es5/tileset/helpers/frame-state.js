"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getFrameState = getFrameState;
exports.limitSelectedTiles = limitSelectedTiles;
var _slicedToArray2 = _interopRequireDefault(require("@babel/runtime/helpers/slicedToArray"));
var _core = require("@math.gl/core");
var _culling = require("@math.gl/culling");
var _geospatial = require("@math.gl/geospatial");
function _createForOfIteratorHelper(o, allowArrayLike) { var it = typeof Symbol !== "undefined" && o[Symbol.iterator] || o["@@iterator"]; if (!it) { if (Array.isArray(o) || (it = _unsupportedIterableToArray(o)) || allowArrayLike && o && typeof o.length === "number") { if (it) o = it; var i = 0; var F = function F() {}; return { s: F, n: function n() { if (i >= o.length) return { done: true }; return { done: false, value: o[i++] }; }, e: function e(_e) { throw _e; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var normalCompletion = true, didErr = false, err; return { s: function s() { it = it.call(o); }, n: function n() { var step = it.next(); normalCompletion = step.done; return step; }, e: function e(_e2) { didErr = true; err = _e2; }, f: function f() { try { if (!normalCompletion && it.return != null) it.return(); } finally { if (didErr) throw err; } } }; }
function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }
function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) arr2[i] = arr[i]; return arr2; }
var scratchVector = new _core.Vector3();
var scratchPosition = new _core.Vector3();
var cullingVolume = new _culling.CullingVolume([new _culling.Plane(), new _culling.Plane(), new _culling.Plane(), new _culling.Plane(), new _culling.Plane(), new _culling.Plane()]);
function getFrameState(viewport, frameNumber) {
  var cameraDirection = viewport.cameraDirection,
    cameraUp = viewport.cameraUp,
    height = viewport.height;
  var metersPerUnit = viewport.distanceScales.metersPerUnit;
  var viewportCenterCartesian = worldToCartesian(viewport, viewport.center);
  var enuToFixedTransform = _geospatial.Ellipsoid.WGS84.eastNorthUpToFixedFrame(viewportCenterCartesian);
  var cameraPositionCartographic = viewport.unprojectPosition(viewport.cameraPosition);
  var cameraPositionCartesian = _geospatial.Ellipsoid.WGS84.cartographicToCartesian(cameraPositionCartographic, new _core.Vector3());
  var cameraDirectionCartesian = new _core.Vector3(enuToFixedTransform.transformAsVector(new _core.Vector3(cameraDirection).scale(metersPerUnit))).normalize();
  var cameraUpCartesian = new _core.Vector3(enuToFixedTransform.transformAsVector(new _core.Vector3(cameraUp).scale(metersPerUnit))).normalize();
  commonSpacePlanesToWGS84(viewport);
  var ViewportClass = viewport.constructor;
  var longitude = viewport.longitude,
    latitude = viewport.latitude,
    width = viewport.width,
    bearing = viewport.bearing,
    zoom = viewport.zoom;
  var topDownViewport = new ViewportClass({
    longitude: longitude,
    latitude: latitude,
    height: height,
    width: width,
    bearing: bearing,
    zoom: zoom,
    pitch: 0
  });
  return {
    camera: {
      position: cameraPositionCartesian,
      direction: cameraDirectionCartesian,
      up: cameraUpCartesian
    },
    viewport: viewport,
    topDownViewport: topDownViewport,
    height: height,
    cullingVolume: cullingVolume,
    frameNumber: frameNumber,
    sseDenominator: 1.15
  };
}
function limitSelectedTiles(tiles, frameState, maximumTilesSelected) {
  if (maximumTilesSelected === 0 || tiles.length <= maximumTilesSelected) {
    return [tiles, []];
  }
  var tuples = [];
  var _frameState$viewport = frameState.viewport,
    viewportLongitude = _frameState$viewport.longitude,
    viewportLatitude = _frameState$viewport.latitude;
  var _iterator = _createForOfIteratorHelper(tiles.entries()),
    _step;
  try {
    for (_iterator.s(); !(_step = _iterator.n()).done;) {
      var _step$value = (0, _slicedToArray2.default)(_step.value, 2),
        index = _step$value[0],
        tile = _step$value[1];
      var _tile$header$mbs = (0, _slicedToArray2.default)(tile.header.mbs, 2),
        longitude = _tile$header$mbs[0],
        latitude = _tile$header$mbs[1];
      var deltaLon = Math.abs(viewportLongitude - longitude);
      var deltaLat = Math.abs(viewportLatitude - latitude);
      var distance = Math.sqrt(deltaLat * deltaLat + deltaLon * deltaLon);
      tuples.push([index, distance]);
    }
  } catch (err) {
    _iterator.e(err);
  } finally {
    _iterator.f();
  }
  var tuplesSorted = tuples.sort(function (a, b) {
    return a[1] - b[1];
  });
  var selectedTiles = [];
  for (var i = 0; i < maximumTilesSelected; i++) {
    selectedTiles.push(tiles[tuplesSorted[i][0]]);
  }
  var unselectedTiles = [];
  for (var _i = maximumTilesSelected; _i < tuplesSorted.length; _i++) {
    unselectedTiles.push(tiles[tuplesSorted[_i][0]]);
  }
  return [selectedTiles, unselectedTiles];
}
function commonSpacePlanesToWGS84(viewport) {
  var frustumPlanes = viewport.getFrustumPlanes();
  var nearCenterCommon = closestPointOnPlane(frustumPlanes.near, viewport.cameraPosition);
  var nearCenterCartesian = worldToCartesian(viewport, nearCenterCommon);
  var cameraCartesian = worldToCartesian(viewport, viewport.cameraPosition, scratchPosition);
  var i = 0;
  cullingVolume.planes[i++].fromPointNormal(nearCenterCartesian, scratchVector.copy(nearCenterCartesian).subtract(cameraCartesian));
  for (var dir in frustumPlanes) {
    if (dir === 'near') {
      continue;
    }
    var plane = frustumPlanes[dir];
    var posCommon = closestPointOnPlane(plane, nearCenterCommon, scratchPosition);
    var cartesianPos = worldToCartesian(viewport, posCommon, scratchPosition);
    cullingVolume.planes[i++].fromPointNormal(cartesianPos, scratchVector.copy(nearCenterCartesian).subtract(cartesianPos));
  }
}
function closestPointOnPlane(plane, refPoint) {
  var out = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : new _core.Vector3();
  var distanceToRef = plane.normal.dot(refPoint);
  out.copy(plane.normal).scale(plane.distance - distanceToRef).add(refPoint);
  return out;
}
function worldToCartesian(viewport, point) {
  var out = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : new _core.Vector3();
  var cartographicPos = viewport.unprojectPosition(point);
  return _geospatial.Ellipsoid.WGS84.cartographicToCartesian(cartographicPos, out);
}
//# sourceMappingURL=frame-state.js.map