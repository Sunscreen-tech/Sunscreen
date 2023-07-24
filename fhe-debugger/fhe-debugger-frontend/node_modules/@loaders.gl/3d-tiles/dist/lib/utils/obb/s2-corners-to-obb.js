"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.convertS2BoundingVolumetoOBB = void 0;
const core_1 = require("@math.gl/core");
const culling_1 = require("@math.gl/culling");
const index_1 = require("../../utils/s2/index");
const index_2 = require("../../utils/s2/index");
const geospatial_1 = require("@math.gl/geospatial");
/**
 * Converts S2VolumeInfo to OrientedBoundingBox
 * @param {S2VolumeInfo} s2VolumeInfo - s2 volume to convert
 * @returns Oriented Bounding Box of type Box
 */
function convertS2BoundingVolumetoOBB(s2VolumeInfo) {
    const token = s2VolumeInfo.token;
    const heightInfo = {
        minimumHeight: s2VolumeInfo.minimumHeight,
        maximumHeight: s2VolumeInfo.maximumHeight
    };
    const corners = (0, index_1.getS2OrientedBoundingBoxCornerPoints)(token, heightInfo);
    // Add a point that doesn't allow the box dive under the Earth
    const center = (0, index_2.getS2LngLat)(token);
    const centerLng = center[0];
    const centerLat = center[1];
    const point = geospatial_1.Ellipsoid.WGS84.cartographicToCartesian([
        centerLng,
        centerLat,
        heightInfo.maximumHeight
    ]);
    const centerPointAdditional = new core_1.Vector3(point[0], point[1], point[2]);
    corners.push(centerPointAdditional);
    // corners should be an array of Vector3 (XYZ)
    const obb = (0, culling_1.makeOrientedBoundingBoxFromPoints)(corners);
    const box = [...obb.center, ...obb.halfAxes];
    return box;
}
exports.convertS2BoundingVolumetoOBB = convertS2BoundingVolumetoOBB;
