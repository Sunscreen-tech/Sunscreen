import * as Polygon from './polygon';
import { Tesselator } from '@deck.gl/core';
import { cutPolygonByGrid, cutPolygonByMercatorBounds } from '@math.gl/polygon';
export default class PolygonTesselator extends Tesselator {
  constructor(opts) {
    const {
      fp64,
      IndexType = Uint32Array
    } = opts;
    super({ ...opts,
      attributes: {
        positions: {
          size: 3,
          type: fp64 ? Float64Array : Float32Array
        },
        vertexValid: {
          type: Uint8ClampedArray,
          size: 1
        },
        indices: {
          type: IndexType,
          size: 1
        }
      }
    });
  }

  get(attributeName) {
    const {
      attributes
    } = this;

    if (attributeName === 'indices') {
      return attributes.indices && attributes.indices.subarray(0, this.vertexCount);
    }

    return attributes[attributeName];
  }

  updateGeometry(opts) {
    super.updateGeometry(opts);
    const externalIndices = this.buffers.indices;

    if (externalIndices) {
      this.vertexCount = (externalIndices.value || externalIndices).length;
    } else if (this.data && !this.getGeometry) {
      throw new Error('missing indices buffer');
    }
  }

  normalizeGeometry(polygon) {
    if (this.normalize) {
      const normalizedPolygon = Polygon.normalize(polygon, this.positionSize);

      if (this.opts.resolution) {
        return cutPolygonByGrid(Polygon.getPositions(normalizedPolygon), Polygon.getHoleIndices(normalizedPolygon), {
          size: this.positionSize,
          gridResolution: this.opts.resolution,
          edgeTypes: true
        });
      }

      if (this.opts.wrapLongitude) {
        return cutPolygonByMercatorBounds(Polygon.getPositions(normalizedPolygon), Polygon.getHoleIndices(normalizedPolygon), {
          size: this.positionSize,
          maxLatitude: 86,
          edgeTypes: true
        });
      }

      return normalizedPolygon;
    }

    return polygon;
  }

  getGeometrySize(polygon) {
    if (isCut(polygon)) {
      let size = 0;

      for (const subPolygon of polygon) {
        size += this.getGeometrySize(subPolygon);
      }

      return size;
    }

    return Polygon.getPositions(polygon).length / this.positionSize;
  }

  getGeometryFromBuffer(buffer) {
    if (this.normalize || !this.buffers.indices) {
      return super.getGeometryFromBuffer(buffer);
    }

    return null;
  }

  updateGeometryAttributes(polygon, context) {
    if (polygon && isCut(polygon)) {
      for (const subPolygon of polygon) {
        const geometrySize = this.getGeometrySize(subPolygon);
        context.geometrySize = geometrySize;
        this.updateGeometryAttributes(subPolygon, context);
        context.vertexStart += geometrySize;
        context.indexStart = this.indexStarts[context.geometryIndex + 1];
      }
    } else {
      this._updateIndices(polygon, context);

      this._updatePositions(polygon, context);

      this._updateVertexValid(polygon, context);
    }
  }

  _updateIndices(polygon, {
    geometryIndex,
    vertexStart: offset,
    indexStart
  }) {
    const {
      attributes,
      indexStarts,
      typedArrayManager
    } = this;
    let target = attributes.indices;

    if (!target || !polygon) {
      return;
    }

    let i = indexStart;
    const indices = Polygon.getSurfaceIndices(polygon, this.positionSize, this.opts.preproject, this.opts.full3d);
    target = typedArrayManager.allocate(target, indexStart + indices.length, {
      copy: true
    });

    for (let j = 0; j < indices.length; j++) {
      target[i++] = indices[j] + offset;
    }

    indexStarts[geometryIndex + 1] = indexStart + indices.length;
    attributes.indices = target;
  }

  _updatePositions(polygon, {
    vertexStart,
    geometrySize
  }) {
    const {
      attributes: {
        positions
      },
      positionSize
    } = this;

    if (!positions || !polygon) {
      return;
    }

    const polygonPositions = Polygon.getPositions(polygon);

    for (let i = vertexStart, j = 0; j < geometrySize; i++, j++) {
      const x = polygonPositions[j * positionSize];
      const y = polygonPositions[j * positionSize + 1];
      const z = positionSize > 2 ? polygonPositions[j * positionSize + 2] : 0;
      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;
    }
  }

  _updateVertexValid(polygon, {
    vertexStart,
    geometrySize
  }) {
    const {
      positionSize
    } = this;
    const vertexValid = this.attributes.vertexValid;
    const holeIndices = polygon && Polygon.getHoleIndices(polygon);

    if (polygon && polygon.edgeTypes) {
      vertexValid.set(polygon.edgeTypes, vertexStart);
    } else {
      vertexValid.fill(1, vertexStart, vertexStart + geometrySize);
    }

    if (holeIndices) {
      for (let j = 0; j < holeIndices.length; j++) {
        vertexValid[vertexStart + holeIndices[j] / positionSize - 1] = 0;
      }
    }

    vertexValid[vertexStart + geometrySize - 1] = 0;
  }

}

function isCut(polygon) {
  return Array.isArray(polygon) && polygon.length > 0 && !Number.isFinite(polygon[0]);
}
//# sourceMappingURL=polygon-tesselator.js.map