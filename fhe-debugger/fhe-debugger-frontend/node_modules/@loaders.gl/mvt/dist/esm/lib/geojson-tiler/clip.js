import _defineProperty from "@babel/runtime/helpers/esm/defineProperty";
import { createFeature } from './feature';
export function clip(features, scale, k1, k2, axis, minAll, maxAll, options) {
  k1 /= scale;
  k2 /= scale;
  if (minAll >= k1 && maxAll < k2) {
    return features;
  } else if (maxAll < k1 || minAll >= k2) {
    return null;
  }
  const clipped = [];
  for (const feature of features) {
    const geometry = feature.geometry;
    let type = feature.type;
    const min = axis === 0 ? feature.minX : feature.minY;
    const max = axis === 0 ? feature.maxX : feature.maxY;
    if (min >= k1 && max < k2) {
      clipped.push(feature);
      continue;
    } else if (max < k1 || min >= k2) {
      continue;
    }
    let newGeometry = [];
    if (type === 'Point' || type === 'MultiPoint') {
      clipPoints(geometry, newGeometry, k1, k2, axis);
    } else if (type === 'LineString') {
      clipLine(geometry, newGeometry, k1, k2, axis, false, options.lineMetrics);
    } else if (type === 'MultiLineString') {
      clipLines(geometry, newGeometry, k1, k2, axis, false);
    } else if (type === 'Polygon') {
      clipLines(geometry, newGeometry, k1, k2, axis, true);
    } else if (type === 'MultiPolygon') {
      for (const polygon of geometry) {
        const newPolygon = [];
        clipLines(polygon, newPolygon, k1, k2, axis, true);
        if (newPolygon.length) {
          newGeometry.push(newPolygon);
        }
      }
    }
    if (newGeometry.length) {
      if (options.lineMetrics && type === 'LineString') {
        for (const line of newGeometry) {
          clipped.push(createFeature(feature.id, type, line, feature.tags));
        }
        continue;
      }
      if (type === 'LineString' || type === 'MultiLineString') {
        if (newGeometry.length === 1) {
          type = 'LineString';
          newGeometry = newGeometry[0];
        } else {
          type = 'MultiLineString';
        }
      }
      if (type === 'Point' || type === 'MultiPoint') {
        type = newGeometry.length === 3 ? 'Point' : 'MultiPoint';
      }
      clipped.push(createFeature(feature.id, type, newGeometry, feature.tags));
    }
  }
  return clipped.length ? clipped : null;
}
function clipPoints(geom, newGeom, k1, k2, axis) {
  for (let i = 0; i < geom.length; i += 3) {
    const a = geom[i + axis];
    if (a >= k1 && a <= k2) {
      addPoint(newGeom, geom[i], geom[i + 1], geom[i + 2]);
    }
  }
}
function clipLine(geom, newGeom, k1, k2, axis, isPolygon, trackMetrics) {
  let slice = newSlice(geom);
  const intersect = axis === 0 ? intersectX : intersectY;
  let len = geom.start;
  let segLen;
  let t;
  for (let i = 0; i < geom.length - 3; i += 3) {
    const ax = geom[i];
    const ay = geom[i + 1];
    const az = geom[i + 2];
    const bx = geom[i + 3];
    const by = geom[i + 4];
    const a = axis === 0 ? ax : ay;
    const b = axis === 0 ? bx : by;
    let exited = false;
    if (trackMetrics) {
      segLen = Math.sqrt(Math.pow(ax - bx, 2) + Math.pow(ay - by, 2));
    }
    if (a < k1) {
      if (b > k1) {
        t = intersect(slice, ax, ay, bx, by, k1);
        if (trackMetrics) {
          slice.start = len + segLen * t;
        }
      }
    } else if (a > k2) {
      if (b < k2) {
        t = intersect(slice, ax, ay, bx, by, k2);
        if (trackMetrics) {
          slice.start = len + segLen * t;
        }
      }
    } else {
      addPoint(slice, ax, ay, az);
    }
    if (b < k1 && a >= k1) {
      t = intersect(slice, ax, ay, bx, by, k1);
      exited = true;
    }
    if (b > k2 && a <= k2) {
      t = intersect(slice, ax, ay, bx, by, k2);
      exited = true;
    }
    if (!isPolygon && exited) {
      if (trackMetrics) {
        slice.end = len + segLen * t;
      }
      newGeom.push(slice);
      slice = newSlice(geom);
    }
    if (trackMetrics) {
      len += segLen;
    }
  }
  let last = geom.length - 3;
  const ax = geom[last];
  const ay = geom[last + 1];
  const az = geom[last + 2];
  const a = axis === 0 ? ax : ay;
  if (a >= k1 && a <= k2) addPoint(slice, ax, ay, az);
  last = slice.length - 3;
  if (isPolygon && last >= 3 && (slice[last] !== slice[0] || slice[last + 1] !== slice[1])) {
    addPoint(slice, slice[0], slice[1], slice[2]);
  }
  if (slice.length) {
    newGeom.push(slice);
  }
}
class Slice extends Array {
  constructor() {
    super(...arguments);
    _defineProperty(this, "size", void 0);
    _defineProperty(this, "start", void 0);
    _defineProperty(this, "end", void 0);
  }
}
function newSlice(line) {
  const slice = [];
  slice.size = line.size;
  slice.start = line.start;
  slice.end = line.end;
  return slice;
}
function clipLines(geom, newGeom, k1, k2, axis, isPolygon) {
  for (const line of geom) {
    clipLine(line, newGeom, k1, k2, axis, isPolygon, false);
  }
}
function addPoint(out, x, y, z) {
  out.push(x, y, z);
}
function intersectX(out, ax, ay, bx, by, x) {
  const t = (x - ax) / (bx - ax);
  addPoint(out, x, ay + (by - ay) * t, 1);
  return t;
}
function intersectY(out, ax, ay, bx, by, y) {
  const t = (y - ay) / (by - ay);
  addPoint(out, ax + (bx - ax) * t, y, 1);
  return t;
}
//# sourceMappingURL=clip.js.map