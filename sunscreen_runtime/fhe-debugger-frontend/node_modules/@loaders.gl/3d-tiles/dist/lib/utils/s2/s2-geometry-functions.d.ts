/**
 * Retrieve S2 geometry center
 * @param s2Token {string} A string that is the cell's hex token
 * @returns {[number, number]} Longitude and Latitude coordinates of the S2 cell's center
 */
export declare function getS2LngLat(s2Token: string): [number, number];
/**
 * Get a polygon with corner coordinates for an s2 cell
 * @param tokenOrKey {string} A string that is the cell's hex token or the Hilbert quad key (containing /)
 * @return {Float64Array} - a simple polygon in flat array format: [lng0, lat0, lng1, lat1, ...]
 *   - the polygon is closed, i.e. last coordinate is a copy of the first coordinate
 */
export declare function getS2BoundaryFlat(tokenOrKey: string): Float64Array;
//# sourceMappingURL=s2-geometry-functions.d.ts.map