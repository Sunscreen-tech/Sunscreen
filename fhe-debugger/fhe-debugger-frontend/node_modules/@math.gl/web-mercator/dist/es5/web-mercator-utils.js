"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

var _typeof = require("@babel/runtime/helpers/typeof");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.zoomToScale = zoomToScale;
exports.scaleToZoom = scaleToZoom;
exports.lngLatToWorld = lngLatToWorld;
exports.worldToLngLat = worldToLngLat;
exports.getMeterZoom = getMeterZoom;
exports.unitsPerMeter = unitsPerMeter;
exports.getDistanceScales = getDistanceScales;
exports.addMetersToLngLat = addMetersToLngLat;
exports.getViewMatrix = getViewMatrix;
exports.getProjectionParameters = getProjectionParameters;
exports.getProjectionMatrix = getProjectionMatrix;
exports.altitudeToFovy = altitudeToFovy;
exports.fovyToAltitude = fovyToAltitude;
exports.worldToPixels = worldToPixels;
exports.pixelsToWorld = pixelsToWorld;
exports.DEFAULT_ALTITUDE = exports.MAX_LATITUDE = void 0;

var _slicedToArray2 = _interopRequireDefault(require("@babel/runtime/helpers/slicedToArray"));

var _mathUtils = require("./math-utils");

var mat4 = _interopRequireWildcard(require("gl-matrix/mat4"));

var vec2 = _interopRequireWildcard(require("gl-matrix/vec2"));

var vec3 = _interopRequireWildcard(require("gl-matrix/vec3"));

var _assert = _interopRequireDefault(require("./assert"));

function _getRequireWildcardCache(nodeInterop) { if (typeof WeakMap !== "function") return null; var cacheBabelInterop = new WeakMap(); var cacheNodeInterop = new WeakMap(); return (_getRequireWildcardCache = function _getRequireWildcardCache(nodeInterop) { return nodeInterop ? cacheNodeInterop : cacheBabelInterop; })(nodeInterop); }

function _interopRequireWildcard(obj, nodeInterop) { if (!nodeInterop && obj && obj.__esModule) { return obj; } if (obj === null || _typeof(obj) !== "object" && typeof obj !== "function") { return { default: obj }; } var cache = _getRequireWildcardCache(nodeInterop); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (key !== "default" && Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj.default = obj; if (cache) { cache.set(obj, newObj); } return newObj; }

var PI = Math.PI;
var PI_4 = PI / 4;
var DEGREES_TO_RADIANS = PI / 180;
var RADIANS_TO_DEGREES = 180 / PI;
var TILE_SIZE = 512;
var EARTH_CIRCUMFERENCE = 40.03e6;
var MAX_LATITUDE = 85.051129;
exports.MAX_LATITUDE = MAX_LATITUDE;
var DEFAULT_ALTITUDE = 1.5;
exports.DEFAULT_ALTITUDE = DEFAULT_ALTITUDE;

function zoomToScale(zoom) {
  return Math.pow(2, zoom);
}

function scaleToZoom(scale) {
  return (0, _mathUtils.log2)(scale);
}

function lngLatToWorld(lngLat) {
  var _lngLat = (0, _slicedToArray2.default)(lngLat, 2),
      lng = _lngLat[0],
      lat = _lngLat[1];

  (0, _assert.default)(Number.isFinite(lng));
  (0, _assert.default)(Number.isFinite(lat) && lat >= -90 && lat <= 90, 'invalid latitude');
  var lambda2 = lng * DEGREES_TO_RADIANS;
  var phi2 = lat * DEGREES_TO_RADIANS;
  var x = TILE_SIZE * (lambda2 + PI) / (2 * PI);
  var y = TILE_SIZE * (PI + Math.log(Math.tan(PI_4 + phi2 * 0.5))) / (2 * PI);
  return [x, y];
}

function worldToLngLat(xy) {
  var _xy = (0, _slicedToArray2.default)(xy, 2),
      x = _xy[0],
      y = _xy[1];

  var lambda2 = x / TILE_SIZE * (2 * PI) - PI;
  var phi2 = 2 * (Math.atan(Math.exp(y / TILE_SIZE * (2 * PI) - PI)) - PI_4);
  return [lambda2 * RADIANS_TO_DEGREES, phi2 * RADIANS_TO_DEGREES];
}

function getMeterZoom(options) {
  var latitude = options.latitude;
  (0, _assert.default)(Number.isFinite(latitude));
  var latCosine = Math.cos(latitude * DEGREES_TO_RADIANS);
  return scaleToZoom(EARTH_CIRCUMFERENCE * latCosine) - 9;
}

function unitsPerMeter(latitude) {
  var latCosine = Math.cos(latitude * DEGREES_TO_RADIANS);
  return TILE_SIZE / EARTH_CIRCUMFERENCE / latCosine;
}

function getDistanceScales(options) {
  var latitude = options.latitude,
      longitude = options.longitude,
      _options$highPrecisio = options.highPrecision,
      highPrecision = _options$highPrecisio === void 0 ? false : _options$highPrecisio;
  (0, _assert.default)(Number.isFinite(latitude) && Number.isFinite(longitude));
  var worldSize = TILE_SIZE;
  var latCosine = Math.cos(latitude * DEGREES_TO_RADIANS);
  var unitsPerDegreeX = worldSize / 360;
  var unitsPerDegreeY = unitsPerDegreeX / latCosine;
  var altUnitsPerMeter = worldSize / EARTH_CIRCUMFERENCE / latCosine;
  var result = {
    unitsPerMeter: [altUnitsPerMeter, altUnitsPerMeter, altUnitsPerMeter],
    metersPerUnit: [1 / altUnitsPerMeter, 1 / altUnitsPerMeter, 1 / altUnitsPerMeter],
    unitsPerDegree: [unitsPerDegreeX, unitsPerDegreeY, altUnitsPerMeter],
    degreesPerUnit: [1 / unitsPerDegreeX, 1 / unitsPerDegreeY, 1 / altUnitsPerMeter]
  };

  if (highPrecision) {
    var latCosine2 = DEGREES_TO_RADIANS * Math.tan(latitude * DEGREES_TO_RADIANS) / latCosine;
    var unitsPerDegreeY2 = unitsPerDegreeX * latCosine2 / 2;
    var altUnitsPerDegree2 = worldSize / EARTH_CIRCUMFERENCE * latCosine2;
    var altUnitsPerMeter2 = altUnitsPerDegree2 / unitsPerDegreeY * altUnitsPerMeter;
    result.unitsPerDegree2 = [0, unitsPerDegreeY2, altUnitsPerDegree2];
    result.unitsPerMeter2 = [altUnitsPerMeter2, 0, altUnitsPerMeter2];
  }

  return result;
}

function addMetersToLngLat(lngLatZ, xyz) {
  var _lngLatZ = (0, _slicedToArray2.default)(lngLatZ, 3),
      longitude = _lngLatZ[0],
      latitude = _lngLatZ[1],
      z0 = _lngLatZ[2];

  var _xyz = (0, _slicedToArray2.default)(xyz, 3),
      x = _xyz[0],
      y = _xyz[1],
      z = _xyz[2];

  var _getDistanceScales = getDistanceScales({
    longitude: longitude,
    latitude: latitude,
    highPrecision: true
  }),
      unitsPerMeter = _getDistanceScales.unitsPerMeter,
      unitsPerMeter2 = _getDistanceScales.unitsPerMeter2;

  var worldspace = lngLatToWorld(lngLatZ);
  worldspace[0] += x * (unitsPerMeter[0] + unitsPerMeter2[0] * y);
  worldspace[1] += y * (unitsPerMeter[1] + unitsPerMeter2[1] * y);
  var newLngLat = worldToLngLat(worldspace);
  var newZ = (z0 || 0) + (z || 0);
  return Number.isFinite(z0) || Number.isFinite(z) ? [newLngLat[0], newLngLat[1], newZ] : newLngLat;
}

function getViewMatrix(options) {
  var height = options.height,
      pitch = options.pitch,
      bearing = options.bearing,
      altitude = options.altitude,
      scale = options.scale,
      center = options.center;
  var vm = (0, _mathUtils.createMat4)();
  mat4.translate(vm, vm, [0, 0, -altitude]);
  mat4.rotateX(vm, vm, -pitch * DEGREES_TO_RADIANS);
  mat4.rotateZ(vm, vm, bearing * DEGREES_TO_RADIANS);
  var relativeScale = scale / height;
  mat4.scale(vm, vm, [relativeScale, relativeScale, relativeScale]);

  if (center) {
    mat4.translate(vm, vm, vec3.negate([], center));
  }

  return vm;
}

function getProjectionParameters(options) {
  var width = options.width,
      height = options.height,
      altitude = options.altitude,
      _options$pitch = options.pitch,
      pitch = _options$pitch === void 0 ? 0 : _options$pitch,
      offset = options.offset,
      center = options.center,
      scale = options.scale,
      _options$nearZMultipl = options.nearZMultiplier,
      nearZMultiplier = _options$nearZMultipl === void 0 ? 1 : _options$nearZMultipl,
      _options$farZMultipli = options.farZMultiplier,
      farZMultiplier = _options$farZMultipli === void 0 ? 1 : _options$farZMultipli;
  var _options$fovy = options.fovy,
      fovy = _options$fovy === void 0 ? altitudeToFovy(DEFAULT_ALTITUDE) : _options$fovy;

  if (altitude !== undefined) {
    fovy = altitudeToFovy(altitude);
  }

  var fovRadians = fovy * DEGREES_TO_RADIANS;
  var pitchRadians = pitch * DEGREES_TO_RADIANS;
  var focalDistance = fovyToAltitude(fovy);
  var cameraToSeaLevelDistance = focalDistance;

  if (center) {
    cameraToSeaLevelDistance += center[2] * scale / Math.cos(pitchRadians) / height;
  }

  var fovAboveCenter = fovRadians * (0.5 + (offset ? offset[1] : 0) / height);
  var topHalfSurfaceDistance = Math.sin(fovAboveCenter) * cameraToSeaLevelDistance / Math.sin((0, _mathUtils.clamp)(Math.PI / 2 - pitchRadians - fovAboveCenter, 0.01, Math.PI - 0.01));
  var furthestDistance = Math.sin(pitchRadians) * topHalfSurfaceDistance + cameraToSeaLevelDistance;
  var horizonDistance = cameraToSeaLevelDistance * 10;
  var farZ = Math.min(furthestDistance * farZMultiplier, horizonDistance);
  return {
    fov: fovRadians,
    aspect: width / height,
    focalDistance: focalDistance,
    near: nearZMultiplier,
    far: farZ
  };
}

function getProjectionMatrix(options) {
  var _getProjectionParamet = getProjectionParameters(options),
      fov = _getProjectionParamet.fov,
      aspect = _getProjectionParamet.aspect,
      near = _getProjectionParamet.near,
      far = _getProjectionParamet.far;

  var projectionMatrix = mat4.perspective([], fov, aspect, near, far);
  return projectionMatrix;
}

function altitudeToFovy(altitude) {
  return 2 * Math.atan(0.5 / altitude) * RADIANS_TO_DEGREES;
}

function fovyToAltitude(fovy) {
  return 0.5 / Math.tan(0.5 * fovy * DEGREES_TO_RADIANS);
}

function worldToPixels(xyz, pixelProjectionMatrix) {
  var _xyz2 = (0, _slicedToArray2.default)(xyz, 3),
      x = _xyz2[0],
      y = _xyz2[1],
      _xyz2$ = _xyz2[2],
      z = _xyz2$ === void 0 ? 0 : _xyz2$;

  (0, _assert.default)(Number.isFinite(x) && Number.isFinite(y) && Number.isFinite(z));
  return (0, _mathUtils.transformVector)(pixelProjectionMatrix, [x, y, z, 1]);
}

function pixelsToWorld(xyz, pixelUnprojectionMatrix) {
  var targetZ = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 0;

  var _xyz3 = (0, _slicedToArray2.default)(xyz, 3),
      x = _xyz3[0],
      y = _xyz3[1],
      z = _xyz3[2];

  (0, _assert.default)(Number.isFinite(x) && Number.isFinite(y), 'invalid pixel coordinate');

  if (Number.isFinite(z)) {
    var coord = (0, _mathUtils.transformVector)(pixelUnprojectionMatrix, [x, y, z, 1]);
    return coord;
  }

  var coord0 = (0, _mathUtils.transformVector)(pixelUnprojectionMatrix, [x, y, 0, 1]);
  var coord1 = (0, _mathUtils.transformVector)(pixelUnprojectionMatrix, [x, y, 1, 1]);
  var z0 = coord0[2];
  var z1 = coord1[2];
  var t = z0 === z1 ? 0 : ((targetZ || 0) - z0) / (z1 - z0);
  return vec2.lerp([], coord0, coord1, t);
}
//# sourceMappingURL=web-mercator-utils.js.map