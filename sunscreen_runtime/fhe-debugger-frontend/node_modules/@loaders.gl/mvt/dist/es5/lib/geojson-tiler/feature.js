"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.createFeature = createFeature;
function _createForOfIteratorHelper(o, allowArrayLike) { var it = typeof Symbol !== "undefined" && o[Symbol.iterator] || o["@@iterator"]; if (!it) { if (Array.isArray(o) || (it = _unsupportedIterableToArray(o)) || allowArrayLike && o && typeof o.length === "number") { if (it) o = it; var i = 0; var F = function F() {}; return { s: F, n: function n() { if (i >= o.length) return { done: true }; return { done: false, value: o[i++] }; }, e: function e(_e) { throw _e; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var normalCompletion = true, didErr = false, err; return { s: function s() { it = it.call(o); }, n: function n() { var step = it.next(); normalCompletion = step.done; return step; }, e: function e(_e2) { didErr = true; err = _e2; }, f: function f() { try { if (!normalCompletion && it.return != null) it.return(); } finally { if (didErr) throw err; } } }; }
function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }
function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) arr2[i] = arr[i]; return arr2; }
function createFeature(id, type, geom, tags) {
  var feature = {
    id: id == null ? null : id,
    type: type,
    geometry: geom,
    tags: tags,
    minX: Infinity,
    minY: Infinity,
    maxX: -Infinity,
    maxY: -Infinity
  };
  if (type === 'Point' || type === 'MultiPoint' || type === 'LineString') {
    calcLineBBox(feature, geom);
  } else if (type === 'Polygon') {
    calcLineBBox(feature, geom[0]);
  } else if (type === 'MultiLineString') {
    var _iterator = _createForOfIteratorHelper(geom),
      _step;
    try {
      for (_iterator.s(); !(_step = _iterator.n()).done;) {
        var line = _step.value;
        calcLineBBox(feature, line);
      }
    } catch (err) {
      _iterator.e(err);
    } finally {
      _iterator.f();
    }
  } else if (type === 'MultiPolygon') {
    var _iterator2 = _createForOfIteratorHelper(geom),
      _step2;
    try {
      for (_iterator2.s(); !(_step2 = _iterator2.n()).done;) {
        var polygon = _step2.value;
        calcLineBBox(feature, polygon[0]);
      }
    } catch (err) {
      _iterator2.e(err);
    } finally {
      _iterator2.f();
    }
  }
  return feature;
}
function calcLineBBox(feature, geom) {
  for (var i = 0; i < geom.length; i += 3) {
    feature.minX = Math.min(feature.minX, geom[i]);
    feature.minY = Math.min(feature.minY, geom[i + 1]);
    feature.maxX = Math.max(feature.maxX, geom[i]);
    feature.maxY = Math.max(feature.maxY, geom[i + 1]);
  }
}
//# sourceMappingURL=feature.js.map