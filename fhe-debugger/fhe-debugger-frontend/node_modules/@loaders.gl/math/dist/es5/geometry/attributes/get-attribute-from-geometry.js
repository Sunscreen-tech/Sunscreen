"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getPositions = getPositions;
var _isGeometry = _interopRequireDefault(require("../is-geometry"));
var _assert = require("../utils/assert");
function getPositions(geometry) {
  if ((0, _isGeometry.default)(geometry)) {
    var attributes = geometry.attributes;
    var position = attributes.POSITION || attributes.positions;
    (0, _assert.assert)(position);
    return position;
  }
  if (ArrayBuffer.isView(geometry)) {
    return {
      values: geometry,
      size: 3
    };
  }
  if (geometry) {
    (0, _assert.assert)(geometry.values);
    return geometry;
  }
  return (0, _assert.assert)(false);
}
//# sourceMappingURL=get-attribute-from-geometry.js.map