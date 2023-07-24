import { Tesselator } from '@deck.gl/core';
import { normalizePath } from './path';
const START_CAP = 1;
const END_CAP = 2;
const INVALID = 4;
export default class PathTesselator extends Tesselator {
  constructor(opts) {
    super({ ...opts,
      attributes: {
        positions: {
          size: 3,
          padding: 18,
          initialize: true,
          type: opts.fp64 ? Float64Array : Float32Array
        },
        segmentTypes: {
          size: 1,
          type: Uint8ClampedArray
        }
      }
    });
  }

  get(attributeName) {
    return this.attributes[attributeName];
  }

  getGeometryFromBuffer(buffer) {
    if (this.normalize) {
      return super.getGeometryFromBuffer(buffer);
    }

    return null;
  }

  normalizeGeometry(path) {
    if (this.normalize) {
      return normalizePath(path, this.positionSize, this.opts.resolution, this.opts.wrapLongitude);
    }

    return path;
  }

  getGeometrySize(path) {
    if (isCut(path)) {
      let size = 0;

      for (const subPath of path) {
        size += this.getGeometrySize(subPath);
      }

      return size;
    }

    const numPoints = this.getPathLength(path);

    if (numPoints < 2) {
      return 0;
    }

    if (this.isClosed(path)) {
      return numPoints < 3 ? 0 : numPoints + 2;
    }

    return numPoints;
  }

  updateGeometryAttributes(path, context) {
    if (context.geometrySize === 0) {
      return;
    }

    if (path && isCut(path)) {
      for (const subPath of path) {
        const geometrySize = this.getGeometrySize(subPath);
        context.geometrySize = geometrySize;
        this.updateGeometryAttributes(subPath, context);
        context.vertexStart += geometrySize;
      }
    } else {
      this._updateSegmentTypes(path, context);

      this._updatePositions(path, context);
    }
  }

  _updateSegmentTypes(path, context) {
    const segmentTypes = this.attributes.segmentTypes;
    const isPathClosed = path ? this.isClosed(path) : false;
    const {
      vertexStart,
      geometrySize
    } = context;
    segmentTypes.fill(0, vertexStart, vertexStart + geometrySize);

    if (isPathClosed) {
      segmentTypes[vertexStart] = INVALID;
      segmentTypes[vertexStart + geometrySize - 2] = INVALID;
    } else {
      segmentTypes[vertexStart] += START_CAP;
      segmentTypes[vertexStart + geometrySize - 2] += END_CAP;
    }

    segmentTypes[vertexStart + geometrySize - 1] = INVALID;
  }

  _updatePositions(path, context) {
    const {
      positions
    } = this.attributes;

    if (!positions || !path) {
      return;
    }

    const {
      vertexStart,
      geometrySize
    } = context;
    const p = new Array(3);

    for (let i = vertexStart, ptIndex = 0; ptIndex < geometrySize; i++, ptIndex++) {
      this.getPointOnPath(path, ptIndex, p);
      positions[i * 3] = p[0];
      positions[i * 3 + 1] = p[1];
      positions[i * 3 + 2] = p[2];
    }
  }

  getPathLength(path) {
    return path.length / this.positionSize;
  }

  getPointOnPath(path, index, target = []) {
    const {
      positionSize
    } = this;

    if (index * positionSize >= path.length) {
      index += 1 - path.length / positionSize;
    }

    const i = index * positionSize;
    target[0] = path[i];
    target[1] = path[i + 1];
    target[2] = positionSize === 3 && path[i + 2] || 0;
    return target;
  }

  isClosed(path) {
    if (!this.normalize) {
      return Boolean(this.opts.loop);
    }

    const {
      positionSize
    } = this;
    const lastPointIndex = path.length - positionSize;
    return path[0] === path[lastPointIndex] && path[1] === path[lastPointIndex + 1] && (positionSize === 2 || path[2] === path[lastPointIndex + 2]);
  }

}

function isCut(path) {
  return Array.isArray(path[0]);
}
//# sourceMappingURL=path-tesselator.js.map