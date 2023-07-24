"use strict";
// loaders.gl, MIT license
Object.defineProperty(exports, "__esModule", { value: true });
exports.getZoomFromExtent = exports.getZoomFromFullExtent = exports.getZoomFromBoundingVolume = void 0;
const core_1 = require("@math.gl/core");
const culling_1 = require("@math.gl/culling");
const geospatial_1 = require("@math.gl/geospatial");
const WGS84_RADIUS_X = 6378137.0;
const WGS84_RADIUS_Y = 6378137.0;
const WGS84_RADIUS_Z = 6356752.3142451793;
const scratchVector = new core_1.Vector3();
/**
 * Calculate appropriate zoom value for a particular boundingVolume
 * @param boundingVolume - the instance of bounding volume
 * @param cartorgraphicCenter - cartographic center of the bounding volume
 * @returns {number} - zoom value
 */
function getZoomFromBoundingVolume(boundingVolume, cartorgraphicCenter) {
    if (boundingVolume instanceof culling_1.OrientedBoundingBox) {
        // OrientedBoundingBox
        const { halfAxes } = boundingVolume;
        const obbSize = getObbSize(halfAxes);
        // Use WGS84_RADIUS_Z to allign with BoundingSphere algorithm
        // Add the tile elevation value for correct zooming to elevated tiles
        return Math.log2(WGS84_RADIUS_Z / (obbSize + cartorgraphicCenter[2]));
    }
    else if (boundingVolume instanceof culling_1.BoundingSphere) {
        // BoundingSphere
        const { radius } = boundingVolume;
        // Add the tile elevation value for correct zooming to elevated tiles
        return Math.log2(WGS84_RADIUS_Z / (radius + cartorgraphicCenter[2]));
    }
    else if (boundingVolume.width && boundingVolume.height) {
        // BoundingRectangle
        const { width, height } = boundingVolume;
        const zoomX = Math.log2(WGS84_RADIUS_X / width);
        const zoomY = Math.log2(WGS84_RADIUS_Y / height);
        return (zoomX + zoomY) / 2;
    }
    return 1;
}
exports.getZoomFromBoundingVolume = getZoomFromBoundingVolume;
/**
 * Calculate initial zoom for the tileset from 3D `fullExtent` defined in
 * the tileset metadata
 * @param fullExtent - 3D extent of the tileset
 * @param fullExtent.xmin - minimal longitude in decimal degrees
 * @param fullExtent.xmax - maximal longitude in decimal degrees
 * @param fullExtent.ymin - minimal latitude in decimal degrees
 * @param fullExtent.ymax - maximal latitude in decimal degrees
 * @param fullExtent.zmin - minimal elevation in meters
 * @param fullExtent.zmax - maximal elevation in meters
 * @param cartorgraphicCenter - tileset center in cartographic coordinate system
 * @param cartesianCenter - tileset center in cartesian coordinate system
 * @returns - initial zoom for the tileset
 */
function getZoomFromFullExtent(fullExtent, cartorgraphicCenter, cartesianCenter) {
    const extentVertex = geospatial_1.Ellipsoid.WGS84.cartographicToCartesian([fullExtent.xmax, fullExtent.ymax, fullExtent.zmax], new core_1.Vector3());
    const extentSize = Math.sqrt(Math.pow(extentVertex[0] - cartesianCenter[0], 2) +
        Math.pow(extentVertex[1] - cartesianCenter[1], 2) +
        Math.pow(extentVertex[2] - cartesianCenter[2], 2));
    return Math.log2(WGS84_RADIUS_Z / (extentSize + cartorgraphicCenter[2]));
}
exports.getZoomFromFullExtent = getZoomFromFullExtent;
/**
 * Calculate initial zoom for the tileset from 2D `extent` defined in
 * the tileset metadata
 * @param extent - 2D extent of the tileset. It is array of 4 elements [xmin, ymin, xmax, ymax]
 * @param extent[0] - minimal longitude in decimal degrees
 * @param extent[1] - minimal latitude in decimal degrees
 * @param extent[2] - maximal longitude in decimal degrees
 * @param extent[3] - maximal latitude in decimal degrees
 * @param cartorgraphicCenter - tileset center in cartographic coordinate system
 * @param cartesianCenter - tileset center in cartesian coordinate system
 * @returns - initial zoom for the tileset
 */
function getZoomFromExtent(extent, cartorgraphicCenter, cartesianCenter) {
    const [xmin, ymin, xmax, ymax] = extent;
    return getZoomFromFullExtent({ xmin, xmax, ymin, ymax, zmin: 0, zmax: 0 }, cartorgraphicCenter, cartesianCenter);
}
exports.getZoomFromExtent = getZoomFromExtent;
function getObbSize(halfAxes) {
    halfAxes.getColumn(0, scratchVector);
    const axeY = halfAxes.getColumn(1);
    const axeZ = halfAxes.getColumn(2);
    const farthestVertex = scratchVector.add(axeY).add(axeZ);
    const size = farthestVertex.len();
    return size;
}
