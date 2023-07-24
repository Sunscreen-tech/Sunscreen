import { getS2Cell } from '../s2geometry/s2-cell-utils';
import { getS2Region } from './s2-to-region';
import { Vector3 } from '@math.gl/core';
export function getS2OrientedBoundingBoxCornerPoints(tokenOrKey, heightInfo) {
  const min = (heightInfo === null || heightInfo === void 0 ? void 0 : heightInfo.minimumHeight) || 0;
  const max = (heightInfo === null || heightInfo === void 0 ? void 0 : heightInfo.maximumHeight) || 0;
  const s2cell = getS2Cell(tokenOrKey);
  const region = getS2Region(s2cell);
  const W = region.west;
  const S = region.south;
  const E = region.east;
  const N = region.north;
  const points = [];
  points.push(new Vector3(W, N, min));
  points.push(new Vector3(E, N, min));
  points.push(new Vector3(E, S, min));
  points.push(new Vector3(W, S, min));
  points.push(new Vector3(W, N, max));
  points.push(new Vector3(E, N, max));
  points.push(new Vector3(E, S, max));
  points.push(new Vector3(W, S, max));
  return points;
}
//# sourceMappingURL=s2-to-obb-points.js.map