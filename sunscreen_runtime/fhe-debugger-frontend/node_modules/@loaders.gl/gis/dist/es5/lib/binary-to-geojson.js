"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.binaryToGeoJson = binaryToGeoJson;
exports.binaryToGeojson = binaryToGeojson;
exports.binaryToGeometry = binaryToGeometry;
var _defineProperty2 = _interopRequireDefault(require("@babel/runtime/helpers/defineProperty"));
function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); enumerableOnly && (symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; })), keys.push.apply(keys, symbols); } return keys; }
function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = null != arguments[i] ? arguments[i] : {}; i % 2 ? ownKeys(Object(source), !0).forEach(function (key) { (0, _defineProperty2.default)(target, key, source[key]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)) : ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } return target; }
function _createForOfIteratorHelper(o, allowArrayLike) { var it = typeof Symbol !== "undefined" && o[Symbol.iterator] || o["@@iterator"]; if (!it) { if (Array.isArray(o) || (it = _unsupportedIterableToArray(o)) || allowArrayLike && o && typeof o.length === "number") { if (it) o = it; var i = 0; var F = function F() {}; return { s: F, n: function n() { if (i >= o.length) return { done: true }; return { done: false, value: o[i++] }; }, e: function e(_e) { throw _e; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var normalCompletion = true, didErr = false, err; return { s: function s() { it = it.call(o); }, n: function n() { var step = it.next(); normalCompletion = step.done; return step; }, e: function e(_e2) { didErr = true; err = _e2; }, f: function f() { try { if (!normalCompletion && it.return != null) it.return(); } finally { if (didErr) throw err; } } }; }
function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }
function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) arr2[i] = arr[i]; return arr2; }
function binaryToGeojson(data, options) {
  var globalFeatureId = options === null || options === void 0 ? void 0 : options.globalFeatureId;
  if (globalFeatureId !== undefined) {
    return getSingleFeature(data, globalFeatureId);
  }
  return parseFeatures(data, options === null || options === void 0 ? void 0 : options.type);
}
function binaryToGeoJson(data, type) {
  var format = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 'feature';
  switch (format) {
    case 'feature':
      return parseFeatures(data, type);
    case 'geometry':
      return binaryToGeometry(data);
    default:
      throw new Error(format);
  }
}
function getSingleFeature(data, globalFeatureId) {
  var dataArray = normalizeInput(data);
  var _iterator = _createForOfIteratorHelper(dataArray),
    _step;
  try {
    for (_iterator.s(); !(_step = _iterator.n()).done;) {
      var _data = _step.value;
      var lastIndex = 0;
      var lastValue = _data.featureIds.value[0];
      for (var i = 0; i < _data.featureIds.value.length; i++) {
        var currValue = _data.featureIds.value[i];
        if (currValue === lastValue) {
          continue;
        }
        if (globalFeatureId === _data.globalFeatureIds.value[lastIndex]) {
          return parseFeature(_data, lastIndex, i);
        }
        lastIndex = i;
        lastValue = currValue;
      }
      if (globalFeatureId === _data.globalFeatureIds.value[lastIndex]) {
        return parseFeature(_data, lastIndex, _data.featureIds.value.length);
      }
    }
  } catch (err) {
    _iterator.e(err);
  } finally {
    _iterator.f();
  }
  throw new Error("featureId:".concat(globalFeatureId, " not found"));
}
function parseFeatures(data, type) {
  var dataArray = normalizeInput(data, type);
  return parseFeatureCollection(dataArray);
}
function binaryToGeometry(data, startIndex, endIndex) {
  switch (data.type) {
    case 'Point':
      return pointToGeoJson(data, startIndex, endIndex);
    case 'LineString':
      return lineStringToGeoJson(data, startIndex, endIndex);
    case 'Polygon':
      return polygonToGeoJson(data, startIndex, endIndex);
    default:
      var unexpectedInput = data;
      throw new Error("Unsupported geometry type: ".concat(unexpectedInput === null || unexpectedInput === void 0 ? void 0 : unexpectedInput.type));
  }
}
function normalizeInput(data, type) {
  var isHeterogeneousType = Boolean(data.points || data.lines || data.polygons);
  if (!isHeterogeneousType) {
    data.type = type || parseType(data);
    return [data];
  }
  var features = [];
  if (data.points) {
    data.points.type = 'Point';
    features.push(data.points);
  }
  if (data.lines) {
    data.lines.type = 'LineString';
    features.push(data.lines);
  }
  if (data.polygons) {
    data.polygons.type = 'Polygon';
    features.push(data.polygons);
  }
  return features;
}
function parseFeatureCollection(dataArray) {
  var features = [];
  var _iterator2 = _createForOfIteratorHelper(dataArray),
    _step2;
  try {
    for (_iterator2.s(); !(_step2 = _iterator2.n()).done;) {
      var data = _step2.value;
      if (data.featureIds.value.length === 0) {
        continue;
      }
      var lastIndex = 0;
      var lastValue = data.featureIds.value[0];
      for (var i = 0; i < data.featureIds.value.length; i++) {
        var currValue = data.featureIds.value[i];
        if (currValue === lastValue) {
          continue;
        }
        features.push(parseFeature(data, lastIndex, i));
        lastIndex = i;
        lastValue = currValue;
      }
      features.push(parseFeature(data, lastIndex, data.featureIds.value.length));
    }
  } catch (err) {
    _iterator2.e(err);
  } finally {
    _iterator2.f();
  }
  return features;
}
function parseFeature(data, startIndex, endIndex) {
  var geometry = binaryToGeometry(data, startIndex, endIndex);
  var properties = parseProperties(data, startIndex, endIndex);
  var fields = parseFields(data, startIndex, endIndex);
  return _objectSpread({
    type: 'Feature',
    geometry: geometry,
    properties: properties
  }, fields);
}
function parseFields(data) {
  var startIndex = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 0;
  var endIndex = arguments.length > 2 ? arguments[2] : undefined;
  return data.fields && data.fields[data.featureIds.value[startIndex]];
}
function parseProperties(data) {
  var startIndex = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 0;
  var endIndex = arguments.length > 2 ? arguments[2] : undefined;
  var properties = Object.assign({}, data.properties[data.featureIds.value[startIndex]]);
  for (var key in data.numericProps) {
    properties[key] = data.numericProps[key].value[startIndex];
  }
  return properties;
}
function polygonToGeoJson(data) {
  var startIndex = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : -Infinity;
  var endIndex = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : Infinity;
  var positions = data.positions;
  var polygonIndices = data.polygonIndices.value.filter(function (x) {
    return x >= startIndex && x <= endIndex;
  });
  var primitivePolygonIndices = data.primitivePolygonIndices.value.filter(function (x) {
    return x >= startIndex && x <= endIndex;
  });
  var multi = polygonIndices.length > 2;
  if (!multi) {
    var _coordinates = [];
    for (var i = 0; i < primitivePolygonIndices.length - 1; i++) {
      var startRingIndex = primitivePolygonIndices[i];
      var endRingIndex = primitivePolygonIndices[i + 1];
      var ringCoordinates = ringToGeoJson(positions, startRingIndex, endRingIndex);
      _coordinates.push(ringCoordinates);
    }
    return {
      type: 'Polygon',
      coordinates: _coordinates
    };
  }
  var coordinates = [];
  for (var _i = 0; _i < polygonIndices.length - 1; _i++) {
    var startPolygonIndex = polygonIndices[_i];
    var endPolygonIndex = polygonIndices[_i + 1];
    var polygonCoordinates = polygonToGeoJson(data, startPolygonIndex, endPolygonIndex).coordinates;
    coordinates.push(polygonCoordinates);
  }
  return {
    type: 'MultiPolygon',
    coordinates: coordinates
  };
}
function lineStringToGeoJson(data) {
  var startIndex = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : -Infinity;
  var endIndex = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : Infinity;
  var positions = data.positions;
  var pathIndices = data.pathIndices.value.filter(function (x) {
    return x >= startIndex && x <= endIndex;
  });
  var multi = pathIndices.length > 2;
  if (!multi) {
    var _coordinates2 = ringToGeoJson(positions, pathIndices[0], pathIndices[1]);
    return {
      type: 'LineString',
      coordinates: _coordinates2
    };
  }
  var coordinates = [];
  for (var i = 0; i < pathIndices.length - 1; i++) {
    var ringCoordinates = ringToGeoJson(positions, pathIndices[i], pathIndices[i + 1]);
    coordinates.push(ringCoordinates);
  }
  return {
    type: 'MultiLineString',
    coordinates: coordinates
  };
}
function pointToGeoJson(data, startIndex, endIndex) {
  var positions = data.positions;
  var coordinates = ringToGeoJson(positions, startIndex, endIndex);
  var multi = coordinates.length > 1;
  if (multi) {
    return {
      type: 'MultiPoint',
      coordinates: coordinates
    };
  }
  return {
    type: 'Point',
    coordinates: coordinates[0]
  };
}
function ringToGeoJson(positions, startIndex, endIndex) {
  startIndex = startIndex || 0;
  endIndex = endIndex || positions.value.length / positions.size;
  var ringCoordinates = [];
  for (var j = startIndex; j < endIndex; j++) {
    var coord = Array();
    for (var k = j * positions.size; k < (j + 1) * positions.size; k++) {
      coord.push(Number(positions.value[k]));
    }
    ringCoordinates.push(coord);
  }
  return ringCoordinates;
}
function parseType(data) {
  if (data.pathIndices) {
    return 'LineString';
  }
  if (data.polygonIndices) {
    return 'Polygon';
  }
  return 'Point';
}
//# sourceMappingURL=binary-to-geojson.js.map