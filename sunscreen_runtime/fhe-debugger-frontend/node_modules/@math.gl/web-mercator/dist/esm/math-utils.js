import { transformMat4, scale } from 'gl-matrix/vec4';
export function createMat4() {
  return [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
}
export function transformVector(matrix, vector) {
  const result = transformMat4([], vector, matrix);
  scale(result, result, 1 / result[3]);
  return result;
}
export function mod(value, divisor) {
  const modulus = value % divisor;
  return modulus < 0 ? divisor + modulus : modulus;
}
export function lerp(start, end, step) {
  return step * end + (1 - step) * start;
}
export function clamp(x, min, max) {
  return x < min ? min : x > max ? max : x;
}

function ieLog2(x) {
  return Math.log(x) * Math.LOG2E;
}

export const log2 = Math.log2 || ieLog2;
//# sourceMappingURL=math-utils.js.map