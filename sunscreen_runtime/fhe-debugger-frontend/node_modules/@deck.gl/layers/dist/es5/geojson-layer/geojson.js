"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getGeojsonFeatures = getGeojsonFeatures;
exports.separateGeojsonFeatures = separateGeojsonFeatures;
exports.validateGeometry = validateGeometry;

var _core = require("@deck.gl/core");

function getGeojsonFeatures(geojson) {
  if (Array.isArray(geojson)) {
    return geojson;
  }

  _core.log.assert(geojson.type, 'GeoJSON does not have type');

  switch (geojson.type) {
    case 'Feature':
      return [geojson];

    case 'FeatureCollection':
      _core.log.assert(Array.isArray(geojson.features), 'GeoJSON does not have features array');

      return geojson.features;

    default:
      return [{
        geometry: geojson
      }];
  }
}

function separateGeojsonFeatures(features, wrapFeature) {
  var dataRange = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
  var separated = {
    pointFeatures: [],
    lineFeatures: [],
    polygonFeatures: [],
    polygonOutlineFeatures: []
  };
  var _dataRange$startRow = dataRange.startRow,
      startRow = _dataRange$startRow === void 0 ? 0 : _dataRange$startRow,
      _dataRange$endRow = dataRange.endRow,
      endRow = _dataRange$endRow === void 0 ? features.length : _dataRange$endRow;

  for (var featureIndex = startRow; featureIndex < endRow; featureIndex++) {
    var feature = features[featureIndex];
    var geometry = feature.geometry;

    if (!geometry) {
      continue;
    }

    if (geometry.type === 'GeometryCollection') {
      _core.log.assert(Array.isArray(geometry.geometries), 'GeoJSON does not have geometries array');

      var geometries = geometry.geometries;

      for (var i = 0; i < geometries.length; i++) {
        var subGeometry = geometries[i];
        separateGeometry(subGeometry, separated, wrapFeature, feature, featureIndex);
      }
    } else {
      separateGeometry(geometry, separated, wrapFeature, feature, featureIndex);
    }
  }

  return separated;
}

function separateGeometry(geometry, separated, wrapFeature, sourceFeature, sourceFeatureIndex) {
  var type = geometry.type,
      coordinates = geometry.coordinates;
  var pointFeatures = separated.pointFeatures,
      lineFeatures = separated.lineFeatures,
      polygonFeatures = separated.polygonFeatures,
      polygonOutlineFeatures = separated.polygonOutlineFeatures;

  if (!validateGeometry(type, coordinates)) {
    _core.log.warn("".concat(type, " coordinates are malformed"))();

    return;
  }

  switch (type) {
    case 'Point':
      pointFeatures.push(wrapFeature({
        geometry: geometry
      }, sourceFeature, sourceFeatureIndex));
      break;

    case 'MultiPoint':
      coordinates.forEach(function (point) {
        pointFeatures.push(wrapFeature({
          geometry: {
            type: 'Point',
            coordinates: point
          }
        }, sourceFeature, sourceFeatureIndex));
      });
      break;

    case 'LineString':
      lineFeatures.push(wrapFeature({
        geometry: geometry
      }, sourceFeature, sourceFeatureIndex));
      break;

    case 'MultiLineString':
      coordinates.forEach(function (path) {
        lineFeatures.push(wrapFeature({
          geometry: {
            type: 'LineString',
            coordinates: path
          }
        }, sourceFeature, sourceFeatureIndex));
      });
      break;

    case 'Polygon':
      polygonFeatures.push(wrapFeature({
        geometry: geometry
      }, sourceFeature, sourceFeatureIndex));
      coordinates.forEach(function (path) {
        polygonOutlineFeatures.push(wrapFeature({
          geometry: {
            type: 'LineString',
            coordinates: path
          }
        }, sourceFeature, sourceFeatureIndex));
      });
      break;

    case 'MultiPolygon':
      coordinates.forEach(function (polygon) {
        polygonFeatures.push(wrapFeature({
          geometry: {
            type: 'Polygon',
            coordinates: polygon
          }
        }, sourceFeature, sourceFeatureIndex));
        polygon.forEach(function (path) {
          polygonOutlineFeatures.push(wrapFeature({
            geometry: {
              type: 'LineString',
              coordinates: path
            }
          }, sourceFeature, sourceFeatureIndex));
        });
      });
      break;

    default:
  }
}

var COORDINATE_NEST_LEVEL = {
  Point: 1,
  MultiPoint: 2,
  LineString: 2,
  MultiLineString: 3,
  Polygon: 3,
  MultiPolygon: 4
};

function validateGeometry(type, coordinates) {
  var nestLevel = COORDINATE_NEST_LEVEL[type];

  _core.log.assert(nestLevel, "Unknown GeoJSON type ".concat(type));

  while (coordinates && --nestLevel > 0) {
    coordinates = coordinates[0];
  }

  return coordinates && Number.isFinite(coordinates[0]);
}
//# sourceMappingURL=geojson.js.map