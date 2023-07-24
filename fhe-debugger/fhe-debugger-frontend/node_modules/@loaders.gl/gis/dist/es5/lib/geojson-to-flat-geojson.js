"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.geojsonToFlatGeojson = geojsonToFlatGeojson;
var _defineProperty2 = _interopRequireDefault(require("@babel/runtime/helpers/defineProperty"));
var _toConsumableArray2 = _interopRequireDefault(require("@babel/runtime/helpers/toConsumableArray"));
var _polygon = require("@math.gl/polygon");
function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); enumerableOnly && (symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; })), keys.push.apply(keys, symbols); } return keys; }
function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = null != arguments[i] ? arguments[i] : {}; i % 2 ? ownKeys(Object(source), !0).forEach(function (key) { (0, _defineProperty2.default)(target, key, source[key]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)) : ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } return target; }
function _createForOfIteratorHelper(o, allowArrayLike) { var it = typeof Symbol !== "undefined" && o[Symbol.iterator] || o["@@iterator"]; if (!it) { if (Array.isArray(o) || (it = _unsupportedIterableToArray(o)) || allowArrayLike && o && typeof o.length === "number") { if (it) o = it; var i = 0; var F = function F() {}; return { s: F, n: function n() { if (i >= o.length) return { done: true }; return { done: false, value: o[i++] }; }, e: function e(_e) { throw _e; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var normalCompletion = true, didErr = false, err; return { s: function s() { it = it.call(o); }, n: function n() { var step = it.next(); normalCompletion = step.done; return step; }, e: function e(_e2) { didErr = true; err = _e2; }, f: function f() { try { if (!normalCompletion && it.return != null) it.return(); } finally { if (didErr) throw err; } } }; }
function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }
function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) arr2[i] = arr[i]; return arr2; }
function geojsonToFlatGeojson(features) {
  var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {
    coordLength: 2,
    fixRingWinding: true
  };
  return features.map(function (feature) {
    return flattenFeature(feature, options);
  });
}
function flattenPoint(coordinates, data, indices, options) {
  indices.push(data.length);
  data.push.apply(data, (0, _toConsumableArray2.default)(coordinates));
  for (var i = coordinates.length; i < options.coordLength; i++) {
    data.push(0);
  }
}
function flattenLineString(coordinates, data, indices, options) {
  indices.push(data.length);
  var _iterator = _createForOfIteratorHelper(coordinates),
    _step;
  try {
    for (_iterator.s(); !(_step = _iterator.n()).done;) {
      var c = _step.value;
      data.push.apply(data, (0, _toConsumableArray2.default)(c));
      for (var i = c.length; i < options.coordLength; i++) {
        data.push(0);
      }
    }
  } catch (err) {
    _iterator.e(err);
  } finally {
    _iterator.f();
  }
}
function flattenPolygon(coordinates, data, indices, areas, options) {
  var count = 0;
  var ringAreas = [];
  var polygons = [];
  var _iterator2 = _createForOfIteratorHelper(coordinates),
    _step2;
  try {
    for (_iterator2.s(); !(_step2 = _iterator2.n()).done;) {
      var lineString = _step2.value;
      var lineString2d = lineString.map(function (p) {
        return p.slice(0, 2);
      });
      var area = (0, _polygon.getPolygonSignedArea)(lineString2d.flat());
      var ccw = area < 0;
      if (options.fixRingWinding && (count === 0 && !ccw || count > 0 && ccw)) {
        lineString.reverse();
        area = -area;
      }
      ringAreas.push(area);
      flattenLineString(lineString, data, polygons, options);
      count++;
    }
  } catch (err) {
    _iterator2.e(err);
  } finally {
    _iterator2.f();
  }
  if (count > 0) {
    areas.push(ringAreas);
    indices.push(polygons);
  }
}
function flattenFeature(feature, options) {
  var geometry = feature.geometry;
  if (geometry.type === 'GeometryCollection') {
    throw new Error('GeometryCollection type not supported');
  }
  var data = [];
  var indices = [];
  var areas;
  var type;
  switch (geometry.type) {
    case 'Point':
      type = 'Point';
      flattenPoint(geometry.coordinates, data, indices, options);
      break;
    case 'MultiPoint':
      type = 'Point';
      geometry.coordinates.map(function (c) {
        return flattenPoint(c, data, indices, options);
      });
      break;
    case 'LineString':
      type = 'LineString';
      flattenLineString(geometry.coordinates, data, indices, options);
      break;
    case 'MultiLineString':
      type = 'LineString';
      geometry.coordinates.map(function (c) {
        return flattenLineString(c, data, indices, options);
      });
      break;
    case 'Polygon':
      type = 'Polygon';
      areas = [];
      flattenPolygon(geometry.coordinates, data, indices, areas, options);
      break;
    case 'MultiPolygon':
      type = 'Polygon';
      areas = [];
      geometry.coordinates.map(function (c) {
        return flattenPolygon(c, data, indices, areas, options);
      });
      break;
    default:
      throw new Error("Unknown type: ".concat(type));
  }
  return _objectSpread(_objectSpread({}, feature), {}, {
    geometry: {
      type: type,
      indices: indices,
      data: data,
      areas: areas
    }
  });
}
//# sourceMappingURL=geojson-to-flat-geojson.js.map