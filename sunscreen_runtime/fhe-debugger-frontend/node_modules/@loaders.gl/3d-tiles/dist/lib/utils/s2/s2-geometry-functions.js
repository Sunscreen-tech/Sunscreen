"use strict";
// math.gl, MIT license
Object.defineProperty(exports, "__esModule", { value: true });
exports.getS2BoundaryFlat = exports.getS2LngLat = void 0;
const s2_to_boundary_1 = require("./converters/s2-to-boundary");
const s2_geometry_1 = require("./s2geometry/s2-geometry");
const s2_cell_utils_1 = require("./s2geometry/s2-cell-utils");
// GEOMETRY
/**
 * Retrieve S2 geometry center
 * @param s2Token {string} A string that is the cell's hex token
 * @returns {[number, number]} Longitude and Latitude coordinates of the S2 cell's center
 */
function getS2LngLat(s2Token) {
    const s2cell = (0, s2_cell_utils_1.getS2Cell)(s2Token);
    return (0, s2_geometry_1.getS2LngLatFromS2Cell)(s2cell);
}
exports.getS2LngLat = getS2LngLat;
/**
 * Get a polygon with corner coordinates for an s2 cell
 * @param tokenOrKey {string} A string that is the cell's hex token or the Hilbert quad key (containing /)
 * @return {Float64Array} - a simple polygon in flat array format: [lng0, lat0, lng1, lat1, ...]
 *   - the polygon is closed, i.e. last coordinate is a copy of the first coordinate
 */
function getS2BoundaryFlat(tokenOrKey) {
    const s2cell = (0, s2_cell_utils_1.getS2Cell)(tokenOrKey);
    return (0, s2_to_boundary_1.getS2BoundaryFlatFromS2Cell)(s2cell);
}
exports.getS2BoundaryFlat = getS2BoundaryFlat;
