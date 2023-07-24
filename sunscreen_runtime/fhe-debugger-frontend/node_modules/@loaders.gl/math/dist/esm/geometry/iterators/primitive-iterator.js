import { GL } from '../constants';
import { getPrimitiveModeType } from '../primitives/modes';
import { assert } from '@loaders.gl/loader-utils';
export function makePrimitiveIterator(indices) {
  let attributes = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
  let mode = arguments.length > 2 ? arguments[2] : undefined;
  let start = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : 0;
  let end = arguments.length > 4 ? arguments[4] : undefined;
  return function* () {
    if (indices) {
      indices = indices.values || indices.value || indices;
    }
    if (end === undefined) {
      end = indices ? indices.length : start;
    }
    const info = {
      attributes,
      type: getPrimitiveModeType(mode),
      i1: 0,
      i2: 0,
      i3: 0
    };
    let i = start;
    while (i < end) {
      switch (mode) {
        case GL.POINTS:
          info.i1 = i;
          i += 1;
          break;
        case GL.LINES:
          info.i1 = i;
          info.i2 = i + 1;
          i += 2;
          break;
        case GL.LINE_STRIP:
          info.i1 = i;
          info.i2 = i + 1;
          i += 1;
          break;
        case GL.LINE_LOOP:
          info.i1 = i;
          info.i2 = i + 1;
          i += 1;
          break;
        case GL.TRIANGLES:
          info.i1 = i;
          info.i2 = i + 1;
          info.i3 = i + 2;
          i += 3;
          break;
        case GL.TRIANGLE_STRIP:
          info.i1 = i;
          info.i2 = i + 1;
          i += 1;
          break;
        case GL.TRIANGLE_FAN:
          info.i1 = 1;
          info.i2 = i;
          info.i3 = i + 1;
          i += 1;
          break;
        default:
          assert(false);
      }
      if (indices) {
        if ('i1' in info) {
          info.i1 = indices[info.i1];
          info.i2 = indices[info.i2];
          info.i3 = indices[info.i3];
        }
      }
      yield info;
    }
  }();
}
//# sourceMappingURL=primitive-iterator.js.map