import isGeometry from '../is-geometry';
import { assert } from '../utils/assert';
export function getPositions(geometry) {
  if (isGeometry(geometry)) {
    const {
      attributes
    } = geometry;
    const position = attributes.POSITION || attributes.positions;
    assert(position);
    return position;
  }
  if (ArrayBuffer.isView(geometry)) {
    return {
      values: geometry,
      size: 3
    };
  }
  if (geometry) {
    assert(geometry.values);
    return geometry;
  }
  return assert(false);
}
//# sourceMappingURL=get-attribute-from-geometry.js.map