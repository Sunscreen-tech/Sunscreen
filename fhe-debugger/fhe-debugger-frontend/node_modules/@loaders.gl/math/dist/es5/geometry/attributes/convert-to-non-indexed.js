"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.convertBuffersToNonIndexed = convertBuffersToNonIndexed;
function _createForOfIteratorHelper(o, allowArrayLike) { var it = typeof Symbol !== "undefined" && o[Symbol.iterator] || o["@@iterator"]; if (!it) { if (Array.isArray(o) || (it = _unsupportedIterableToArray(o)) || allowArrayLike && o && typeof o.length === "number") { if (it) o = it; var i = 0; var F = function F() {}; return { s: F, n: function n() { if (i >= o.length) return { done: true }; return { done: false, value: o[i++] }; }, e: function e(_e) { throw _e; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var normalCompletion = true, didErr = false, err; return { s: function s() { it = it.call(o); }, n: function n() { var step = it.next(); normalCompletion = step.done; return step; }, e: function e(_e2) { didErr = true; err = _e2; }, f: function f() { try { if (!normalCompletion && it.return != null) it.return(); } finally { if (didErr) throw err; } } }; }
function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }
function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) arr2[i] = arr[i]; return arr2; }
function convertBuffersToNonIndexed(_ref) {
  var indices = _ref.indices,
    attributes = _ref.attributes;
  var geometry2 = new BufferGeometry();
  for (var name in attributes) {
    var attribute = attributes[name];
    var array = attribute.array;
    var itemSize = attribute.itemSize;
    var array2 = new array.constructor(indices.length * itemSize);
    var index = 0,
      index2 = 0;
    for (var i = 0, l = indices.length; i < l; i++) {
      index = indices[i] * itemSize;
      for (var j = 0; j < itemSize; j++) {
        array2[index2++] = array[index++];
      }
    }
    geometry2.addAttribute(name, new BufferAttribute(array2, itemSize));
  }
  var _iterator = _createForOfIteratorHelper(this.groups),
    _step;
  try {
    for (_iterator.s(); !(_step = _iterator.n()).done;) {
      var group = _step.value;
      geometry2.addGroup(group.start, group.count, group.materialIndex);
    }
  } catch (err) {
    _iterator.e(err);
  } finally {
    _iterator.f();
  }
  return geometry2;
}
//# sourceMappingURL=convert-to-non-indexed.js.map