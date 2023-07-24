"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getS2Region = getS2Region;
var _s2ToBoundary = require("./s2-to-boundary");
var _s2CellUtils = require("../s2geometry/s2-cell-utils");
function getS2Region(s2cell) {
  var region;
  if (s2cell.face === 2 || s2cell.face === 5) {
    var corners = null;
    var len = 0;
    for (var i = 0; i < 4; i++) {
      var key = "".concat(s2cell.face, "/").concat(i);
      var cell = (0, _s2CellUtils.getS2Cell)(key);
      var corns = (0, _s2ToBoundary.getS2BoundaryFlatFromS2Cell)(cell);
      if (typeof corners === 'undefined' || corners === null) corners = new Float64Array(4 * corns.length);
      corners.set(corns, len);
      len += corns.length;
    }
    region = get2DRegionFromS2Corners(corners);
  } else {
    var _corners = (0, _s2ToBoundary.getS2BoundaryFlatFromS2Cell)(s2cell);
    region = get2DRegionFromS2Corners(_corners);
  }
  return region;
}
function get2DRegionFromS2Corners(corners) {
  if (corners.length % 2 !== 0) {
    throw new Error('Invalid corners');
  }
  var longitudes = [];
  var latitudes = [];
  for (var i = 0; i < corners.length; i += 2) {
    longitudes.push(corners[i]);
    latitudes.push(corners[i + 1]);
  }
  longitudes.sort(function (a, b) {
    return a - b;
  });
  latitudes.sort(function (a, b) {
    return a - b;
  });
  return {
    west: longitudes[0],
    east: longitudes[longitudes.length - 1],
    north: latitudes[latitudes.length - 1],
    south: latitudes[0]
  };
}
//# sourceMappingURL=s2-to-region.js.map