import { Matrix4, Vector3 } from '@math.gl/core';
import { Ellipsoid } from '@math.gl/geospatial';
const cameraPositionCartesian = new Vector3();
const toEye = new Vector3();
const cameraPositionEnu = new Vector3();
const extraVertexEnu = new Vector3();
const projectedOriginVector = new Vector3();
const enuToCartesianMatrix = new Matrix4();
const cartesianToEnuMatrix = new Matrix4();
export function getLodStatus(tile, frameState) {
  if (tile.lodMetricValue === 0 || isNaN(tile.lodMetricValue)) {
    return 'DIG';
  }
  const screenSize = 2 * getProjectedRadius(tile, frameState);
  if (screenSize < 2) {
    return 'OUT';
  }
  if (!tile.header.children || screenSize <= tile.lodMetricValue) {
    return 'DRAW';
  } else if (tile.header.children) {
    return 'DIG';
  }
  return 'OUT';
}
export function getProjectedRadius(tile, frameState) {
  const {
    topDownViewport: viewport
  } = frameState;
  const mbsLat = tile.header.mbs[1];
  const mbsLon = tile.header.mbs[0];
  const mbsZ = tile.header.mbs[2];
  const mbsR = tile.header.mbs[3];
  const mbsCenterCartesian = [...tile.boundingVolume.center];
  const cameraPositionCartographic = viewport.unprojectPosition(viewport.cameraPosition);
  Ellipsoid.WGS84.cartographicToCartesian(cameraPositionCartographic, cameraPositionCartesian);
  toEye.copy(cameraPositionCartesian).subtract(mbsCenterCartesian).normalize();
  Ellipsoid.WGS84.eastNorthUpToFixedFrame(mbsCenterCartesian, enuToCartesianMatrix);
  cartesianToEnuMatrix.copy(enuToCartesianMatrix).invert();
  cameraPositionEnu.copy(cameraPositionCartesian).transform(cartesianToEnuMatrix);
  const projection = Math.sqrt(cameraPositionEnu[0] * cameraPositionEnu[0] + cameraPositionEnu[1] * cameraPositionEnu[1]);
  const extraZ = projection * projection / cameraPositionEnu[2];
  extraVertexEnu.copy([cameraPositionEnu[0], cameraPositionEnu[1], extraZ]);
  const extraVertexCartesian = extraVertexEnu.transform(enuToCartesianMatrix);
  const extraVectorCartesian = extraVertexCartesian.subtract(mbsCenterCartesian).normalize();
  const radiusVector = toEye.cross(extraVectorCartesian).normalize().scale(mbsR);
  const sphereMbsBorderVertexCartesian = radiusVector.add(mbsCenterCartesian);
  const sphereMbsBorderVertexCartographic = Ellipsoid.WGS84.cartesianToCartographic(sphereMbsBorderVertexCartesian);
  const projectedOrigin = viewport.project([mbsLon, mbsLat, mbsZ]);
  const projectedMbsBorderVertex = viewport.project(sphereMbsBorderVertexCartographic);
  const projectedRadius = projectedOriginVector.copy(projectedOrigin).subtract(projectedMbsBorderVertex).magnitude();
  return projectedRadius;
}
//# sourceMappingURL=i3s-lod.js.map