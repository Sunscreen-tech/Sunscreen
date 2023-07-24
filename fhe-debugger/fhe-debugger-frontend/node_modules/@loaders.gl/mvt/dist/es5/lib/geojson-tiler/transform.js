"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.transformTile = transformTile;
function _createForOfIteratorHelper(o, allowArrayLike) { var it = typeof Symbol !== "undefined" && o[Symbol.iterator] || o["@@iterator"]; if (!it) { if (Array.isArray(o) || (it = _unsupportedIterableToArray(o)) || allowArrayLike && o && typeof o.length === "number") { if (it) o = it; var i = 0; var F = function F() {}; return { s: F, n: function n() { if (i >= o.length) return { done: true }; return { done: false, value: o[i++] }; }, e: function e(_e) { throw _e; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var normalCompletion = true, didErr = false, err; return { s: function s() { it = it.call(o); }, n: function n() { var step = it.next(); normalCompletion = step.done; return step; }, e: function e(_e2) { didErr = true; err = _e2; }, f: function f() { try { if (!normalCompletion && it.return != null) it.return(); } finally { if (didErr) throw err; } } }; }
function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }
function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) arr2[i] = arr[i]; return arr2; }
function transformTile(tile, extent) {
  if (tile.transformed) {
    return tile;
  }
  var z2 = 1 << tile.z;
  var tx = tile.x;
  var ty = tile.y;
  var _iterator = _createForOfIteratorHelper(tile.features),
    _step;
  try {
    for (_iterator.s(); !(_step = _iterator.n()).done;) {
      var feature = _step.value;
      var geom = feature.geometry;
      var type = feature.type;
      feature.geometry = [];
      if (type === 1) {
        for (var j = 0; j < geom.length; j += 2) {
          feature.geometry.push(transformPoint(geom[j], geom[j + 1], extent, z2, tx, ty));
        }
      } else {
        for (var _j = 0; _j < geom.length; _j++) {
          var ring = [];
          for (var k = 0; k < geom[_j].length; k += 2) {
            ring.push(transformPoint(geom[_j][k], geom[_j][k + 1], extent, z2, tx, ty));
          }
          feature.geometry.push(ring);
        }
      }
    }
  } catch (err) {
    _iterator.e(err);
  } finally {
    _iterator.f();
  }
  tile.transformed = true;
  return tile;
}
function transformPoint(x, y, extent, z2, tx, ty) {
  return [Math.round(extent * (x * z2 - tx)), Math.round(extent * (y * z2 - ty))];
}
//# sourceMappingURL=transform.js.map