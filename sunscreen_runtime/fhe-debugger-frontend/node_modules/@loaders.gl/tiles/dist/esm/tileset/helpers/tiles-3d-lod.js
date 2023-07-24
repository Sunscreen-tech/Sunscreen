import { Matrix4, Vector3, clamp } from '@math.gl/core';
const scratchPositionNormal = new Vector3();
const scratchCartographic = new Vector3();
const scratchMatrix = new Matrix4();
const scratchCenter = new Vector3();
const scratchPosition = new Vector3();
const scratchDirection = new Vector3();
export function calculateDynamicScreenSpaceError(root, _ref) {
  let {
    camera,
    mapProjection
  } = _ref;
  let options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
  const {
    dynamicScreenSpaceErrorHeightFalloff = 0.25,
    dynamicScreenSpaceErrorDensity = 0.00278
  } = options;
  let up;
  let direction;
  let height;
  let minimumHeight;
  let maximumHeight;
  const tileBoundingVolume = root.contentBoundingVolume;
  if (tileBoundingVolume instanceof TileBoundingRegion) {
    up = Cartesian3.normalize(camera.positionWC, scratchPositionNormal);
    direction = camera.directionWC;
    height = camera.positionCartographic.height;
    minimumHeight = tileBoundingVolume.minimumHeight;
    maximumHeight = tileBoundingVolume.maximumHeight;
  } else {
    const transformLocal = Matrix4.inverseTransformation(root.computedTransform, scratchMatrix);
    const ellipsoid = mapProjection.ellipsoid;
    const boundingVolume = tileBoundingVolume.boundingVolume;
    const centerLocal = Matrix4.multiplyByPoint(transformLocal, boundingVolume.center, scratchCenter);
    if (Cartesian3.magnitude(centerLocal) > ellipsoid.minimumRadius) {
      const centerCartographic = Cartographic.fromCartesian(centerLocal, ellipsoid, scratchCartographic);
      up = Cartesian3.normalize(camera.positionWC, scratchPositionNormal);
      direction = camera.directionWC;
      height = camera.positionCartographic.height;
      minimumHeight = 0.0;
      maximumHeight = centerCartographic.height * 2.0;
    } else {
      const positionLocal = Matrix4.multiplyByPoint(transformLocal, camera.positionWC, scratchPosition);
      up = Cartesian3.UNIT_Z;
      direction = Matrix4.multiplyByPointAsVector(transformLocal, camera.directionWC, scratchDirection);
      direction = Cartesian3.normalize(direction, direction);
      height = positionLocal.z;
      if (tileBoundingVolume instanceof TileOrientedBoundingBox) {
        const boxHeight = root._header.boundingVolume.box[11];
        minimumHeight = centerLocal.z - boxHeight;
        maximumHeight = centerLocal.z + boxHeight;
      } else if (tileBoundingVolume instanceof TileBoundingSphere) {
        const radius = boundingVolume.radius;
        minimumHeight = centerLocal.z - radius;
        maximumHeight = centerLocal.z + radius;
      }
    }
  }
  const heightFalloff = dynamicScreenSpaceErrorHeightFalloff;
  const heightClose = minimumHeight + (maximumHeight - minimumHeight) * heightFalloff;
  const heightFar = maximumHeight;
  const t = clamp((height - heightClose) / (heightFar - heightClose), 0.0, 1.0);
  const dot = Math.abs(Cartesian3.dot(direction, up));
  let horizonFactor = 1.0 - dot;
  horizonFactor = horizonFactor * (1.0 - t);
  return dynamicScreenSpaceErrorDensity * horizonFactor;
}
export function fog(distanceToCamera, density) {
  const scalar = distanceToCamera * density;
  return 1.0 - Math.exp(-(scalar * scalar));
}
export function getDynamicScreenSpaceError(tileset, distanceToCamera) {
  if (tileset.dynamicScreenSpaceError && tileset.dynamicScreenSpaceErrorComputedDensity) {
    const density = tileset.dynamicScreenSpaceErrorComputedDensity;
    const factor = tileset.dynamicScreenSpaceErrorFactor;
    const dynamicError = fog(distanceToCamera, density) * factor;
    return dynamicError;
  }
  return 0;
}
export function getTiles3DScreenSpaceError(tile, frameState, useParentLodMetric) {
  const tileset = tile.tileset;
  const parentLodMetricValue = tile.parent && tile.parent.lodMetricValue || tile.lodMetricValue;
  const lodMetricValue = useParentLodMetric ? parentLodMetricValue : tile.lodMetricValue;
  if (lodMetricValue === 0.0) {
    return 0.0;
  }
  const distance = Math.max(tile._distanceToCamera, 1e-7);
  const {
    height,
    sseDenominator
  } = frameState;
  const {
    viewDistanceScale
  } = tileset.options;
  let error = lodMetricValue * height * (viewDistanceScale || 1.0) / (distance * sseDenominator);
  error -= getDynamicScreenSpaceError(tileset, distance);
  return error;
}
//# sourceMappingURL=tiles-3d-lod.js.map