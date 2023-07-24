import { GL } from '../constants';
export function getPrimitiveModeType(mode) {
  switch (mode) {
    case GL.POINTS:
      return GL.POINTS;
    case GL.LINES:
    case GL.LINE_STRIP:
    case GL.LINE_LOOP:
      return GL.LINES;
    case GL.TRIANGLES:
    case GL.TRIANGLE_STRIP:
    case GL.TRIANGLE_FAN:
      return GL.TRIANGLES;
    default:
      throw new Error('Unknown primitive mode');
  }
}
export function isPrimitiveModeExpandable(mode) {
  switch (mode) {
    case GL.LINE_STRIP:
    case GL.LINE_LOOP:
    case GL.TRIANGLE_STRIP:
    case GL.TRIANGLE_FAN:
      return true;
    default:
      return false;
  }
}
export function getPrimitiveModeExpandedLength(mode, length) {
  switch (mode) {
    case GL.POINTS:
      return length;
    case GL.LINES:
      return length;
    case GL.LINE_STRIP:
      return length;
    case GL.LINE_LOOP:
      return length + 1;
    case GL.TRIANGLES:
      return length;
    case GL.TRIANGLE_STRIP:
    case GL.TRIANGLE_FAN:
      return (length - 2) * 3;
    default:
      throw new Error('Unknown length');
  }
}
//# sourceMappingURL=modes.js.map