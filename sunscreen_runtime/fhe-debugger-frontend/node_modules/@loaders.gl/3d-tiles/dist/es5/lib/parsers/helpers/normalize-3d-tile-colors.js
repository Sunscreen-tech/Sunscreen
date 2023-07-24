"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.normalize3DTileColorAttribute = normalize3DTileColorAttribute;
var _math = require("@loaders.gl/math");
function normalize3DTileColorAttribute(tile, colors, batchTable) {
  if (!colors && (!tile || !tile.batchIds || !batchTable)) {
    return null;
  }
  var batchIds = tile.batchIds,
    isRGB565 = tile.isRGB565,
    pointCount = tile.pointCount;
  if (batchIds && batchTable) {
    var colorArray = new Uint8ClampedArray(pointCount * 3);
    for (var i = 0; i < pointCount; i++) {
      var batchId = batchIds[i];
      var dimensions = batchTable.getProperty(batchId, 'dimensions');
      var color = dimensions.map(function (d) {
        return d * 255;
      });
      colorArray[i * 3] = color[0];
      colorArray[i * 3 + 1] = color[1];
      colorArray[i * 3 + 2] = color[2];
    }
    return {
      type: _math.GL.UNSIGNED_BYTE,
      value: colorArray,
      size: 3,
      normalized: true
    };
  }
  if (isRGB565) {
    var _colorArray = new Uint8ClampedArray(pointCount * 3);
    for (var _i = 0; _i < pointCount; _i++) {
      var _color = (0, _math.decodeRGB565)(colors[_i]);
      _colorArray[_i * 3] = _color[0];
      _colorArray[_i * 3 + 1] = _color[1];
      _colorArray[_i * 3 + 2] = _color[2];
    }
    return {
      type: _math.GL.UNSIGNED_BYTE,
      value: _colorArray,
      size: 3,
      normalized: true
    };
  }
  if (colors && colors.length === pointCount * 3) {
    return {
      type: _math.GL.UNSIGNED_BYTE,
      value: colors,
      size: 3,
      normalized: true
    };
  }
  return {
    type: _math.GL.UNSIGNED_BYTE,
    value: colors,
    size: 4,
    normalized: true
  };
}
//# sourceMappingURL=normalize-3d-tile-colors.js.map