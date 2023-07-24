"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.normalize3DTileNormalAttribute = normalize3DTileNormalAttribute;
var _core = require("@math.gl/core");
var _math = require("@loaders.gl/math");
var scratchNormal = new _core.Vector3();
function normalize3DTileNormalAttribute(tile, normals) {
  if (!normals) {
    return null;
  }
  if (tile.isOctEncoded16P) {
    var decodedArray = new Float32Array(tile.pointsLength * 3);
    for (var i = 0; i < tile.pointsLength; i++) {
      (0, _math.octDecode)(normals[i * 2], normals[i * 2 + 1], scratchNormal);
      scratchNormal.toArray(decodedArray, i * 3);
    }
    return {
      type: _math.GL.FLOAT,
      size: 2,
      value: decodedArray
    };
  }
  return {
    type: _math.GL.FLOAT,
    size: 2,
    value: normals
  };
}
//# sourceMappingURL=normalize-3d-tile-normals.js.map