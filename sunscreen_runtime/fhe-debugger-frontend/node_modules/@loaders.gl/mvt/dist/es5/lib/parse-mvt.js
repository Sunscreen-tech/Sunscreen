"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = parseMVT;
var _slicedToArray2 = _interopRequireDefault(require("@babel/runtime/helpers/slicedToArray"));
var _gis = require("@loaders.gl/gis");
var _pbf = _interopRequireDefault(require("pbf"));
var _vectorTile = _interopRequireDefault(require("./mapbox-vector-tile/vector-tile"));
var _vectorTile2 = _interopRequireDefault(require("./binary-vector-tile/vector-tile"));
function parseMVT(arrayBuffer, options) {
  var _options$gis, _options$mvt;
  var mvtOptions = normalizeOptions(options);
  var shape = (options === null || options === void 0 ? void 0 : (_options$gis = options.gis) === null || _options$gis === void 0 ? void 0 : _options$gis.format) || (options === null || options === void 0 ? void 0 : (_options$mvt = options.mvt) === null || _options$mvt === void 0 ? void 0 : _options$mvt.shape);
  switch (shape) {
    case 'columnar-table':
      return {
        shape: 'columnar-table',
        data: parseToBinary(arrayBuffer, mvtOptions)
      };
    case 'geojson-row-table':
      {
        var table = {
          shape: 'geojson-row-table',
          data: parseToGeojson(arrayBuffer, mvtOptions)
        };
        return table;
      }
    case 'geojson':
      return parseToGeojson(arrayBuffer, mvtOptions);
    case 'binary-geometry':
      return parseToBinary(arrayBuffer, mvtOptions);
    case 'binary':
      return parseToBinary(arrayBuffer, mvtOptions);
    default:
      throw new Error(shape);
  }
}
function parseToBinary(arrayBuffer, options) {
  var _parseToFlatGeoJson = parseToFlatGeoJson(arrayBuffer, options),
    _parseToFlatGeoJson2 = (0, _slicedToArray2.default)(_parseToFlatGeoJson, 2),
    flatGeoJsonFeatures = _parseToFlatGeoJson2[0],
    geometryInfo = _parseToFlatGeoJson2[1];
  var binaryData = (0, _gis.flatGeojsonToBinary)(flatGeoJsonFeatures, geometryInfo);
  binaryData.byteLength = arrayBuffer.byteLength;
  return binaryData;
}
function parseToFlatGeoJson(arrayBuffer, options) {
  var features = [];
  var geometryInfo = {
    coordLength: 2,
    pointPositionsCount: 0,
    pointFeaturesCount: 0,
    linePositionsCount: 0,
    linePathsCount: 0,
    lineFeaturesCount: 0,
    polygonPositionsCount: 0,
    polygonObjectsCount: 0,
    polygonRingsCount: 0,
    polygonFeaturesCount: 0
  };
  if (arrayBuffer.byteLength <= 0) {
    return [features, geometryInfo];
  }
  var tile = new _vectorTile2.default(new _pbf.default(arrayBuffer));
  var selectedLayers = options && Array.isArray(options.layers) ? options.layers : Object.keys(tile.layers);
  selectedLayers.forEach(function (layerName) {
    var vectorTileLayer = tile.layers[layerName];
    if (!vectorTileLayer) {
      return;
    }
    for (var i = 0; i < vectorTileLayer.length; i++) {
      var vectorTileFeature = vectorTileLayer.feature(i, geometryInfo);
      var decodedFeature = getDecodedFeatureBinary(vectorTileFeature, options, layerName);
      features.push(decodedFeature);
    }
  });
  return [features, geometryInfo];
}
function parseToGeojson(arrayBuffer, options) {
  if (arrayBuffer.byteLength <= 0) {
    return [];
  }
  var features = [];
  var tile = new _vectorTile.default(new _pbf.default(arrayBuffer));
  var selectedLayers = Array.isArray(options.layers) ? options.layers : Object.keys(tile.layers);
  selectedLayers.forEach(function (layerName) {
    var vectorTileLayer = tile.layers[layerName];
    if (!vectorTileLayer) {
      return;
    }
    for (var i = 0; i < vectorTileLayer.length; i++) {
      var vectorTileFeature = vectorTileLayer.feature(i);
      var decodedFeature = getDecodedFeature(vectorTileFeature, options, layerName);
      features.push(decodedFeature);
    }
  });
  return features;
}
function normalizeOptions(options) {
  var _options$mvt2;
  if (!(options !== null && options !== void 0 && options.mvt)) {
    throw new Error('mvt options required');
  }
  var wgs84Coordinates = ((_options$mvt2 = options.mvt) === null || _options$mvt2 === void 0 ? void 0 : _options$mvt2.coordinates) === 'wgs84';
  var tileIndex = options.mvt.tileIndex;
  var hasTileIndex = tileIndex && Number.isFinite(tileIndex.x) && Number.isFinite(tileIndex.y) && Number.isFinite(tileIndex.z);
  if (wgs84Coordinates && !hasTileIndex) {
    throw new Error('MVT Loader: WGS84 coordinates need tileIndex property');
  }
  return options.mvt;
}
function getDecodedFeature(feature, options, layerName) {
  var decodedFeature = feature.toGeoJSON(options.coordinates === 'wgs84' ? options.tileIndex : transformToLocalCoordinates);
  if (options.layerProperty) {
    decodedFeature.properties[options.layerProperty] = layerName;
  }
  return decodedFeature;
}
function getDecodedFeatureBinary(feature, options, layerName) {
  var decodedFeature = feature.toBinaryCoordinates(options.coordinates === 'wgs84' ? options.tileIndex : transformToLocalCoordinatesBinary);
  if (options.layerProperty && decodedFeature.properties) {
    decodedFeature.properties[options.layerProperty] = layerName;
  }
  return decodedFeature;
}
function transformToLocalCoordinates(line, feature) {
  var extent = feature.extent;
  for (var i = 0; i < line.length; i++) {
    var p = line[i];
    p[0] /= extent;
    p[1] /= extent;
  }
}
function transformToLocalCoordinatesBinary(data, feature) {
  var extent = feature.extent;
  for (var i = 0, il = data.length; i < il; ++i) {
    data[i] /= extent;
  }
}
//# sourceMappingURL=parse-mvt.js.map