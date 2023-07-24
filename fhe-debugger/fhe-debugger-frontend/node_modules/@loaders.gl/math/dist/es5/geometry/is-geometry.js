"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = isGeometry;
var _typeof2 = _interopRequireDefault(require("@babel/runtime/helpers/typeof"));
function isGeometry(geometry) {
  return geometry && (0, _typeof2.default)(geometry) === 'object' && geometry.mode && geometry.attributes && (0, _typeof2.default)(geometry.attributes) === 'object';
}
//# sourceMappingURL=is-geometry.js.map