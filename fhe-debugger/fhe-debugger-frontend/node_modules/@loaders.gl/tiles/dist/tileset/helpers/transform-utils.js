"use strict";
// loaders.gl, MIT license
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateTransformProps = void 0;
const geospatial_1 = require("@math.gl/geospatial");
const core_1 = require("@math.gl/core");
const loader_utils_1 = require("@loaders.gl/loader-utils");
function calculateTransformProps(tileHeader, tile) {
    (0, loader_utils_1.assert)(tileHeader);
    (0, loader_utils_1.assert)(tile);
    const { rtcCenter, gltfUpAxis } = tile;
    const { computedTransform, boundingVolume: { center } } = tileHeader;
    let modelMatrix = new core_1.Matrix4(computedTransform);
    // Translate if appropriate
    if (rtcCenter) {
        modelMatrix.translate(rtcCenter);
    }
    // glTF models need to be rotated from Y to Z up
    // https://github.com/AnalyticalGraphicsInc/3d-tiles/tree/master/specification#y-up-to-z-up
    switch (gltfUpAxis) {
        case 'Z':
            break;
        case 'Y':
            const rotationY = new core_1.Matrix4().rotateX(Math.PI / 2);
            modelMatrix = modelMatrix.multiplyRight(rotationY);
            break;
        case 'X':
            const rotationX = new core_1.Matrix4().rotateY(-Math.PI / 2);
            modelMatrix = modelMatrix.multiplyRight(rotationX);
            break;
        default:
            break;
    }
    // Scale/offset positions if normalized integers
    if (tile.isQuantized) {
        modelMatrix.translate(tile.quantizedVolumeOffset).scale(tile.quantizedVolumeScale);
    }
    // Option 1: Cartesian matrix and origin
    const cartesianOrigin = new core_1.Vector3(center);
    tile.cartesianModelMatrix = modelMatrix;
    tile.cartesianOrigin = cartesianOrigin;
    // Option 2: Cartographic matrix and origin
    const cartographicOrigin = geospatial_1.Ellipsoid.WGS84.cartesianToCartographic(cartesianOrigin, new core_1.Vector3());
    const fromFixedFrameMatrix = geospatial_1.Ellipsoid.WGS84.eastNorthUpToFixedFrame(cartesianOrigin);
    const toFixedFrameMatrix = fromFixedFrameMatrix.invert();
    tile.cartographicModelMatrix = toFixedFrameMatrix.multiplyRight(modelMatrix);
    tile.cartographicOrigin = cartographicOrigin;
    // Deprecated, drop
    if (!tile.coordinateSystem) {
        tile.modelMatrix = tile.cartographicModelMatrix;
    }
}
exports.calculateTransformProps = calculateTransformProps;
