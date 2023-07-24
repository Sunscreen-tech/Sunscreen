import type { S2Cell } from '../s2geometry/s2-geometry';
/**
 * Get a polygon with corner coordinates for an S2 cell
 * @param s2cell {S2Cell} S2 cell
 * @return {Float64Array} - a simple polygon in flat array format: [lng0, lat0, lng1, lat1, ...]
 *   - the polygon is closed, i.e. last coordinate is a copy of the first coordinate
 */
export declare function getS2BoundaryFlatFromS2Cell(s2cell: S2Cell): Float64Array;
//# sourceMappingURL=s2-to-boundary.d.ts.map