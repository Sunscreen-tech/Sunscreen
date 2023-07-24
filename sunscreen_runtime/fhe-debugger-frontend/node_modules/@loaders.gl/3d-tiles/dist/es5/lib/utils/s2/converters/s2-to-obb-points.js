"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getS2OrientedBoundingBoxCornerPoints = getS2OrientedBoundingBoxCornerPoints;
var _s2CellUtils = require("../s2geometry/s2-cell-utils");
var _s2ToRegion = require("./s2-to-region");
var _core = require("@math.gl/core");
function getS2OrientedBoundingBoxCornerPoints(tokenOrKey, heightInfo) {
  var min = (heightInfo === null || heightInfo === void 0 ? void 0 : heightInfo.minimumHeight) || 0;
  var max = (heightInfo === null || heightInfo === void 0 ? void 0 : heightInfo.maximumHeight) || 0;
  var s2cell = (0, _s2CellUtils.getS2Cell)(tokenOrKey);
  var region = (0, _s2ToRegion.getS2Region)(s2cell);
  var W = region.west;
  var S = region.south;
  var E = region.east;
  var N = region.north;
  var points = [];
  points.push(new _core.Vector3(W, N, min));
  points.push(new _core.Vector3(E, N, min));
  points.push(new _core.Vector3(E, S, min));
  points.push(new _core.Vector3(W, S, min));
  points.push(new _core.Vector3(W, N, max));
  points.push(new _core.Vector3(E, N, max));
  points.push(new _core.Vector3(E, S, max));
  points.push(new _core.Vector3(W, S, max));
  return points;
}
//# sourceMappingURL=s2-to-obb-points.js.map