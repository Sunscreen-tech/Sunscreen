"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.colorRangeToFlatArray = colorRangeToFlatArray;
exports.defaultColorRange = void 0;
var defaultColorRange = [[255, 255, 178], [254, 217, 118], [254, 178, 76], [253, 141, 60], [240, 59, 32], [189, 0, 38]];
exports.defaultColorRange = defaultColorRange;

function colorRangeToFlatArray(colorRange) {
  var normalize = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;
  var ArrayType = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : Float32Array;
  var flatArray;

  if (Number.isFinite(colorRange[0])) {
    flatArray = new ArrayType(colorRange);
  } else {
    flatArray = new ArrayType(colorRange.length * 4);
    var index = 0;

    for (var i = 0; i < colorRange.length; i++) {
      var color = colorRange[i];
      flatArray[index++] = color[0];
      flatArray[index++] = color[1];
      flatArray[index++] = color[2];
      flatArray[index++] = Number.isFinite(color[3]) ? color[3] : 255;
    }
  }

  if (normalize) {
    for (var _i = 0; _i < flatArray.length; _i++) {
      flatArray[_i] /= 255;
    }
  }

  return flatArray;
}
//# sourceMappingURL=color-utils.js.map