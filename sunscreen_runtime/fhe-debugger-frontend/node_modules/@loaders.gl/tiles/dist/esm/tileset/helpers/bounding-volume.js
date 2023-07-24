import { Quaternion, Vector3, Matrix3, Matrix4, degrees } from '@math.gl/core';
import { BoundingSphere, OrientedBoundingBox } from '@math.gl/culling';
import { Ellipsoid } from '@math.gl/geospatial';
import { assert } from '@loaders.gl/loader-utils';
function defined(x) {
  return x !== undefined && x !== null;
}
const scratchPoint = new Vector3();
const scratchScale = new Vector3();
const scratchNorthWest = new Vector3();
const scratchSouthEast = new Vector3();
export function createBoundingVolume(boundingVolumeHeader, transform, result) {
  assert(boundingVolumeHeader, '3D Tile: boundingVolume must be defined');
  if (boundingVolumeHeader.box) {
    return createBox(boundingVolumeHeader.box, transform, result);
  }
  if (boundingVolumeHeader.region) {
    const [west, south, east, north, minHeight, maxHeight] = boundingVolumeHeader.region;
    const northWest = Ellipsoid.WGS84.cartographicToCartesian([degrees(west), degrees(north), minHeight], scratchNorthWest);
    const southEast = Ellipsoid.WGS84.cartographicToCartesian([degrees(east), degrees(south), maxHeight], scratchSouthEast);
    const centerInCartesian = new Vector3().addVectors(northWest, southEast).multiplyScalar(0.5);
    const radius = new Vector3().subVectors(northWest, southEast).len() / 2.0;
    return createSphere([centerInCartesian[0], centerInCartesian[1], centerInCartesian[2], radius], new Matrix4());
  }
  if (boundingVolumeHeader.sphere) {
    return createSphere(boundingVolumeHeader.sphere, transform, result);
  }
  throw new Error('3D Tile: boundingVolume must contain a sphere, region, or box');
}
export function getCartographicBounds(boundingVolumeHeader, boundingVolume) {
  if (boundingVolumeHeader.box) {
    return orientedBoundingBoxToCartographicBounds(boundingVolume);
  }
  if (boundingVolumeHeader.region) {
    const [west, south, east, north, minHeight, maxHeight] = boundingVolumeHeader.region;
    return [[degrees(west), degrees(south), minHeight], [degrees(east), degrees(north), maxHeight]];
  }
  if (boundingVolumeHeader.sphere) {
    return boundingSphereToCartographicBounds(boundingVolume);
  }
  throw new Error('Unkown boundingVolume type');
}
function createBox(box, transform, result) {
  const center = new Vector3(box[0], box[1], box[2]);
  transform.transform(center, center);
  let origin = [];
  if (box.length === 10) {
    const halfSize = box.slice(3, 6);
    const quaternion = new Quaternion();
    quaternion.fromArray(box, 6);
    const x = new Vector3([1, 0, 0]);
    const y = new Vector3([0, 1, 0]);
    const z = new Vector3([0, 0, 1]);
    x.transformByQuaternion(quaternion);
    x.scale(halfSize[0]);
    y.transformByQuaternion(quaternion);
    y.scale(halfSize[1]);
    z.transformByQuaternion(quaternion);
    z.scale(halfSize[2]);
    origin = [...x.toArray(), ...y.toArray(), ...z.toArray()];
  } else {
    origin = [...box.slice(3, 6), ...box.slice(6, 9), ...box.slice(9, 12)];
  }
  const xAxis = transform.transformAsVector(origin.slice(0, 3));
  const yAxis = transform.transformAsVector(origin.slice(3, 6));
  const zAxis = transform.transformAsVector(origin.slice(6, 9));
  const halfAxes = new Matrix3([xAxis[0], xAxis[1], xAxis[2], yAxis[0], yAxis[1], yAxis[2], zAxis[0], zAxis[1], zAxis[2]]);
  if (defined(result)) {
    result.center = center;
    result.halfAxes = halfAxes;
    return result;
  }
  return new OrientedBoundingBox(center, halfAxes);
}
function createSphere(sphere, transform, result) {
  const center = new Vector3(sphere[0], sphere[1], sphere[2]);
  transform.transform(center, center);
  const scale = transform.getScale(scratchScale);
  const uniformScale = Math.max(Math.max(scale[0], scale[1]), scale[2]);
  const radius = sphere[3] * uniformScale;
  if (defined(result)) {
    result.center = center;
    result.radius = radius;
    return result;
  }
  return new BoundingSphere(center, radius);
}
function orientedBoundingBoxToCartographicBounds(boundingVolume) {
  const result = emptyCartographicBounds();
  const {
    halfAxes
  } = boundingVolume;
  const xAxis = new Vector3(halfAxes.getColumn(0));
  const yAxis = new Vector3(halfAxes.getColumn(1));
  const zAxis = new Vector3(halfAxes.getColumn(2));
  for (let x = 0; x < 2; x++) {
    for (let y = 0; y < 2; y++) {
      for (let z = 0; z < 2; z++) {
        scratchPoint.copy(boundingVolume.center);
        scratchPoint.add(xAxis);
        scratchPoint.add(yAxis);
        scratchPoint.add(zAxis);
        addToCartographicBounds(result, scratchPoint);
        zAxis.negate();
      }
      yAxis.negate();
    }
    xAxis.negate();
  }
  return result;
}
function boundingSphereToCartographicBounds(boundingVolume) {
  const result = emptyCartographicBounds();
  const {
    center,
    radius
  } = boundingVolume;
  const point = Ellipsoid.WGS84.scaleToGeodeticSurface(center, scratchPoint);
  let zAxis;
  if (point) {
    zAxis = Ellipsoid.WGS84.geodeticSurfaceNormal(point);
  } else {
    zAxis = new Vector3(0, 0, 1);
  }
  let xAxis = new Vector3(zAxis[2], -zAxis[1], 0);
  if (xAxis.len() > 0) {
    xAxis.normalize();
  } else {
    xAxis = new Vector3(0, 1, 0);
  }
  const yAxis = xAxis.clone().cross(zAxis);
  for (const axis of [xAxis, yAxis, zAxis]) {
    scratchScale.copy(axis).scale(radius);
    for (let dir = 0; dir < 2; dir++) {
      scratchPoint.copy(center);
      scratchPoint.add(scratchScale);
      addToCartographicBounds(result, scratchPoint);
      scratchScale.negate();
    }
  }
  return result;
}
function emptyCartographicBounds() {
  return [[Infinity, Infinity, Infinity], [-Infinity, -Infinity, -Infinity]];
}
function addToCartographicBounds(target, cartesian) {
  Ellipsoid.WGS84.cartesianToCartographic(cartesian, scratchPoint);
  target[0][0] = Math.min(target[0][0], scratchPoint[0]);
  target[0][1] = Math.min(target[0][1], scratchPoint[1]);
  target[0][2] = Math.min(target[0][2], scratchPoint[2]);
  target[1][0] = Math.max(target[1][0], scratchPoint[0]);
  target[1][1] = Math.max(target[1][1], scratchPoint[1]);
  target[1][2] = Math.max(target[1][2], scratchPoint[2]);
}
//# sourceMappingURL=bounding-volume.js.map