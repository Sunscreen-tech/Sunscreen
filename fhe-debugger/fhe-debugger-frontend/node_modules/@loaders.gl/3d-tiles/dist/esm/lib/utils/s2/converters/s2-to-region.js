import { getS2BoundaryFlatFromS2Cell } from './s2-to-boundary';
import { getS2Cell } from '../s2geometry/s2-cell-utils';
export function getS2Region(s2cell) {
  let region;
  if (s2cell.face === 2 || s2cell.face === 5) {
    let corners = null;
    let len = 0;
    for (let i = 0; i < 4; i++) {
      const key = "".concat(s2cell.face, "/").concat(i);
      const cell = getS2Cell(key);
      const corns = getS2BoundaryFlatFromS2Cell(cell);
      if (typeof corners === 'undefined' || corners === null) corners = new Float64Array(4 * corns.length);
      corners.set(corns, len);
      len += corns.length;
    }
    region = get2DRegionFromS2Corners(corners);
  } else {
    const corners = getS2BoundaryFlatFromS2Cell(s2cell);
    region = get2DRegionFromS2Corners(corners);
  }
  return region;
}
function get2DRegionFromS2Corners(corners) {
  if (corners.length % 2 !== 0) {
    throw new Error('Invalid corners');
  }
  const longitudes = [];
  const latitudes = [];
  for (let i = 0; i < corners.length; i += 2) {
    longitudes.push(corners[i]);
    latitudes.push(corners[i + 1]);
  }
  longitudes.sort((a, b) => a - b);
  latitudes.sort((a, b) => a - b);
  return {
    west: longitudes[0],
    east: longitudes[longitudes.length - 1],
    north: latitudes[latitudes.length - 1],
    south: latitudes[0]
  };
}
//# sourceMappingURL=s2-to-region.js.map