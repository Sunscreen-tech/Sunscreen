"use strict";
// loaders.gl, MIT license
Object.defineProperty(exports, "__esModule", { value: true });
exports.getProjectedRadius = exports.getLodStatus = void 0;
const core_1 = require("@math.gl/core");
const geospatial_1 = require("@math.gl/geospatial");
const cameraPositionCartesian = new core_1.Vector3();
const toEye = new core_1.Vector3();
const cameraPositionEnu = new core_1.Vector3();
const extraVertexEnu = new core_1.Vector3();
const projectedOriginVector = new core_1.Vector3();
const enuToCartesianMatrix = new core_1.Matrix4();
const cartesianToEnuMatrix = new core_1.Matrix4();
/**
 * For the maxScreenThreshold error metric, maxError means that you should replace the node with it's children
   as soon as the nodes bounding sphere has a screen radius larger than maxError pixels.
   In this sense a value of 0 means you should always load it's children,
   or if it's a leaf node, you should always display it.
 * @param tile
 * @param frameState
 * @returns
 */
function getLodStatus(tile, frameState) {
    if (tile.lodMetricValue === 0 || isNaN(tile.lodMetricValue)) {
        return 'DIG';
    }
    const screenSize = 2 * getProjectedRadius(tile, frameState);
    if (screenSize < 2) {
        return 'OUT';
    }
    if (!tile.header.children || screenSize <= tile.lodMetricValue) {
        return 'DRAW';
    }
    else if (tile.header.children) {
        return 'DIG';
    }
    return 'OUT';
}
exports.getLodStatus = getLodStatus;
/**
 * Calculate size of MBS radius projected on the screen plane
 * @param tile
 * @param frameState
 * @returns
 */
// eslint-disable-next-line max-statements
function getProjectedRadius(tile, frameState) {
    const { topDownViewport: viewport } = frameState;
    const mbsLat = tile.header.mbs[1];
    const mbsLon = tile.header.mbs[0];
    const mbsZ = tile.header.mbs[2];
    const mbsR = tile.header.mbs[3];
    const mbsCenterCartesian = [...tile.boundingVolume.center];
    const cameraPositionCartographic = viewport.unprojectPosition(viewport.cameraPosition);
    geospatial_1.Ellipsoid.WGS84.cartographicToCartesian(cameraPositionCartographic, cameraPositionCartesian);
    // ---------------------------
    // Calculate mbs border vertex
    // ---------------------------
    toEye.copy(cameraPositionCartesian).subtract(mbsCenterCartesian).normalize();
    // Add extra vector to form plane
    geospatial_1.Ellipsoid.WGS84.eastNorthUpToFixedFrame(mbsCenterCartesian, enuToCartesianMatrix);
    cartesianToEnuMatrix.copy(enuToCartesianMatrix).invert();
    cameraPositionEnu.copy(cameraPositionCartesian).transform(cartesianToEnuMatrix);
    // Mean Proportionals in Right Triangles - Altitude rule
    // https://mathbitsnotebook.com/Geometry/RightTriangles/RTmeanRight.html
    const projection = Math.sqrt(cameraPositionEnu[0] * cameraPositionEnu[0] + cameraPositionEnu[1] * cameraPositionEnu[1]);
    const extraZ = (projection * projection) / cameraPositionEnu[2];
    extraVertexEnu.copy([cameraPositionEnu[0], cameraPositionEnu[1], extraZ]);
    const extraVertexCartesian = extraVertexEnu.transform(enuToCartesianMatrix);
    const extraVectorCartesian = extraVertexCartesian.subtract(mbsCenterCartesian).normalize();
    // We need radius vector orthogonal to toEye vector
    const radiusVector = toEye.cross(extraVectorCartesian).normalize().scale(mbsR);
    const sphereMbsBorderVertexCartesian = radiusVector.add(mbsCenterCartesian);
    const sphereMbsBorderVertexCartographic = geospatial_1.Ellipsoid.WGS84.cartesianToCartographic(sphereMbsBorderVertexCartesian);
    // ---------------------------
    // Project center vertex and border vertex and calculate projected radius of MBS
    const projectedOrigin = viewport.project([mbsLon, mbsLat, mbsZ]);
    const projectedMbsBorderVertex = viewport.project(sphereMbsBorderVertexCartographic);
    const projectedRadius = projectedOriginVector
        .copy(projectedOrigin)
        .subtract(projectedMbsBorderVertex)
        .magnitude();
    return projectedRadius;
}
exports.getProjectedRadius = getProjectedRadius;
