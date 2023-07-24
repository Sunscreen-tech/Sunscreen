"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.decodeRGB565 = decodeRGB565;
exports.encodeRGB565 = encodeRGB565;
function decodeRGB565(rgb565) {
  var target = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [0, 0, 0];
  var r5 = rgb565 >> 11 & 31;
  var g6 = rgb565 >> 5 & 63;
  var b5 = rgb565 & 31;
  target[0] = r5 << 3;
  target[1] = g6 << 2;
  target[2] = b5 << 3;
  return target;
}
function encodeRGB565(rgb) {
  var r5 = Math.floor(rgb[0] / 8) + 4;
  var g6 = Math.floor(rgb[1] / 4) + 2;
  var b5 = Math.floor(rgb[2] / 8) + 4;
  return r5 + (g6 << 5) + (b5 << 11);
}
//# sourceMappingURL=rgb565.js.map