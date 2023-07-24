"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getS2BoundaryFlatFromS2Cell = getS2BoundaryFlatFromS2Cell;
var _s2Geometry = require("../s2geometry/s2-geometry");
var MAX_RESOLUTION = 100;
function getS2BoundaryFlatFromS2Cell(s2cell) {
  var face = s2cell.face,
    ij = s2cell.ij,
    level = s2cell.level;
  var offsets = [[0, 0], [0, 1], [1, 1], [1, 0], [0, 0]];
  var resolution = Math.max(1, Math.ceil(MAX_RESOLUTION * Math.pow(2, -level)));
  var result = new Float64Array(4 * resolution * 2 + 2);
  var ptIndex = 0;
  var prevLng = 0;
  for (var i = 0; i < 4; i++) {
    var offset = offsets[i].slice(0);
    var nextOffset = offsets[i + 1];
    var stepI = (nextOffset[0] - offset[0]) / resolution;
    var stepJ = (nextOffset[1] - offset[1]) / resolution;
    for (var j = 0; j < resolution; j++) {
      offset[0] += stepI;
      offset[1] += stepJ;
      var st = (0, _s2Geometry.IJToST)(ij, level, offset);
      var uv = (0, _s2Geometry.STToUV)(st);
      var xyz = (0, _s2Geometry.FaceUVToXYZ)(face, uv);
      var lngLat = (0, _s2Geometry.XYZToLngLat)(xyz);
      if (Math.abs(lngLat[1]) > 89.999) {
        lngLat[0] = prevLng;
      }
      var deltaLng = lngLat[0] - prevLng;
      lngLat[0] += deltaLng > 180 ? -360 : deltaLng < -180 ? 360 : 0;
      result[ptIndex++] = lngLat[0];
      result[ptIndex++] = lngLat[1];
      prevLng = lngLat[0];
    }
  }
  result[ptIndex++] = result[0];
  result[ptIndex++] = result[1];
  return result;
}
//# sourceMappingURL=s2-to-boundary.js.map