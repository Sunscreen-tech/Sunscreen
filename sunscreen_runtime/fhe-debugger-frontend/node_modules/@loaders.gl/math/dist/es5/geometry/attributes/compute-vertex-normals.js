"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.computeVertexNormals = computeVertexNormals;
var _core = require("@math.gl/core");
var _constants = require("../constants");
var _assert = require("../utils/assert");
var _primitiveIterator = require("../iterators/primitive-iterator");
var _modes = require("../primitives/modes");
var _getAttributeFromGeometry = require("./get-attribute-from-geometry");
function _createForOfIteratorHelper(o, allowArrayLike) { var it = typeof Symbol !== "undefined" && o[Symbol.iterator] || o["@@iterator"]; if (!it) { if (Array.isArray(o) || (it = _unsupportedIterableToArray(o)) || allowArrayLike && o && typeof o.length === "number") { if (it) o = it; var i = 0; var F = function F() {}; return { s: F, n: function n() { if (i >= o.length) return { done: true }; return { done: false, value: o[i++] }; }, e: function e(_e) { throw _e; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var normalCompletion = true, didErr = false, err; return { s: function s() { it = it.call(o); }, n: function n() { var step = it.next(); normalCompletion = step.done; return step; }, e: function e(_e2) { didErr = true; err = _e2; }, f: function f() { try { if (!normalCompletion && it.return != null) it.return(); } finally { if (didErr) throw err; } } }; }
function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }
function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) arr2[i] = arr[i]; return arr2; }
function computeVertexNormals(geometry) {
  (0, _assert.assert)((0, _modes.getPrimitiveModeType)(geometry.mode) === _constants.GL.TRIANGLES, 'TRIANGLES required');
  var _getPositions = (0, _getAttributeFromGeometry.getPositions)(geometry),
    positions = _getPositions.values;
  var normals = new Float32Array(positions.length);
  var vectorA = new _core.Vector3();
  var vectorB = new _core.Vector3();
  var vectorC = new _core.Vector3();
  var vectorCB = new _core.Vector3();
  var vectorAB = new _core.Vector3();
  var _iterator = _createForOfIteratorHelper((0, _primitiveIterator.makePrimitiveIterator)(geometry)),
    _step;
  try {
    for (_iterator.s(); !(_step = _iterator.n()).done;) {
      var primitive = _step.value;
      vectorA.fromArray(positions, primitive.i1 * 3);
      vectorB.fromArray(positions, primitive.i2 * 3 + 3);
      vectorC.fromArray(positions, primitive.i3 * 3 + 6);
      vectorCB.subVectors(vectorC, vectorB);
      vectorAB.subVectors(vectorA, vectorB);
      var normal = vectorCB.cross(vectorAB);
      normal.normalize();
      var primitiveIndex = primitive.primitiveIndex;
      normals[primitiveIndex * 9 + 0] = normal.x;
      normals[primitiveIndex * 9 + 1] = normal.y;
      normals[primitiveIndex * 9 + 2] = normal.z;
      normals[primitiveIndex * 9 + 3] = normal.x;
      normals[primitiveIndex * 9 + 4] = normal.y;
      normals[primitiveIndex * 9 + 5] = normal.z;
      normals[primitiveIndex * 9 + 6] = normal.x;
      normals[primitiveIndex * 9 + 7] = normal.y;
      normals[primitiveIndex * 9 + 8] = normal.z;
    }
  } catch (err) {
    _iterator.e(err);
  } finally {
    _iterator.f();
  }
  return normals;
}
//# sourceMappingURL=compute-vertex-normals.js.map