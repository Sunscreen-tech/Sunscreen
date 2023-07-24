"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.geojsonToBinary = void 0;
const extract_geometry_info_1 = require("./extract-geometry-info");
const geojson_to_flat_geojson_1 = require("./geojson-to-flat-geojson");
const flat_geojson_to_binary_1 = require("./flat-geojson-to-binary");
/**
 * Convert GeoJSON features to flat binary arrays
 *
 * @param features
 * @param options
 * @returns features in binary format, grouped by geometry type
 */
function geojsonToBinary(features, options = { fixRingWinding: true }) {
    const geometryInfo = (0, extract_geometry_info_1.extractGeometryInfo)(features);
    const coordLength = geometryInfo.coordLength;
    const { fixRingWinding } = options;
    const flatFeatures = (0, geojson_to_flat_geojson_1.geojsonToFlatGeojson)(features, { coordLength, fixRingWinding });
    return (0, flat_geojson_to_binary_1.flatGeojsonToBinary)(flatFeatures, geometryInfo, {
        numericPropKeys: options.numericPropKeys,
        PositionDataType: options.PositionDataType || Float32Array
    });
}
exports.geojsonToBinary = geojsonToBinary;
