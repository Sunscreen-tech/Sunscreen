import { getS2BoundaryFlatFromS2Cell } from './converters/s2-to-boundary';
import { getS2LngLatFromS2Cell } from './s2geometry/s2-geometry';
import { getS2Cell } from './s2geometry/s2-cell-utils';
export function getS2LngLat(s2Token) {
  const s2cell = getS2Cell(s2Token);
  return getS2LngLatFromS2Cell(s2cell);
}
export function getS2BoundaryFlat(tokenOrKey) {
  const s2cell = getS2Cell(tokenOrKey);
  return getS2BoundaryFlatFromS2Cell(s2cell);
}
//# sourceMappingURL=s2-geometry-functions.js.map