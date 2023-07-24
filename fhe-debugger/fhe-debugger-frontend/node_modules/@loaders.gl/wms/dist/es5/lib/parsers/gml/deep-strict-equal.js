"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.deepStrictEqual = deepStrictEqual;
var _typeof2 = _interopRequireDefault(require("@babel/runtime/helpers/typeof"));
function deepStrictEqual(actual, expected, strict) {
  if (actual === expected) {
    return true;
  } else if (actual instanceof Date && expected instanceof Date) {
    return actual.getTime() === expected.getTime();
  } else if (actual instanceof RegExp && expected instanceof RegExp) {
    return actual.source === expected.source && actual.global === expected.global && actual.multiline === expected.multiline && actual.lastIndex === expected.lastIndex && actual.ignoreCase === expected.ignoreCase;
  } else if ((actual === null || (0, _typeof2.default)(actual) !== 'object') && (expected === null || (0, _typeof2.default)(expected) !== 'object')) {
    return strict ? actual === expected : actual == expected;
  }
  return objEquiv(actual, expected, strict);
}
var pSlice = Array.prototype.slice;
function isPrimitive(arg) {
  return arg === null || (0, _typeof2.default)(arg) !== 'object' && typeof arg !== 'function';
}
function isArguments(object) {
  return Object.prototype.toString.call(object) == '[object Arguments]';
}
function objEquiv(a, b, strict) {
  if (a === null || a === undefined || b === null || b === undefined) return false;
  if (isPrimitive(a) || isPrimitive(b)) return a === b;
  if (strict && Object.getPrototypeOf(a) !== Object.getPrototypeOf(b)) return false;
  var aIsArgs = isArguments(a);
  var bIsArgs = isArguments(b);
  if (aIsArgs && !bIsArgs || !aIsArgs && bIsArgs) return false;
  if (aIsArgs) {
    a = pSlice.call(a);
    b = pSlice.call(b);
    return deepStrictEqual(a, b, strict);
  }
  var ka = Object.keys(a);
  var kb = Object.keys(b);
  var key;
  var i;
  if (ka.length !== kb.length) return false;
  ka.sort();
  kb.sort();
  for (i = ka.length - 1; i >= 0; i--) {
    if (ka[i] !== kb[i]) return false;
  }
  for (i = ka.length - 1; i >= 0; i--) {
    key = ka[i];
    if (!deepStrictEqual(a[key], b[key], strict)) return false;
  }
  return true;
}
//# sourceMappingURL=deep-strict-equal.js.map