"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getS2BoundaryFlat = getS2BoundaryFlat;
exports.getS2LngLat = getS2LngLat;
var _s2ToBoundary = require("./converters/s2-to-boundary");
var _s2Geometry = require("./s2geometry/s2-geometry");
var _s2CellUtils = require("./s2geometry/s2-cell-utils");
function getS2LngLat(s2Token) {
  var s2cell = (0, _s2CellUtils.getS2Cell)(s2Token);
  return (0, _s2Geometry.getS2LngLatFromS2Cell)(s2cell);
}
function getS2BoundaryFlat(tokenOrKey) {
  var s2cell = (0, _s2CellUtils.getS2Cell)(tokenOrKey);
  return (0, _s2ToBoundary.getS2BoundaryFlatFromS2Cell)(s2cell);
}
//# sourceMappingURL=s2-geometry-functions.js.map