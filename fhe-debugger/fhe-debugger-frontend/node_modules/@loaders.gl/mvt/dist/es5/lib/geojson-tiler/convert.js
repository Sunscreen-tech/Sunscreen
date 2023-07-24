"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.convert = convert;
var _simplify = require("./simplify");
var _feature = require("./feature");
function _createForOfIteratorHelper(o, allowArrayLike) { var it = typeof Symbol !== "undefined" && o[Symbol.iterator] || o["@@iterator"]; if (!it) { if (Array.isArray(o) || (it = _unsupportedIterableToArray(o)) || allowArrayLike && o && typeof o.length === "number") { if (it) o = it; var i = 0; var F = function F() {}; return { s: F, n: function n() { if (i >= o.length) return { done: true }; return { done: false, value: o[i++] }; }, e: function e(_e) { throw _e; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var normalCompletion = true, didErr = false, err; return { s: function s() { it = it.call(o); }, n: function n() { var step = it.next(); normalCompletion = step.done; return step; }, e: function e(_e2) { didErr = true; err = _e2; }, f: function f() { try { if (!normalCompletion && it.return != null) it.return(); } finally { if (didErr) throw err; } } }; }
function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }
function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) arr2[i] = arr[i]; return arr2; }
function convert(data, options) {
  var features = [];
  if (data.type === 'FeatureCollection') {
    for (var i = 0; i < data.features.length; i++) {
      convertFeature(features, data.features[i], options, i);
    }
  } else if (data.type === 'Feature') {
    convertFeature(features, data, options);
  } else {
    convertFeature(features, {
      geometry: data
    }, options);
  }
  return features;
}
function convertFeature(features, geojson, options, index) {
  if (!geojson.geometry) {
    return;
  }
  var coords = geojson.geometry.coordinates;
  var type = geojson.geometry.type;
  var tolerance = Math.pow(options.tolerance / ((1 << options.maxZoom) * options.extent), 2);
  var geometry = [];
  var id = geojson.id;
  if (options.promoteId) {
    id = geojson.properties[options.promoteId];
  } else if (options.generateId) {
    id = index || 0;
  }
  if (type === 'Point') {
    convertPoint(coords, geometry);
  } else if (type === 'MultiPoint') {
    var _iterator = _createForOfIteratorHelper(coords),
      _step;
    try {
      for (_iterator.s(); !(_step = _iterator.n()).done;) {
        var p = _step.value;
        convertPoint(p, geometry);
      }
    } catch (err) {
      _iterator.e(err);
    } finally {
      _iterator.f();
    }
  } else if (type === 'LineString') {
    convertLine(coords, geometry, tolerance, false);
  } else if (type === 'MultiLineString') {
    if (options.lineMetrics) {
      var _iterator2 = _createForOfIteratorHelper(coords),
        _step2;
      try {
        for (_iterator2.s(); !(_step2 = _iterator2.n()).done;) {
          var line = _step2.value;
          geometry = [];
          convertLine(line, geometry, tolerance, false);
          features.push((0, _feature.createFeature)(id, 'LineString', geometry, geojson.properties));
        }
      } catch (err) {
        _iterator2.e(err);
      } finally {
        _iterator2.f();
      }
      return;
    } else {
      convertLines(coords, geometry, tolerance, false);
    }
  } else if (type === 'Polygon') {
    convertLines(coords, geometry, tolerance, true);
  } else if (type === 'MultiPolygon') {
    var _iterator3 = _createForOfIteratorHelper(coords),
      _step3;
    try {
      for (_iterator3.s(); !(_step3 = _iterator3.n()).done;) {
        var polygon = _step3.value;
        var newPolygon = [];
        convertLines(polygon, newPolygon, tolerance, true);
        geometry.push(newPolygon);
      }
    } catch (err) {
      _iterator3.e(err);
    } finally {
      _iterator3.f();
    }
  } else if (type === 'GeometryCollection') {
    var _iterator4 = _createForOfIteratorHelper(geojson.geometry.geometries),
      _step4;
    try {
      for (_iterator4.s(); !(_step4 = _iterator4.n()).done;) {
        var singleGeometry = _step4.value;
        convertFeature(features, {
          id: id,
          geometry: singleGeometry,
          properties: geojson.properties
        }, options, index);
      }
    } catch (err) {
      _iterator4.e(err);
    } finally {
      _iterator4.f();
    }
    return;
  } else {
    throw new Error('Input data is not a valid GeoJSON object.');
  }
  features.push((0, _feature.createFeature)(id, type, geometry, geojson.properties));
}
function convertPoint(coords, out) {
  out.push(projectX(coords[0]), projectY(coords[1]), 0);
}
function convertLine(ring, out, tolerance, isPolygon) {
  var x0, y0;
  var size = 0;
  for (var j = 0; j < ring.length; j++) {
    var x = projectX(ring[j][0]);
    var y = projectY(ring[j][1]);
    out.push(x, y, 0);
    if (j > 0) {
      if (isPolygon) {
        size += (x0 * y - x * y0) / 2;
      } else {
        size += Math.sqrt(Math.pow(x - x0, 2) + Math.pow(y - y0, 2));
      }
    }
    x0 = x;
    y0 = y;
  }
  var last = out.length - 3;
  out[2] = 1;
  (0, _simplify.simplify)(out, 0, last, tolerance);
  out[last + 2] = 1;
  out.size = Math.abs(size);
  out.start = 0;
  out.end = out.size;
}
function convertLines(rings, out, tolerance, isPolygon) {
  for (var i = 0; i < rings.length; i++) {
    var geom = [];
    convertLine(rings[i], geom, tolerance, isPolygon);
    out.push(geom);
  }
}
function projectX(x) {
  return x / 360 + 0.5;
}
function projectY(y) {
  var sin = Math.sin(y * Math.PI / 180);
  var y2 = 0.5 - 0.25 * Math.log((1 + sin) / (1 - sin)) / Math.PI;
  return y2 < 0 ? 0 : y2 > 1 ? 1 : y2;
}
//# sourceMappingURL=convert.js.map