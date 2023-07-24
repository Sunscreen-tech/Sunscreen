"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.uncapitalize = uncapitalize;
exports.uncapitalizeKeys = uncapitalizeKeys;
var _slicedToArray2 = _interopRequireDefault(require("@babel/runtime/helpers/slicedToArray"));
var _typeof2 = _interopRequireDefault(require("@babel/runtime/helpers/typeof"));
function uncapitalize(str) {
  return typeof str === 'string' ? str.charAt(0).toLowerCase() + str.slice(1) : str;
}
function uncapitalizeKeys(object) {
  if (Array.isArray(object)) {
    return object.map(function (element) {
      return uncapitalizeKeys(element);
    });
  }
  if (object && (0, _typeof2.default)(object) === 'object') {
    var newObject = {};
    for (var _i = 0, _Object$entries = Object.entries(object); _i < _Object$entries.length; _i++) {
      var _Object$entries$_i = (0, _slicedToArray2.default)(_Object$entries[_i], 2),
        key = _Object$entries$_i[0],
        value = _Object$entries$_i[1];
      newObject[uncapitalize(key)] = uncapitalizeKeys(value);
    }
    return newObject;
  }
  return object;
}
//# sourceMappingURL=uncapitalize.js.map