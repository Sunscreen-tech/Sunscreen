"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const gis_1 = require("@loaders.gl/gis");
const pbf_1 = __importDefault(require("pbf"));
const vector_tile_1 = __importDefault(require("./mapbox-vector-tile/vector-tile"));
const vector_tile_2 = __importDefault(require("./binary-vector-tile/vector-tile"));
/**
 * Parse MVT arrayBuffer and return GeoJSON.
 *
 * @param arrayBuffer A MVT arrayBuffer
 * @param options
 * @returns A GeoJSON geometry object or a binary representation
 */
function parseMVT(arrayBuffer, options) {
    const mvtOptions = normalizeOptions(options);
    const shape = options?.gis?.format || options?.mvt?.shape;
    switch (shape) {
        case 'columnar-table': // binary + some JS arrays
            return { shape: 'columnar-table', data: parseToBinary(arrayBuffer, mvtOptions) };
        case 'geojson-row-table': {
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
exports.default = parseMVT;
function parseToBinary(arrayBuffer, options) {
    const [flatGeoJsonFeatures, geometryInfo] = parseToFlatGeoJson(arrayBuffer, options);
    const binaryData = (0, gis_1.flatGeojsonToBinary)(flatGeoJsonFeatures, geometryInfo);
    // Add the original byteLength (as a reasonable approximation of the size of the binary data)
    // TODO decide where to store extra fields like byteLength (header etc) and document
    // @ts-ignore
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
    const tile = new vector_tile_2.default(new pbf_1.default(arrayBuffer));
    const selectedLayers = options && Array.isArray(options.layers) ? options.layers : Object.keys(tile.layers);
    selectedLayers.forEach((layerName) => {
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
    const tile = new vector_tile_1.default(new pbf_1.default(arrayBuffer));
    const selectedLayers = Array.isArray(options.layers) ? options.layers : Object.keys(tile.layers);
    selectedLayers.forEach((layerName) => {
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
    if (!options?.mvt) {
        throw new Error('mvt options required');
    }
    // Validate
    const wgs84Coordinates = options.mvt?.coordinates === 'wgs84';
    const { tileIndex } = options.mvt;
    const hasTileIndex = tileIndex &&
        Number.isFinite(tileIndex.x) &&
        Number.isFinite(tileIndex.y) &&
        Number.isFinite(tileIndex.z);
    if (wgs84Coordinates && !hasTileIndex) {
        throw new Error('MVT Loader: WGS84 coordinates need tileIndex property');
    }
    return options.mvt;
}
/**
 * @param feature
 * @param options
 * @returns decoded feature
 */
function getDecodedFeature(feature, options, layerName) {
    const decodedFeature = feature.toGeoJSON(options.coordinates === 'wgs84' ? options.tileIndex : transformToLocalCoordinates);
    // Add layer name to GeoJSON properties
    if (options.layerProperty) {
        decodedFeature.properties[options.layerProperty] = layerName;
    }
    return decodedFeature;
}
/**
 * @param feature
 * @param options
 * @returns decoded binary feature
 */
function getDecodedFeatureBinary(feature, options, layerName) {
    const decodedFeature = feature.toBinaryCoordinates(options.coordinates === 'wgs84' ? options.tileIndex : transformToLocalCoordinatesBinary);
    // Add layer name to GeoJSON properties
    if (options.layerProperty && decodedFeature.properties) {
        decodedFeature.properties[options.layerProperty] = layerName;
    }
    return decodedFeature;
}
/**
 * @param line
 * @param feature
 */
function transformToLocalCoordinates(line, feature) {
    // This function transforms local coordinates in a
    // [0 - bufferSize, this.extent + bufferSize] range to a
    // [0 - (bufferSize / this.extent), 1 + (bufferSize / this.extent)] range.
    // The resulting extent would be 1.
    const { extent } = feature;
    for (let i = 0; i < line.length; i++) {
        const p = line[i];
        p[0] /= extent;
        p[1] /= extent;
    }
}
function transformToLocalCoordinatesBinary(data, feature) {
    // For the binary code path, the feature data is just
    // one big flat array, so we just divide each value
    const { extent } = feature;
    for (let i = 0, il = data.length; i < il; ++i) {
        data[i] /= extent;
    }
}
