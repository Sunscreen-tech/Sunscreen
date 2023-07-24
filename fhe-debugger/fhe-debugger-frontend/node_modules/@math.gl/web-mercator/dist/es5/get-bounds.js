"use strict";

var _typeof = require("@babel/runtime/helpers/typeof");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = getBounds;

var _webMercatorUtils = require("./web-mercator-utils");

var vec2 = _interopRequireWildcard(require("gl-matrix/vec2"));

var _mathUtils = require("./math-utils");

function _getRequireWildcardCache(nodeInterop) { if (typeof WeakMap !== "function") return null; var cacheBabelInterop = new WeakMap(); var cacheNodeInterop = new WeakMap(); return (_getRequireWildcardCache = function _getRequireWildcardCache(nodeInterop) { return nodeInterop ? cacheNodeInterop : cacheBabelInterop; })(nodeInterop); }

function _interopRequireWildcard(obj, nodeInterop) { if (!nodeInterop && obj && obj.__esModule) { return obj; } if (obj === null || _typeof(obj) !== "object" && typeof obj !== "function") { return { default: obj }; } var cache = _getRequireWildcardCache(nodeInterop); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (key !== "default" && Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj.default = obj; if (cache) { cache.set(obj, newObj); } return newObj; }

var DEGREES_TO_RADIANS = Math.PI / 180;

function getBounds(viewport) {
  var z = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 0;
  var width = viewport.width,
      height = viewport.height,
      unproject = viewport.unproject;
  var unprojectOps = {
    targetZ: z
  };
  var bottomLeft = unproject([0, height], unprojectOps);
  var bottomRight = unproject([width, height], unprojectOps);
  var topLeft;
  var topRight;
  var halfFov = viewport.fovy ? 0.5 * viewport.fovy * DEGREES_TO_RADIANS : Math.atan(0.5 / viewport.altitude);
  var angleToGround = (90 - viewport.pitch) * DEGREES_TO_RADIANS;

  if (halfFov > angleToGround - 0.01) {
    topLeft = unprojectOnFarPlane(viewport, 0, z);
    topRight = unprojectOnFarPlane(viewport, width, z);
  } else {
    topLeft = unproject([0, 0], unprojectOps);
    topRight = unproject([width, 0], unprojectOps);
  }

  return [bottomLeft, bottomRight, topRight, topLeft];
}

function unprojectOnFarPlane(viewport, x, targetZ) {
  var pixelUnprojectionMatrix = viewport.pixelUnprojectionMatrix;
  var coord0 = (0, _mathUtils.transformVector)(pixelUnprojectionMatrix, [x, 0, 1, 1]);
  var coord1 = (0, _mathUtils.transformVector)(pixelUnprojectionMatrix, [x, viewport.height, 1, 1]);
  var z = targetZ * viewport.distanceScales.unitsPerMeter[2];
  var t = (z - coord0[2]) / (coord1[2] - coord0[2]);
  var coord = vec2.lerp([], coord0, coord1, t);
  var result = (0, _webMercatorUtils.worldToLngLat)(coord);
  result.push(targetZ);
  return result;
}
//# sourceMappingURL=get-bounds.js.map