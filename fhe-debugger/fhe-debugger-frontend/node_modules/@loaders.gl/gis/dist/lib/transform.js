"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transformGeoJsonCoords = exports.transformBinaryCoords = void 0;
/**
 * Apply transformation to every coordinate of binary features
 * @param  binaryFeatures binary features
 * @param  transformCoordinate Function to call on each coordinate
 * @return Transformed binary features
 */
function transformBinaryCoords(binaryFeatures, transformCoordinate) {
    if (binaryFeatures.points) {
        transformBinaryGeometryPositions(binaryFeatures.points, transformCoordinate);
    }
    if (binaryFeatures.lines) {
        transformBinaryGeometryPositions(binaryFeatures.lines, transformCoordinate);
    }
    if (binaryFeatures.polygons) {
        transformBinaryGeometryPositions(binaryFeatures.polygons, transformCoordinate);
    }
    return binaryFeatures;
}
exports.transformBinaryCoords = transformBinaryCoords;
/** Transform one binary geometry */
function transformBinaryGeometryPositions(binaryGeometry, fn) {
    const { positions } = binaryGeometry;
    for (let i = 0; i < positions.value.length; i += positions.size) {
        // @ts-ignore inclusion of bigint causes problems
        const coord = Array.from(positions.value.subarray(i, i + positions.size));
        const transformedCoord = fn(coord);
        // @ts-ignore typescript typing for .set seems to require bigint?
        positions.value.set(transformedCoord, i);
    }
}
/**
 * Apply transformation to every coordinate of GeoJSON features
 *
 * @param  features Array of GeoJSON features
 * @param  fn       Function to call on each coordinate
 * @return          Transformed GeoJSON features
 */
function transformGeoJsonCoords(features, fn) {
    for (const feature of features) {
        // @ts-ignore
        feature.geometry.coordinates = coordMap(feature.geometry.coordinates, fn);
    }
    return features;
}
exports.transformGeoJsonCoords = transformGeoJsonCoords;
function coordMap(array, fn) {
    if (isCoord(array)) {
        return fn(array);
    }
    return array.map((item) => {
        return coordMap(item, fn);
    });
}
function isCoord(array) {
    return Number.isFinite(array[0]) && Number.isFinite(array[1]);
}
