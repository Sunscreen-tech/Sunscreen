"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.normalizePath = normalizePath;

var _polygon = require("@math.gl/polygon");

function normalizePath(path, size, gridResolution, wrapLongitude) {
  var flatPath;

  if (Array.isArray(path[0])) {
    var length = path.length * size;
    flatPath = new Array(length);

    for (var i = 0; i < path.length; i++) {
      for (var j = 0; j < size; j++) {
        flatPath[i * size + j] = path[i][j] || 0;
      }
    }
  } else {
    flatPath = path;
  }

  if (gridResolution) {
    return (0, _polygon.cutPolylineByGrid)(flatPath, {
      size: size,
      gridResolution: gridResolution
    });
  }

  if (wrapLongitude) {
    return (0, _polygon.cutPolylineByMercatorBounds)(flatPath, {
      size: size
    });
  }

  return flatPath;
}
//# sourceMappingURL=path.js.map