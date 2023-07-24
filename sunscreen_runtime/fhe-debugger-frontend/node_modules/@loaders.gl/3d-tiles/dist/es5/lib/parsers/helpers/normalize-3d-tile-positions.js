"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.normalize3DTilePositionAttribute = normalize3DTilePositionAttribute;
var _core = require("@math.gl/core");
var _math = require("@loaders.gl/math");
function normalize3DTilePositionAttribute(tile, positions, options) {
  if (!tile.isQuantized) {
    return positions;
  }
  if (options['3d-tiles'] && options['3d-tiles'].decodeQuantizedPositions) {
    tile.isQuantized = false;
    return decodeQuantizedPositions(tile, positions);
  }
  return {
    type: _math.GL.UNSIGNED_SHORT,
    value: positions,
    size: 3,
    normalized: true
  };
}
function decodeQuantizedPositions(tile, positions) {
  var scratchPosition = new _core.Vector3();
  var decodedArray = new Float32Array(tile.pointCount * 3);
  for (var i = 0; i < tile.pointCount; i++) {
    scratchPosition.set(positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2]).scale(1 / tile.quantizedRange).multiply(tile.quantizedVolumeScale).add(tile.quantizedVolumeOffset).toArray(decodedArray, i * 3);
  }
  return decodedArray;
}
//# sourceMappingURL=normalize-3d-tile-positions.js.map