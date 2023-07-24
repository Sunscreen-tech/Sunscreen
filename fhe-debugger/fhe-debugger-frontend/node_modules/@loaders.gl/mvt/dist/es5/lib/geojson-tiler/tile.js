"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.createTile = createTile;
function _createForOfIteratorHelper(o, allowArrayLike) { var it = typeof Symbol !== "undefined" && o[Symbol.iterator] || o["@@iterator"]; if (!it) { if (Array.isArray(o) || (it = _unsupportedIterableToArray(o)) || allowArrayLike && o && typeof o.length === "number") { if (it) o = it; var i = 0; var F = function F() {}; return { s: F, n: function n() { if (i >= o.length) return { done: true }; return { done: false, value: o[i++] }; }, e: function e(_e) { throw _e; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var normalCompletion = true, didErr = false, err; return { s: function s() { it = it.call(o); }, n: function n() { var step = it.next(); normalCompletion = step.done; return step; }, e: function e(_e2) { didErr = true; err = _e2; }, f: function f() { try { if (!normalCompletion && it.return != null) it.return(); } finally { if (didErr) throw err; } } }; }
function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }
function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) arr2[i] = arr[i]; return arr2; }
function createTile(features, z, tx, ty, options) {
  var tolerance = z === options.maxZoom ? 0 : options.tolerance / ((1 << z) * options.extent);
  var tile = {
    features: [],
    numPoints: 0,
    numSimplified: 0,
    numFeatures: features.length,
    source: null,
    x: tx,
    y: ty,
    z: z,
    transformed: false,
    minX: 2,
    minY: 1,
    maxX: -1,
    maxY: 0
  };
  var _iterator = _createForOfIteratorHelper(features),
    _step;
  try {
    for (_iterator.s(); !(_step = _iterator.n()).done;) {
      var feature = _step.value;
      addFeature(tile, feature, tolerance, options);
    }
  } catch (err) {
    _iterator.e(err);
  } finally {
    _iterator.f();
  }
  return tile;
}
function addFeature(tile, feature, tolerance, options) {
  var geom = feature.geometry;
  var type = feature.type;
  var simplified = [];
  tile.minX = Math.min(tile.minX, feature.minX);
  tile.minY = Math.min(tile.minY, feature.minY);
  tile.maxX = Math.max(tile.maxX, feature.maxX);
  tile.maxY = Math.max(tile.maxY, feature.maxY);
  if (type === 'Point' || type === 'MultiPoint') {
    for (var i = 0; i < geom.length; i += 3) {
      simplified.push(geom[i], geom[i + 1]);
      tile.numPoints++;
      tile.numSimplified++;
    }
  } else if (type === 'LineString') {
    addLine(simplified, geom, tile, tolerance, false, false);
  } else if (type === 'MultiLineString' || type === 'Polygon') {
    for (var _i = 0; _i < geom.length; _i++) {
      addLine(simplified, geom[_i], tile, tolerance, type === 'Polygon', _i === 0);
    }
  } else if (type === 'MultiPolygon') {
    for (var k = 0; k < geom.length; k++) {
      var polygon = geom[k];
      for (var _i2 = 0; _i2 < polygon.length; _i2++) {
        addLine(simplified, polygon[_i2], tile, tolerance, true, _i2 === 0);
      }
    }
  }
  if (simplified.length) {
    var tags = feature.tags || null;
    if (type === 'LineString' && options.lineMetrics) {
      tags = {};
      for (var key in feature.tags) tags[key] = feature.tags[key];
      tags.mapbox_clip_start = geom.start / geom.size;
      tags.mapbox_clip_end = geom.end / geom.size;
    }
    var tileFeature = {
      geometry: simplified,
      type: type === 'Polygon' || type === 'MultiPolygon' ? 3 : type === 'LineString' || type === 'MultiLineString' ? 2 : 1,
      tags: tags
    };
    if (feature.id !== null) {
      tileFeature.id = feature.id;
    }
    tile.features.push(tileFeature);
  }
}
function addLine(result, geom, tile, tolerance, isPolygon, isOuter) {
  var sqTolerance = tolerance * tolerance;
  if (tolerance > 0 && geom.size < (isPolygon ? sqTolerance : tolerance)) {
    tile.numPoints += geom.length / 3;
    return;
  }
  var ring = [];
  for (var i = 0; i < geom.length; i += 3) {
    if (tolerance === 0 || geom[i + 2] > sqTolerance) {
      tile.numSimplified++;
      ring.push(geom[i], geom[i + 1]);
    }
    tile.numPoints++;
  }
  if (isPolygon) rewind(ring, isOuter);
  result.push(ring);
}
function rewind(ring, clockwise) {
  var area = 0;
  for (var i = 0, j = ring.length - 2; i < ring.length; j = i, i += 2) {
    area += (ring[i] - ring[j]) * (ring[i + 1] + ring[j + 1]);
  }
  if (area > 0 === clockwise) {
    for (var _i3 = 0, len = ring.length; _i3 < len / 2; _i3 += 2) {
      var x = ring[_i3];
      var y = ring[_i3 + 1];
      ring[_i3] = ring[len - 2 - _i3];
      ring[_i3 + 1] = ring[len - 1 - _i3];
      ring[len - 2 - _i3] = x;
      ring[len - 1 - _i3] = y;
    }
  }
}
//# sourceMappingURL=tile.js.map