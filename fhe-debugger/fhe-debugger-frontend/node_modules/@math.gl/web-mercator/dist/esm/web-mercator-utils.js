import { createMat4, transformVector, clamp, log2 } from './math-utils';
import * as mat4 from 'gl-matrix/mat4';
import * as vec2 from 'gl-matrix/vec2';
import * as vec3 from 'gl-matrix/vec3';
import assert from './assert';
const PI = Math.PI;
const PI_4 = PI / 4;
const DEGREES_TO_RADIANS = PI / 180;
const RADIANS_TO_DEGREES = 180 / PI;
const TILE_SIZE = 512;
const EARTH_CIRCUMFERENCE = 40.03e6;
export const MAX_LATITUDE = 85.051129;
export const DEFAULT_ALTITUDE = 1.5;
export function zoomToScale(zoom) {
  return Math.pow(2, zoom);
}
export function scaleToZoom(scale) {
  return log2(scale);
}
export function lngLatToWorld(lngLat) {
  const [lng, lat] = lngLat;
  assert(Number.isFinite(lng));
  assert(Number.isFinite(lat) && lat >= -90 && lat <= 90, 'invalid latitude');
  const lambda2 = lng * DEGREES_TO_RADIANS;
  const phi2 = lat * DEGREES_TO_RADIANS;
  const x = TILE_SIZE * (lambda2 + PI) / (2 * PI);
  const y = TILE_SIZE * (PI + Math.log(Math.tan(PI_4 + phi2 * 0.5))) / (2 * PI);
  return [x, y];
}
export function worldToLngLat(xy) {
  const [x, y] = xy;
  const lambda2 = x / TILE_SIZE * (2 * PI) - PI;
  const phi2 = 2 * (Math.atan(Math.exp(y / TILE_SIZE * (2 * PI) - PI)) - PI_4);
  return [lambda2 * RADIANS_TO_DEGREES, phi2 * RADIANS_TO_DEGREES];
}
export function getMeterZoom(options) {
  const {
    latitude
  } = options;
  assert(Number.isFinite(latitude));
  const latCosine = Math.cos(latitude * DEGREES_TO_RADIANS);
  return scaleToZoom(EARTH_CIRCUMFERENCE * latCosine) - 9;
}
export function unitsPerMeter(latitude) {
  const latCosine = Math.cos(latitude * DEGREES_TO_RADIANS);
  return TILE_SIZE / EARTH_CIRCUMFERENCE / latCosine;
}
export function getDistanceScales(options) {
  const {
    latitude,
    longitude,
    highPrecision = false
  } = options;
  assert(Number.isFinite(latitude) && Number.isFinite(longitude));
  const worldSize = TILE_SIZE;
  const latCosine = Math.cos(latitude * DEGREES_TO_RADIANS);
  const unitsPerDegreeX = worldSize / 360;
  const unitsPerDegreeY = unitsPerDegreeX / latCosine;
  const altUnitsPerMeter = worldSize / EARTH_CIRCUMFERENCE / latCosine;
  const result = {
    unitsPerMeter: [altUnitsPerMeter, altUnitsPerMeter, altUnitsPerMeter],
    metersPerUnit: [1 / altUnitsPerMeter, 1 / altUnitsPerMeter, 1 / altUnitsPerMeter],
    unitsPerDegree: [unitsPerDegreeX, unitsPerDegreeY, altUnitsPerMeter],
    degreesPerUnit: [1 / unitsPerDegreeX, 1 / unitsPerDegreeY, 1 / altUnitsPerMeter]
  };

  if (highPrecision) {
    const latCosine2 = DEGREES_TO_RADIANS * Math.tan(latitude * DEGREES_TO_RADIANS) / latCosine;
    const unitsPerDegreeY2 = unitsPerDegreeX * latCosine2 / 2;
    const altUnitsPerDegree2 = worldSize / EARTH_CIRCUMFERENCE * latCosine2;
    const altUnitsPerMeter2 = altUnitsPerDegree2 / unitsPerDegreeY * altUnitsPerMeter;
    result.unitsPerDegree2 = [0, unitsPerDegreeY2, altUnitsPerDegree2];
    result.unitsPerMeter2 = [altUnitsPerMeter2, 0, altUnitsPerMeter2];
  }

  return result;
}
export function addMetersToLngLat(lngLatZ, xyz) {
  const [longitude, latitude, z0] = lngLatZ;
  const [x, y, z] = xyz;
  const {
    unitsPerMeter,
    unitsPerMeter2
  } = getDistanceScales({
    longitude,
    latitude,
    highPrecision: true
  });
  const worldspace = lngLatToWorld(lngLatZ);
  worldspace[0] += x * (unitsPerMeter[0] + unitsPerMeter2[0] * y);
  worldspace[1] += y * (unitsPerMeter[1] + unitsPerMeter2[1] * y);
  const newLngLat = worldToLngLat(worldspace);
  const newZ = (z0 || 0) + (z || 0);
  return Number.isFinite(z0) || Number.isFinite(z) ? [newLngLat[0], newLngLat[1], newZ] : newLngLat;
}
export function getViewMatrix(options) {
  const {
    height,
    pitch,
    bearing,
    altitude,
    scale,
    center
  } = options;
  const vm = createMat4();
  mat4.translate(vm, vm, [0, 0, -altitude]);
  mat4.rotateX(vm, vm, -pitch * DEGREES_TO_RADIANS);
  mat4.rotateZ(vm, vm, bearing * DEGREES_TO_RADIANS);
  const relativeScale = scale / height;
  mat4.scale(vm, vm, [relativeScale, relativeScale, relativeScale]);

  if (center) {
    mat4.translate(vm, vm, vec3.negate([], center));
  }

  return vm;
}
export function getProjectionParameters(options) {
  const {
    width,
    height,
    altitude,
    pitch = 0,
    offset,
    center,
    scale,
    nearZMultiplier = 1,
    farZMultiplier = 1
  } = options;
  let {
    fovy = altitudeToFovy(DEFAULT_ALTITUDE)
  } = options;

  if (altitude !== undefined) {
    fovy = altitudeToFovy(altitude);
  }

  const fovRadians = fovy * DEGREES_TO_RADIANS;
  const pitchRadians = pitch * DEGREES_TO_RADIANS;
  const focalDistance = fovyToAltitude(fovy);
  let cameraToSeaLevelDistance = focalDistance;

  if (center) {
    cameraToSeaLevelDistance += center[2] * scale / Math.cos(pitchRadians) / height;
  }

  const fovAboveCenter = fovRadians * (0.5 + (offset ? offset[1] : 0) / height);
  const topHalfSurfaceDistance = Math.sin(fovAboveCenter) * cameraToSeaLevelDistance / Math.sin(clamp(Math.PI / 2 - pitchRadians - fovAboveCenter, 0.01, Math.PI - 0.01));
  const furthestDistance = Math.sin(pitchRadians) * topHalfSurfaceDistance + cameraToSeaLevelDistance;
  const horizonDistance = cameraToSeaLevelDistance * 10;
  const farZ = Math.min(furthestDistance * farZMultiplier, horizonDistance);
  return {
    fov: fovRadians,
    aspect: width / height,
    focalDistance,
    near: nearZMultiplier,
    far: farZ
  };
}
export function getProjectionMatrix(options) {
  const {
    fov,
    aspect,
    near,
    far
  } = getProjectionParameters(options);
  const projectionMatrix = mat4.perspective([], fov, aspect, near, far);
  return projectionMatrix;
}
export function altitudeToFovy(altitude) {
  return 2 * Math.atan(0.5 / altitude) * RADIANS_TO_DEGREES;
}
export function fovyToAltitude(fovy) {
  return 0.5 / Math.tan(0.5 * fovy * DEGREES_TO_RADIANS);
}
export function worldToPixels(xyz, pixelProjectionMatrix) {
  const [x, y, z = 0] = xyz;
  assert(Number.isFinite(x) && Number.isFinite(y) && Number.isFinite(z));
  return transformVector(pixelProjectionMatrix, [x, y, z, 1]);
}
export function pixelsToWorld(xyz, pixelUnprojectionMatrix, targetZ = 0) {
  const [x, y, z] = xyz;
  assert(Number.isFinite(x) && Number.isFinite(y), 'invalid pixel coordinate');

  if (Number.isFinite(z)) {
    const coord = transformVector(pixelUnprojectionMatrix, [x, y, z, 1]);
    return coord;
  }

  const coord0 = transformVector(pixelUnprojectionMatrix, [x, y, 0, 1]);
  const coord1 = transformVector(pixelUnprojectionMatrix, [x, y, 1, 1]);
  const z0 = coord0[2];
  const z1 = coord1[2];
  const t = z0 === z1 ? 0 : ((targetZ || 0) - z0) / (z1 - z0);
  return vec2.lerp([], coord0, coord1, t);
}
//# sourceMappingURL=web-mercator-utils.js.map