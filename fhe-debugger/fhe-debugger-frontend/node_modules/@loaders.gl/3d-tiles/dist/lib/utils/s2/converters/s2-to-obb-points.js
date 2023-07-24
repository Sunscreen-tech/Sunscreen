"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getS2OrientedBoundingBoxCornerPoints = void 0;
const s2_cell_utils_1 = require("../s2geometry/s2-cell-utils");
const s2_to_region_1 = require("./s2-to-region");
const core_1 = require("@math.gl/core");
/**
 * Converts S2HeightInfo to corner points of an oriented bounding box
 * Can be used to constuct an OrientedBoundingBox instance
 * @param tokenOrKey {string} A string that is the cell's hex token or the Hilbert quad key (containing /)
 * @param heightInfo {S2HeightInfo} min and max height of the box
 * @returns corner points of the oriented bounding box
 */
function getS2OrientedBoundingBoxCornerPoints(tokenOrKey, // This can be an S2 key or token
heightInfo) {
    const min = heightInfo?.minimumHeight || 0;
    const max = heightInfo?.maximumHeight || 0;
    const s2cell = (0, s2_cell_utils_1.getS2Cell)(tokenOrKey);
    const region = (0, s2_to_region_1.getS2Region)(s2cell);
    // region lng/lat are in degrees
    const W = region.west;
    const S = region.south;
    const E = region.east;
    const N = region.north;
    const points = [];
    points.push(new core_1.Vector3(W, N, min));
    points.push(new core_1.Vector3(E, N, min));
    points.push(new core_1.Vector3(E, S, min));
    points.push(new core_1.Vector3(W, S, min));
    points.push(new core_1.Vector3(W, N, max));
    points.push(new core_1.Vector3(E, N, max));
    points.push(new core_1.Vector3(E, S, max));
    points.push(new core_1.Vector3(W, S, max));
    return points;
}
exports.getS2OrientedBoundingBoxCornerPoints = getS2OrientedBoundingBoxCornerPoints;
