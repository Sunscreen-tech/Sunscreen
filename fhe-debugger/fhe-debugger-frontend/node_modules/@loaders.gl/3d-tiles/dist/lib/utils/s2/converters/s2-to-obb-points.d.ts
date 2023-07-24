import { Vector3 } from '@math.gl/core';
export type S2HeightInfo = {
    minimumHeight: number;
    maximumHeight: number;
};
/**
 * Converts S2HeightInfo to corner points of an oriented bounding box
 * Can be used to constuct an OrientedBoundingBox instance
 * @param tokenOrKey {string} A string that is the cell's hex token or the Hilbert quad key (containing /)
 * @param heightInfo {S2HeightInfo} min and max height of the box
 * @returns corner points of the oriented bounding box
 */
export declare function getS2OrientedBoundingBoxCornerPoints(tokenOrKey: string, // This can be an S2 key or token
heightInfo?: S2HeightInfo): Vector3[];
//# sourceMappingURL=s2-to-obb-points.d.ts.map