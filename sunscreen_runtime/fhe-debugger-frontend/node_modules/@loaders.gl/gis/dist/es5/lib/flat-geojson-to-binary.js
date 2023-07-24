"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.TEST_EXPORTS = void 0;
exports.flatGeojsonToBinary = flatGeojsonToBinary;
var _defineProperty2 = _interopRequireDefault(require("@babel/runtime/helpers/defineProperty"));
var _polygon = require("@math.gl/polygon");
function _createForOfIteratorHelper(o, allowArrayLike) { var it = typeof Symbol !== "undefined" && o[Symbol.iterator] || o["@@iterator"]; if (!it) { if (Array.isArray(o) || (it = _unsupportedIterableToArray(o)) || allowArrayLike && o && typeof o.length === "number") { if (it) o = it; var i = 0; var F = function F() {}; return { s: F, n: function n() { if (i >= o.length) return { done: true }; return { done: false, value: o[i++] }; }, e: function e(_e) { throw _e; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var normalCompletion = true, didErr = false, err; return { s: function s() { it = it.call(o); }, n: function n() { var step = it.next(); normalCompletion = step.done; return step; }, e: function e(_e2) { didErr = true; err = _e2; }, f: function f() { try { if (!normalCompletion && it.return != null) it.return(); } finally { if (didErr) throw err; } } }; }
function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }
function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) arr2[i] = arr[i]; return arr2; }
function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); enumerableOnly && (symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; })), keys.push.apply(keys, symbols); } return keys; }
function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = null != arguments[i] ? arguments[i] : {}; i % 2 ? ownKeys(Object(source), !0).forEach(function (key) { (0, _defineProperty2.default)(target, key, source[key]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)) : ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } return target; }
function flatGeojsonToBinary(features, geometryInfo, options) {
  var propArrayTypes = extractNumericPropTypes(features);
  var numericPropKeys = Object.keys(propArrayTypes).filter(function (k) {
    return propArrayTypes[k] !== Array;
  });
  return fillArrays(features, _objectSpread({
    propArrayTypes: propArrayTypes
  }, geometryInfo), {
    numericPropKeys: options && options.numericPropKeys || numericPropKeys,
    PositionDataType: options ? options.PositionDataType : Float32Array
  });
}
var TEST_EXPORTS = {
  extractNumericPropTypes: extractNumericPropTypes
};
exports.TEST_EXPORTS = TEST_EXPORTS;
function extractNumericPropTypes(features) {
  var propArrayTypes = {};
  var _iterator = _createForOfIteratorHelper(features),
    _step;
  try {
    for (_iterator.s(); !(_step = _iterator.n()).done;) {
      var feature = _step.value;
      if (feature.properties) {
        for (var _key in feature.properties) {
          var val = feature.properties[_key];
          propArrayTypes[_key] = deduceArrayType(val, propArrayTypes[_key]);
        }
      }
    }
  } catch (err) {
    _iterator.e(err);
  } finally {
    _iterator.f();
  }
  return propArrayTypes;
}
function fillArrays(features, geometryInfo, options) {
  var pointPositionsCount = geometryInfo.pointPositionsCount,
    pointFeaturesCount = geometryInfo.pointFeaturesCount,
    linePositionsCount = geometryInfo.linePositionsCount,
    linePathsCount = geometryInfo.linePathsCount,
    lineFeaturesCount = geometryInfo.lineFeaturesCount,
    polygonPositionsCount = geometryInfo.polygonPositionsCount,
    polygonObjectsCount = geometryInfo.polygonObjectsCount,
    polygonRingsCount = geometryInfo.polygonRingsCount,
    polygonFeaturesCount = geometryInfo.polygonFeaturesCount,
    propArrayTypes = geometryInfo.propArrayTypes,
    coordLength = geometryInfo.coordLength;
  var _options$numericPropK = options.numericPropKeys,
    numericPropKeys = _options$numericPropK === void 0 ? [] : _options$numericPropK,
    _options$PositionData = options.PositionDataType,
    PositionDataType = _options$PositionData === void 0 ? Float32Array : _options$PositionData;
  var hasGlobalId = features[0] && 'id' in features[0];
  var GlobalFeatureIdsDataType = features.length > 65535 ? Uint32Array : Uint16Array;
  var points = {
    type: 'Point',
    positions: new PositionDataType(pointPositionsCount * coordLength),
    globalFeatureIds: new GlobalFeatureIdsDataType(pointPositionsCount),
    featureIds: pointFeaturesCount > 65535 ? new Uint32Array(pointPositionsCount) : new Uint16Array(pointPositionsCount),
    numericProps: {},
    properties: [],
    fields: []
  };
  var lines = {
    type: 'LineString',
    pathIndices: linePositionsCount > 65535 ? new Uint32Array(linePathsCount + 1) : new Uint16Array(linePathsCount + 1),
    positions: new PositionDataType(linePositionsCount * coordLength),
    globalFeatureIds: new GlobalFeatureIdsDataType(linePositionsCount),
    featureIds: lineFeaturesCount > 65535 ? new Uint32Array(linePositionsCount) : new Uint16Array(linePositionsCount),
    numericProps: {},
    properties: [],
    fields: []
  };
  var polygons = {
    type: 'Polygon',
    polygonIndices: polygonPositionsCount > 65535 ? new Uint32Array(polygonObjectsCount + 1) : new Uint16Array(polygonObjectsCount + 1),
    primitivePolygonIndices: polygonPositionsCount > 65535 ? new Uint32Array(polygonRingsCount + 1) : new Uint16Array(polygonRingsCount + 1),
    positions: new PositionDataType(polygonPositionsCount * coordLength),
    triangles: [],
    globalFeatureIds: new GlobalFeatureIdsDataType(polygonPositionsCount),
    featureIds: polygonFeaturesCount > 65535 ? new Uint32Array(polygonPositionsCount) : new Uint16Array(polygonPositionsCount),
    numericProps: {},
    properties: [],
    fields: []
  };
  for (var _i = 0, _arr = [points, lines, polygons]; _i < _arr.length; _i++) {
    var object = _arr[_i];
    var _iterator2 = _createForOfIteratorHelper(numericPropKeys),
      _step2;
    try {
      for (_iterator2.s(); !(_step2 = _iterator2.n()).done;) {
        var propName = _step2.value;
        var T = propArrayTypes[propName];
        object.numericProps[propName] = new T(object.positions.length / coordLength);
      }
    } catch (err) {
      _iterator2.e(err);
    } finally {
      _iterator2.f();
    }
  }
  lines.pathIndices[linePathsCount] = linePositionsCount;
  polygons.polygonIndices[polygonObjectsCount] = polygonPositionsCount;
  polygons.primitivePolygonIndices[polygonRingsCount] = polygonPositionsCount;
  var indexMap = {
    pointPosition: 0,
    pointFeature: 0,
    linePosition: 0,
    linePath: 0,
    lineFeature: 0,
    polygonPosition: 0,
    polygonObject: 0,
    polygonRing: 0,
    polygonFeature: 0,
    feature: 0
  };
  var _iterator3 = _createForOfIteratorHelper(features),
    _step3;
  try {
    for (_iterator3.s(); !(_step3 = _iterator3.n()).done;) {
      var feature = _step3.value;
      var geometry = feature.geometry;
      var properties = feature.properties || {};
      switch (geometry.type) {
        case 'Point':
          handlePoint(geometry, points, indexMap, coordLength, properties);
          points.properties.push(keepStringProperties(properties, numericPropKeys));
          if (hasGlobalId) {
            points.fields.push({
              id: feature.id
            });
          }
          indexMap.pointFeature++;
          break;
        case 'LineString':
          handleLineString(geometry, lines, indexMap, coordLength, properties);
          lines.properties.push(keepStringProperties(properties, numericPropKeys));
          if (hasGlobalId) {
            lines.fields.push({
              id: feature.id
            });
          }
          indexMap.lineFeature++;
          break;
        case 'Polygon':
          handlePolygon(geometry, polygons, indexMap, coordLength, properties);
          polygons.properties.push(keepStringProperties(properties, numericPropKeys));
          if (hasGlobalId) {
            polygons.fields.push({
              id: feature.id
            });
          }
          indexMap.polygonFeature++;
          break;
        default:
          throw new Error('Invalid geometry type');
      }
      indexMap.feature++;
    }
  } catch (err) {
    _iterator3.e(err);
  } finally {
    _iterator3.f();
  }
  return makeAccessorObjects(points, lines, polygons, coordLength);
}
function handlePoint(geometry, points, indexMap, coordLength, properties) {
  points.positions.set(geometry.data, indexMap.pointPosition * coordLength);
  var nPositions = geometry.data.length / coordLength;
  fillNumericProperties(points, properties, indexMap.pointPosition, nPositions);
  points.globalFeatureIds.fill(indexMap.feature, indexMap.pointPosition, indexMap.pointPosition + nPositions);
  points.featureIds.fill(indexMap.pointFeature, indexMap.pointPosition, indexMap.pointPosition + nPositions);
  indexMap.pointPosition += nPositions;
}
function handleLineString(geometry, lines, indexMap, coordLength, properties) {
  lines.positions.set(geometry.data, indexMap.linePosition * coordLength);
  var nPositions = geometry.data.length / coordLength;
  fillNumericProperties(lines, properties, indexMap.linePosition, nPositions);
  lines.globalFeatureIds.fill(indexMap.feature, indexMap.linePosition, indexMap.linePosition + nPositions);
  lines.featureIds.fill(indexMap.lineFeature, indexMap.linePosition, indexMap.linePosition + nPositions);
  for (var i = 0, il = geometry.indices.length; i < il; ++i) {
    var start = geometry.indices[i];
    var end = i === il - 1 ? geometry.data.length : geometry.indices[i + 1];
    lines.pathIndices[indexMap.linePath++] = indexMap.linePosition;
    indexMap.linePosition += (end - start) / coordLength;
  }
}
function handlePolygon(geometry, polygons, indexMap, coordLength, properties) {
  polygons.positions.set(geometry.data, indexMap.polygonPosition * coordLength);
  var nPositions = geometry.data.length / coordLength;
  fillNumericProperties(polygons, properties, indexMap.polygonPosition, nPositions);
  polygons.globalFeatureIds.fill(indexMap.feature, indexMap.polygonPosition, indexMap.polygonPosition + nPositions);
  polygons.featureIds.fill(indexMap.polygonFeature, indexMap.polygonPosition, indexMap.polygonPosition + nPositions);
  for (var l = 0, ll = geometry.indices.length; l < ll; ++l) {
    var startPosition = indexMap.polygonPosition;
    polygons.polygonIndices[indexMap.polygonObject++] = startPosition;
    var areas = geometry.areas[l];
    var indices = geometry.indices[l];
    var nextIndices = geometry.indices[l + 1];
    for (var i = 0, il = indices.length; i < il; ++i) {
      var start = indices[i];
      var end = i === il - 1 ? nextIndices === undefined ? geometry.data.length : nextIndices[0] : indices[i + 1];
      polygons.primitivePolygonIndices[indexMap.polygonRing++] = indexMap.polygonPosition;
      indexMap.polygonPosition += (end - start) / coordLength;
    }
    var endPosition = indexMap.polygonPosition;
    triangulatePolygon(polygons, areas, indices, {
      startPosition: startPosition,
      endPosition: endPosition,
      coordLength: coordLength
    });
  }
}
function triangulatePolygon(polygons, areas, indices, _ref) {
  var startPosition = _ref.startPosition,
    endPosition = _ref.endPosition,
    coordLength = _ref.coordLength;
  var start = startPosition * coordLength;
  var end = endPosition * coordLength;
  var polygonPositions = polygons.positions.subarray(start, end);
  var offset = indices[0];
  var holes = indices.slice(1).map(function (n) {
    return (n - offset) / coordLength;
  });
  var triangles = (0, _polygon.earcut)(polygonPositions, holes, coordLength, areas);
  for (var t = 0, tl = triangles.length; t < tl; ++t) {
    polygons.triangles.push(startPosition + triangles[t]);
  }
}
function wrapProps(obj, size) {
  var returnObj = {};
  for (var _key2 in obj) {
    returnObj[_key2] = {
      value: obj[_key2],
      size: size
    };
  }
  return returnObj;
}
function makeAccessorObjects(points, lines, polygons, coordLength) {
  return {
    points: _objectSpread(_objectSpread({}, points), {}, {
      positions: {
        value: points.positions,
        size: coordLength
      },
      globalFeatureIds: {
        value: points.globalFeatureIds,
        size: 1
      },
      featureIds: {
        value: points.featureIds,
        size: 1
      },
      numericProps: wrapProps(points.numericProps, 1)
    }),
    lines: _objectSpread(_objectSpread({}, lines), {}, {
      positions: {
        value: lines.positions,
        size: coordLength
      },
      pathIndices: {
        value: lines.pathIndices,
        size: 1
      },
      globalFeatureIds: {
        value: lines.globalFeatureIds,
        size: 1
      },
      featureIds: {
        value: lines.featureIds,
        size: 1
      },
      numericProps: wrapProps(lines.numericProps, 1)
    }),
    polygons: _objectSpread(_objectSpread({}, polygons), {}, {
      positions: {
        value: polygons.positions,
        size: coordLength
      },
      polygonIndices: {
        value: polygons.polygonIndices,
        size: 1
      },
      primitivePolygonIndices: {
        value: polygons.primitivePolygonIndices,
        size: 1
      },
      triangles: {
        value: new Uint32Array(polygons.triangles),
        size: 1
      },
      globalFeatureIds: {
        value: polygons.globalFeatureIds,
        size: 1
      },
      featureIds: {
        value: polygons.featureIds,
        size: 1
      },
      numericProps: wrapProps(polygons.numericProps, 1)
    })
  };
}
function fillNumericProperties(object, properties, index, length) {
  for (var numericPropName in object.numericProps) {
    if (numericPropName in properties) {
      var value = properties[numericPropName];
      object.numericProps[numericPropName].fill(value, index, index + length);
    }
  }
}
function keepStringProperties(properties, numericKeys) {
  var props = {};
  for (var _key3 in properties) {
    if (!numericKeys.includes(_key3)) {
      props[_key3] = properties[_key3];
    }
  }
  return props;
}
function deduceArrayType(x, constructor) {
  if (constructor === Array || !Number.isFinite(x)) {
    return Array;
  }
  return constructor === Float64Array || Math.fround(x) !== x ? Float64Array : Float32Array;
}
//# sourceMappingURL=flat-geojson-to-binary.js.map