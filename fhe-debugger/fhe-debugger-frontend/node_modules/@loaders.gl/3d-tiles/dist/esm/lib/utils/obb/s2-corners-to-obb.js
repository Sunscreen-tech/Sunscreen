import { Vector3 } from '@math.gl/core';
import { makeOrientedBoundingBoxFromPoints } from '@math.gl/culling';
import { getS2OrientedBoundingBoxCornerPoints } from '../../utils/s2/index';
import { getS2LngLat } from '../../utils/s2/index';
import { Ellipsoid } from '@math.gl/geospatial';
export function convertS2BoundingVolumetoOBB(s2VolumeInfo) {
  const token = s2VolumeInfo.token;
  const heightInfo = {
    minimumHeight: s2VolumeInfo.minimumHeight,
    maximumHeight: s2VolumeInfo.maximumHeight
  };
  const corners = getS2OrientedBoundingBoxCornerPoints(token, heightInfo);
  const center = getS2LngLat(token);
  const centerLng = center[0];
  const centerLat = center[1];
  const point = Ellipsoid.WGS84.cartographicToCartesian([centerLng, centerLat, heightInfo.maximumHeight]);
  const centerPointAdditional = new Vector3(point[0], point[1], point[2]);
  corners.push(centerPointAdditional);
  const obb = makeOrientedBoundingBoxFromPoints(corners);
  const box = [...obb.center, ...obb.halfAxes];
  return box;
}
//# sourceMappingURL=s2-corners-to-obb.js.map