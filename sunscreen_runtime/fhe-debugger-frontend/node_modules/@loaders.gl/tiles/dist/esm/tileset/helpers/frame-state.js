import { Vector3 } from '@math.gl/core';
import { CullingVolume, Plane } from '@math.gl/culling';
import { Ellipsoid } from '@math.gl/geospatial';
const scratchVector = new Vector3();
const scratchPosition = new Vector3();
const cullingVolume = new CullingVolume([new Plane(), new Plane(), new Plane(), new Plane(), new Plane(), new Plane()]);
export function getFrameState(viewport, frameNumber) {
  const {
    cameraDirection,
    cameraUp,
    height
  } = viewport;
  const {
    metersPerUnit
  } = viewport.distanceScales;
  const viewportCenterCartesian = worldToCartesian(viewport, viewport.center);
  const enuToFixedTransform = Ellipsoid.WGS84.eastNorthUpToFixedFrame(viewportCenterCartesian);
  const cameraPositionCartographic = viewport.unprojectPosition(viewport.cameraPosition);
  const cameraPositionCartesian = Ellipsoid.WGS84.cartographicToCartesian(cameraPositionCartographic, new Vector3());
  const cameraDirectionCartesian = new Vector3(enuToFixedTransform.transformAsVector(new Vector3(cameraDirection).scale(metersPerUnit))).normalize();
  const cameraUpCartesian = new Vector3(enuToFixedTransform.transformAsVector(new Vector3(cameraUp).scale(metersPerUnit))).normalize();
  commonSpacePlanesToWGS84(viewport);
  const ViewportClass = viewport.constructor;
  const {
    longitude,
    latitude,
    width,
    bearing,
    zoom
  } = viewport;
  const topDownViewport = new ViewportClass({
    longitude,
    latitude,
    height,
    width,
    bearing,
    zoom,
    pitch: 0
  });
  return {
    camera: {
      position: cameraPositionCartesian,
      direction: cameraDirectionCartesian,
      up: cameraUpCartesian
    },
    viewport,
    topDownViewport,
    height,
    cullingVolume,
    frameNumber,
    sseDenominator: 1.15
  };
}
export function limitSelectedTiles(tiles, frameState, maximumTilesSelected) {
  if (maximumTilesSelected === 0 || tiles.length <= maximumTilesSelected) {
    return [tiles, []];
  }
  const tuples = [];
  const {
    longitude: viewportLongitude,
    latitude: viewportLatitude
  } = frameState.viewport;
  for (const [index, tile] of tiles.entries()) {
    const [longitude, latitude] = tile.header.mbs;
    const deltaLon = Math.abs(viewportLongitude - longitude);
    const deltaLat = Math.abs(viewportLatitude - latitude);
    const distance = Math.sqrt(deltaLat * deltaLat + deltaLon * deltaLon);
    tuples.push([index, distance]);
  }
  const tuplesSorted = tuples.sort((a, b) => a[1] - b[1]);
  const selectedTiles = [];
  for (let i = 0; i < maximumTilesSelected; i++) {
    selectedTiles.push(tiles[tuplesSorted[i][0]]);
  }
  const unselectedTiles = [];
  for (let i = maximumTilesSelected; i < tuplesSorted.length; i++) {
    unselectedTiles.push(tiles[tuplesSorted[i][0]]);
  }
  return [selectedTiles, unselectedTiles];
}
function commonSpacePlanesToWGS84(viewport) {
  const frustumPlanes = viewport.getFrustumPlanes();
  const nearCenterCommon = closestPointOnPlane(frustumPlanes.near, viewport.cameraPosition);
  const nearCenterCartesian = worldToCartesian(viewport, nearCenterCommon);
  const cameraCartesian = worldToCartesian(viewport, viewport.cameraPosition, scratchPosition);
  let i = 0;
  cullingVolume.planes[i++].fromPointNormal(nearCenterCartesian, scratchVector.copy(nearCenterCartesian).subtract(cameraCartesian));
  for (const dir in frustumPlanes) {
    if (dir === 'near') {
      continue;
    }
    const plane = frustumPlanes[dir];
    const posCommon = closestPointOnPlane(plane, nearCenterCommon, scratchPosition);
    const cartesianPos = worldToCartesian(viewport, posCommon, scratchPosition);
    cullingVolume.planes[i++].fromPointNormal(cartesianPos, scratchVector.copy(nearCenterCartesian).subtract(cartesianPos));
  }
}
function closestPointOnPlane(plane, refPoint) {
  let out = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : new Vector3();
  const distanceToRef = plane.normal.dot(refPoint);
  out.copy(plane.normal).scale(plane.distance - distanceToRef).add(refPoint);
  return out;
}
function worldToCartesian(viewport, point) {
  let out = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : new Vector3();
  const cartographicPos = viewport.unprojectPosition(point);
  return Ellipsoid.WGS84.cartographicToCartesian(cartographicPos, out);
}
//# sourceMappingURL=frame-state.js.map