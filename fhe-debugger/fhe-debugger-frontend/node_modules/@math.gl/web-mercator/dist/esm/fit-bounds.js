import assert from './assert';
import { log2, clamp } from './math-utils';
import { MAX_LATITUDE, lngLatToWorld, worldToLngLat } from './web-mercator-utils';
export default function fitBounds(options) {
  const {
    width,
    height,
    bounds,
    minExtent = 0,
    maxZoom = 24,
    offset = [0, 0]
  } = options;
  const [[west, south], [east, north]] = bounds;
  const padding = getPaddingObject(options.padding);
  const nw = lngLatToWorld([west, clamp(north, -MAX_LATITUDE, MAX_LATITUDE)]);
  const se = lngLatToWorld([east, clamp(south, -MAX_LATITUDE, MAX_LATITUDE)]);
  const size = [Math.max(Math.abs(se[0] - nw[0]), minExtent), Math.max(Math.abs(se[1] - nw[1]), minExtent)];
  const targetSize = [width - padding.left - padding.right - Math.abs(offset[0]) * 2, height - padding.top - padding.bottom - Math.abs(offset[1]) * 2];
  assert(targetSize[0] > 0 && targetSize[1] > 0);
  const scaleX = targetSize[0] / size[0];
  const scaleY = targetSize[1] / size[1];
  const offsetX = (padding.right - padding.left) / 2 / scaleX;
  const offsetY = (padding.top - padding.bottom) / 2 / scaleY;
  const center = [(se[0] + nw[0]) / 2 + offsetX, (se[1] + nw[1]) / 2 + offsetY];
  const centerLngLat = worldToLngLat(center);
  const zoom = Math.min(maxZoom, log2(Math.abs(Math.min(scaleX, scaleY))));
  assert(Number.isFinite(zoom));
  return {
    longitude: centerLngLat[0],
    latitude: centerLngLat[1],
    zoom
  };
}

function getPaddingObject(padding = 0) {
  if (typeof padding === 'number') {
    return {
      top: padding,
      bottom: padding,
      left: padding,
      right: padding
    };
  }

  assert(Number.isFinite(padding.top) && Number.isFinite(padding.bottom) && Number.isFinite(padding.left) && Number.isFinite(padding.right));
  return padding;
}
//# sourceMappingURL=fit-bounds.js.map