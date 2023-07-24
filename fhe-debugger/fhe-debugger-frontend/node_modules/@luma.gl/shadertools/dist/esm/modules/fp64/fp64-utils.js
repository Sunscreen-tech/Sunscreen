export function fp64ify(a) {
  let out = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [];
  let startIndex = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 0;
  const hiPart = Math.fround(a);
  const loPart = a - hiPart;
  out[startIndex] = hiPart;
  out[startIndex + 1] = loPart;
  return out;
}
export function fp64LowPart(a) {
  return a - Math.fround(a);
}
export function fp64ifyMatrix4(matrix) {
  const matrixFP64 = new Float32Array(32);

  for (let i = 0; i < 4; ++i) {
    for (let j = 0; j < 4; ++j) {
      const index = i * 4 + j;
      fp64ify(matrix[j * 4 + i], matrixFP64, index * 2);
    }
  }

  return matrixFP64;
}
//# sourceMappingURL=fp64-utils.js.map