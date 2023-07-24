"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.shallowEqualObjects = shallowEqualObjects;

var _typeof2 = _interopRequireDefault(require("@babel/runtime/helpers/typeof"));

function shallowEqualObjects(a, b) {
  if (a === b) {
    return true;
  }

  if ((0, _typeof2.default)(a) !== 'object' || a === null || (0, _typeof2.default)(b) !== 'object' || b === null) {
    return false;
  }

  if (Object.keys(a).length !== Object.keys(b).length) {
    return false;
  }

  for (var key in a) {
    if (!(key in b) || a[key] !== b[key]) {
      return false;
    }
  }

  for (var _key in b) {
    if (!(_key in a)) {
      return false;
    }
  }

  return true;
}
//# sourceMappingURL=shallow-equal-objects.js.map