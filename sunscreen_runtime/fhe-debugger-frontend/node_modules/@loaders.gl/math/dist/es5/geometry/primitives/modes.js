"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getPrimitiveModeExpandedLength = getPrimitiveModeExpandedLength;
exports.getPrimitiveModeType = getPrimitiveModeType;
exports.isPrimitiveModeExpandable = isPrimitiveModeExpandable;
var _constants = require("../constants");
function getPrimitiveModeType(mode) {
  switch (mode) {
    case _constants.GL.POINTS:
      return _constants.GL.POINTS;
    case _constants.GL.LINES:
    case _constants.GL.LINE_STRIP:
    case _constants.GL.LINE_LOOP:
      return _constants.GL.LINES;
    case _constants.GL.TRIANGLES:
    case _constants.GL.TRIANGLE_STRIP:
    case _constants.GL.TRIANGLE_FAN:
      return _constants.GL.TRIANGLES;
    default:
      throw new Error('Unknown primitive mode');
  }
}
function isPrimitiveModeExpandable(mode) {
  switch (mode) {
    case _constants.GL.LINE_STRIP:
    case _constants.GL.LINE_LOOP:
    case _constants.GL.TRIANGLE_STRIP:
    case _constants.GL.TRIANGLE_FAN:
      return true;
    default:
      return false;
  }
}
function getPrimitiveModeExpandedLength(mode, length) {
  switch (mode) {
    case _constants.GL.POINTS:
      return length;
    case _constants.GL.LINES:
      return length;
    case _constants.GL.LINE_STRIP:
      return length;
    case _constants.GL.LINE_LOOP:
      return length + 1;
    case _constants.GL.TRIANGLES:
      return length;
    case _constants.GL.TRIANGLE_STRIP:
    case _constants.GL.TRIANGLE_FAN:
      return (length - 2) * 3;
    default:
      throw new Error('Unknown length');
  }
}
//# sourceMappingURL=modes.js.map