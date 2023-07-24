import { worldToLngLat } from './web-mercator-utils';
import * as vec2 from 'gl-matrix/vec2';
import { transformVector } from './math-utils';
const DEGREES_TO_RADIANS = Math.PI / 180;
export default function getBounds(viewport, z = 0) {
  const {
    width,
    height,
    unproject
  } = viewport;
  const unprojectOps = {
    targetZ: z
  };
  const bottomLeft = unproject([0, height], unprojectOps);
  const bottomRight = unproject([width, height], unprojectOps);
  let topLeft;
  let topRight;
  const halfFov = viewport.fovy ? 0.5 * viewport.fovy * DEGREES_TO_RADIANS : Math.atan(0.5 / viewport.altitude);
  const angleToGround = (90 - viewport.pitch) * DEGREES_TO_RADIANS;

  if (halfFov > angleToGround - 0.01) {
    topLeft = unprojectOnFarPlane(viewport, 0, z);
    topRight = unprojectOnFarPlane(viewport, width, z);
  } else {
    topLeft = unproject([0, 0], unprojectOps);
    topRight = unproject([width, 0], unprojectOps);
  }

  return [bottomLeft, bottomRight, topRight, topLeft];
}

function unprojectOnFarPlane(viewport, x, targetZ) {
  const {
    pixelUnprojectionMatrix
  } = viewport;
  const coord0 = transformVector(pixelUnprojectionMatrix, [x, 0, 1, 1]);
  const coord1 = transformVector(pixelUnprojectionMatrix, [x, viewport.height, 1, 1]);
  const z = targetZ * viewport.distanceScales.unitsPerMeter[2];
  const t = (z - coord0[2]) / (coord1[2] - coord0[2]);
  const coord = vec2.lerp([], coord0, coord1, t);
  const result = worldToLngLat(coord);
  result.push(targetZ);
  return result;
}
//# sourceMappingURL=get-bounds.js.map