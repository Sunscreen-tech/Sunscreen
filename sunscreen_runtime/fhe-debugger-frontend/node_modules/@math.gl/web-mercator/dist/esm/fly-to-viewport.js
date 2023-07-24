import { lerp } from './math-utils';
import { scaleToZoom, zoomToScale, lngLatToWorld, worldToLngLat } from './web-mercator-utils';
import * as vec2 from 'gl-matrix/vec2';
const EPSILON = 0.01;
const VIEWPORT_TRANSITION_PROPS = ['longitude', 'latitude', 'zoom'];
const DEFAULT_OPTS = {
  curve: 1.414,
  speed: 1.2
};
export default function flyToViewport(startProps, endProps, t, options) {
  const {
    startZoom,
    startCenterXY,
    uDelta,
    w0,
    u1,
    S,
    rho,
    rho2,
    r0
  } = getFlyToTransitionParams(startProps, endProps, options);

  if (u1 < EPSILON) {
    const viewport = {};

    for (const key of VIEWPORT_TRANSITION_PROPS) {
      const startValue = startProps[key];
      const endValue = endProps[key];
      viewport[key] = lerp(startValue, endValue, t);
    }

    return viewport;
  }

  const s = t * S;
  const w = Math.cosh(r0) / Math.cosh(r0 + rho * s);
  const u = w0 * ((Math.cosh(r0) * Math.tanh(r0 + rho * s) - Math.sinh(r0)) / rho2) / u1;
  const scaleIncrement = 1 / w;
  const newZoom = startZoom + scaleToZoom(scaleIncrement);
  const newCenterWorld = vec2.scale([], uDelta, u);
  vec2.add(newCenterWorld, newCenterWorld, startCenterXY);
  const newCenter = worldToLngLat(newCenterWorld);
  return {
    longitude: newCenter[0],
    latitude: newCenter[1],
    zoom: newZoom
  };
}
export function getFlyToDuration(startProps, endProps, options) {
  const opts = { ...DEFAULT_OPTS,
    ...options
  };
  const {
    screenSpeed,
    speed,
    maxDuration
  } = opts;
  const {
    S,
    rho
  } = getFlyToTransitionParams(startProps, endProps, opts);
  const length = 1000 * S;
  let duration;

  if (Number.isFinite(screenSpeed)) {
    duration = length / (screenSpeed / rho);
  } else {
    duration = length / speed;
  }

  return Number.isFinite(maxDuration) && duration > maxDuration ? 0 : duration;
}

function getFlyToTransitionParams(startProps, endProps, opts) {
  opts = Object.assign({}, DEFAULT_OPTS, opts);
  const rho = opts.curve;
  const startZoom = startProps.zoom;
  const startCenter = [startProps.longitude, startProps.latitude];
  const startScale = zoomToScale(startZoom);
  const endZoom = endProps.zoom;
  const endCenter = [endProps.longitude, endProps.latitude];
  const scale = zoomToScale(endZoom - startZoom);
  const startCenterXY = lngLatToWorld(startCenter);
  const endCenterXY = lngLatToWorld(endCenter);
  const uDelta = vec2.sub([], endCenterXY, startCenterXY);
  const w0 = Math.max(startProps.width, startProps.height);
  const w1 = w0 / scale;
  const u1 = vec2.length(uDelta) * startScale;

  const _u1 = Math.max(u1, EPSILON);

  const rho2 = rho * rho;
  const b0 = (w1 * w1 - w0 * w0 + rho2 * rho2 * _u1 * _u1) / (2 * w0 * rho2 * _u1);
  const b1 = (w1 * w1 - w0 * w0 - rho2 * rho2 * _u1 * _u1) / (2 * w1 * rho2 * _u1);
  const r0 = Math.log(Math.sqrt(b0 * b0 + 1) - b0);
  const r1 = Math.log(Math.sqrt(b1 * b1 + 1) - b1);
  const S = (r1 - r0) / rho;
  return {
    startZoom,
    startCenterXY,
    uDelta,
    w0,
    u1,
    S,
    rho,
    rho2,
    r0,
    r1
  };
}
//# sourceMappingURL=fly-to-viewport.js.map