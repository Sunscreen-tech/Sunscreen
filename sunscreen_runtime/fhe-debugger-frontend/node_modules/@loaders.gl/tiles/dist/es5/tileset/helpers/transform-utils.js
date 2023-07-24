"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.calculateTransformProps = calculateTransformProps;
var _geospatial = require("@math.gl/geospatial");
var _core = require("@math.gl/core");
var _loaderUtils = require("@loaders.gl/loader-utils");
function calculateTransformProps(tileHeader, tile) {
  (0, _loaderUtils.assert)(tileHeader);
  (0, _loaderUtils.assert)(tile);
  var rtcCenter = tile.rtcCenter,
    gltfUpAxis = tile.gltfUpAxis;
  var computedTransform = tileHeader.computedTransform,
    center = tileHeader.boundingVolume.center;
  var modelMatrix = new _core.Matrix4(computedTransform);
  if (rtcCenter) {
    modelMatrix.translate(rtcCenter);
  }
  switch (gltfUpAxis) {
    case 'Z':
      break;
    case 'Y':
      var rotationY = new _core.Matrix4().rotateX(Math.PI / 2);
      modelMatrix = modelMatrix.multiplyRight(rotationY);
      break;
    case 'X':
      var rotationX = new _core.Matrix4().rotateY(-Math.PI / 2);
      modelMatrix = modelMatrix.multiplyRight(rotationX);
      break;
    default:
      break;
  }
  if (tile.isQuantized) {
    modelMatrix.translate(tile.quantizedVolumeOffset).scale(tile.quantizedVolumeScale);
  }
  var cartesianOrigin = new _core.Vector3(center);
  tile.cartesianModelMatrix = modelMatrix;
  tile.cartesianOrigin = cartesianOrigin;
  var cartographicOrigin = _geospatial.Ellipsoid.WGS84.cartesianToCartographic(cartesianOrigin, new _core.Vector3());
  var fromFixedFrameMatrix = _geospatial.Ellipsoid.WGS84.eastNorthUpToFixedFrame(cartesianOrigin);
  var toFixedFrameMatrix = fromFixedFrameMatrix.invert();
  tile.cartographicModelMatrix = toFixedFrameMatrix.multiplyRight(modelMatrix);
  tile.cartographicOrigin = cartographicOrigin;
  if (!tile.coordinateSystem) {
    tile.modelMatrix = tile.cartographicModelMatrix;
  }
}
//# sourceMappingURL=transform-utils.js.map