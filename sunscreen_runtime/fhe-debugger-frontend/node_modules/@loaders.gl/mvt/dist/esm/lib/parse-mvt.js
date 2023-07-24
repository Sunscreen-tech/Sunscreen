import { flatGeojsonToBinary } from '@loaders.gl/gis';
import Protobuf from 'pbf';
import VectorTile from './mapbox-vector-tile/vector-tile';
import BinaryVectorTile from './binary-vector-tile/vector-tile';
export default function parseMVT(arrayBuffer, options) {
  var _options$gis, _options$mvt;
  const mvtOptions = normalizeOptions(options);
  const shape = (options === null || options === void 0 ? void 0 : (_options$gis = options.gis) === null || _options$gis === void 0 ? void 0 : _options$gis.format) || (options === null || options === void 0 ? void 0 : (_options$mvt = options.mvt) === null || _options$mvt === void 0 ? void 0 : _options$mvt.shape);
  switch (shape) {
    case 'columnar-table':
      return {
        shape: 'columnar-table',
        data: parseToBinary(arrayBuffer, mvtOptions)
      };
    case 'geojson-row-table':
      {
        const table = {
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
  const [flatGeoJsonFeatures, geometryInfo] = parseToFlatGeoJson(arrayBuffer, options);
  const binaryData = flatGeojsonToBinary(flatGeoJsonFeatures, geometryInfo);
  binaryData.byteLength = arrayBuffer.byteLength;
  return binaryData;
}
function parseToFlatGeoJson(arrayBuffer, options) {
  const features = [];
  const geometryInfo = {
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
  const tile = new BinaryVectorTile(new Protobuf(arrayBuffer));
  const selectedLayers = options && Array.isArray(options.layers) ? options.layers : Object.keys(tile.layers);
  selectedLayers.forEach(layerName => {
    const vectorTileLayer = tile.layers[layerName];
    if (!vectorTileLayer) {
      return;
    }
    for (let i = 0; i < vectorTileLayer.length; i++) {
      const vectorTileFeature = vectorTileLayer.feature(i, geometryInfo);
      const decodedFeature = getDecodedFeatureBinary(vectorTileFeature, options, layerName);
      features.push(decodedFeature);
    }
  });
  return [features, geometryInfo];
}
function parseToGeojson(arrayBuffer, options) {
  if (arrayBuffer.byteLength <= 0) {
    return [];
  }
  const features = [];
  const tile = new VectorTile(new Protobuf(arrayBuffer));
  const selectedLayers = Array.isArray(options.layers) ? options.layers : Object.keys(tile.layers);
  selectedLayers.forEach(layerName => {
    const vectorTileLayer = tile.layers[layerName];
    if (!vectorTileLayer) {
      return;
    }
    for (let i = 0; i < vectorTileLayer.length; i++) {
      const vectorTileFeature = vectorTileLayer.feature(i);
      const decodedFeature = getDecodedFeature(vectorTileFeature, options, layerName);
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
  const wgs84Coordinates = ((_options$mvt2 = options.mvt) === null || _options$mvt2 === void 0 ? void 0 : _options$mvt2.coordinates) === 'wgs84';
  const {
    tileIndex
  } = options.mvt;
  const hasTileIndex = tileIndex && Number.isFinite(tileIndex.x) && Number.isFinite(tileIndex.y) && Number.isFinite(tileIndex.z);
  if (wgs84Coordinates && !hasTileIndex) {
    throw new Error('MVT Loader: WGS84 coordinates need tileIndex property');
  }
  return options.mvt;
}
function getDecodedFeature(feature, options, layerName) {
  const decodedFeature = feature.toGeoJSON(options.coordinates === 'wgs84' ? options.tileIndex : transformToLocalCoordinates);
  if (options.layerProperty) {
    decodedFeature.properties[options.layerProperty] = layerName;
  }
  return decodedFeature;
}
function getDecodedFeatureBinary(feature, options, layerName) {
  const decodedFeature = feature.toBinaryCoordinates(options.coordinates === 'wgs84' ? options.tileIndex : transformToLocalCoordinatesBinary);
  if (options.layerProperty && decodedFeature.properties) {
    decodedFeature.properties[options.layerProperty] = layerName;
  }
  return decodedFeature;
}
function transformToLocalCoordinates(line, feature) {
  const {
    extent
  } = feature;
  for (let i = 0; i < line.length; i++) {
    const p = line[i];
    p[0] /= extent;
    p[1] /= extent;
  }
}
function transformToLocalCoordinatesBinary(data, feature) {
  const {
    extent
  } = feature;
  for (let i = 0, il = data.length; i < il; ++i) {
    data[i] /= extent;
  }
}
//# sourceMappingURL=parse-mvt.js.map