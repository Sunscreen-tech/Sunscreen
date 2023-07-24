"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.computeBoundingBox = computeBoundingBox;
var _attributeIterator = require("../iterators/attribute-iterator");
var _assert = require("../utils/assert");
function _createForOfIteratorHelper(o, allowArrayLike) { var it = typeof Symbol !== "undefined" && o[Symbol.iterator] || o["@@iterator"]; if (!it) { if (Array.isArray(o) || (it = _unsupportedIterableToArray(o)) || allowArrayLike && o && typeof o.length === "number") { if (it) o = it; var i = 0; var F = function F() {}; return { s: F, n: function n() { if (i >= o.length) return { done: true }; return { done: false, value: o[i++] }; }, e: function e(_e) { throw _e; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var normalCompletion = true, didErr = false, err; return { s: function s() { it = it.call(o); }, n: function n() { var step = it.next(); normalCompletion = step.done; return step; }, e: function e(_e2) { didErr = true; err = _e2; }, f: function f() { try { if (!normalCompletion && it.return != null) it.return(); } finally { if (didErr) throw err; } } }; }
function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }
function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) arr2[i] = arr[i]; return arr2; }
function computeBoundingBox() {
  var positions = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [];
  var min = [Number(Infinity), Number(Infinity), Number(Infinity)];
  var max = [-Infinity, -Infinity, -Infinity];
  var _iterator = _createForOfIteratorHelper((0, _attributeIterator.makeAttributeIterator)(positions)),
    _step;
  try {
    for (_iterator.s(); !(_step = _iterator.n()).done;) {
      var position = _step.value;
      var x = position[0];
      var y = position[1];
      var z = position[2];
      if (x < min[0]) min[0] = x;
      if (y < min[1]) min[1] = y;
      if (z < min[2]) min[2] = z;
      if (x > max[0]) max[0] = x;
      if (y > max[1]) max[1] = y;
      if (z > max[2]) max[2] = z;
    }
  } catch (err) {
    _iterator.e(err);
  } finally {
    _iterator.f();
  }
  var boundingBox = {
    min: min,
    max: max
  };
  validateBoundingBox(boundingBox);
  return boundingBox;
}
function validateBoundingBox(boundingBox) {
  (0, _assert.assert)(Number.isFinite(boundingBox.min[0]) && Number.isFinite(boundingBox.min[1]) && Number.isFinite(boundingBox.min[2]) && Number.isFinite(boundingBox.max[0]) && Number.isFinite(boundingBox.max[1]) && Number.isFinite(boundingBox.max[2]));
}
//# sourceMappingURL=compute-bounding-box.js.map