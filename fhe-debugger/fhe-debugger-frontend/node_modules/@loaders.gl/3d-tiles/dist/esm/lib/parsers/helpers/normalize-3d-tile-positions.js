import { Vector3 } from '@math.gl/core';
import { GL } from '@loaders.gl/math';
export function normalize3DTilePositionAttribute(tile, positions, options) {
  if (!tile.isQuantized) {
    return positions;
  }
  if (options['3d-tiles'] && options['3d-tiles'].decodeQuantizedPositions) {
    tile.isQuantized = false;
    return decodeQuantizedPositions(tile, positions);
  }
  return {
    type: GL.UNSIGNED_SHORT,
    value: positions,
    size: 3,
    normalized: true
  };
}
function decodeQuantizedPositions(tile, positions) {
  const scratchPosition = new Vector3();
  const decodedArray = new Float32Array(tile.pointCount * 3);
  for (let i = 0; i < tile.pointCount; i++) {
    scratchPosition.set(positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2]).scale(1 / tile.quantizedRange).multiply(tile.quantizedVolumeScale).add(tile.quantizedVolumeOffset).toArray(decodedArray, i * 3);
  }
  return decodedArray;
}
//# sourceMappingURL=normalize-3d-tile-positions.js.map