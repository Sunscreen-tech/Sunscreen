import type { S2Cell } from '../s2geometry/s2-geometry';
/**
 * Converts S2 cell to the 2D region
 * @param s2cell {S2Cell} S2 cell to convert to 2D region
 * @returns 2D region as an object containing: west, north, east, south in degrees
 */
export declare function getS2Region(s2cell: S2Cell): {
    west: number;
    east: number;
    north: number;
    south: number;
};
//# sourceMappingURL=s2-to-region.d.ts.map