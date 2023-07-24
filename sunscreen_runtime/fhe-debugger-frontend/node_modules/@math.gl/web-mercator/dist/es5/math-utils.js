"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.createMat4 = createMat4;
exports.transformVector = transformVector;
exports.mod = mod;
exports.lerp = lerp;
exports.clamp = clamp;
exports.log2 = void 0;

var _vec = require("gl-matrix/vec4");

function createMat4() {
  return [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
}

function transformVector(matrix, vector) {
  var result = (0, _vec.transformMat4)([], vector, matrix);
  (0, _vec.scale)(result, result, 1 / result[3]);
  return result;
}

function mod(value, divisor) {
  var modulus = value % divisor;
  return modulus < 0 ? divisor + modulus : modulus;
}

function lerp(start, end, step) {
  return step * end + (1 - step) * start;
}

function clamp(x, min, max) {
  return x < min ? min : x > max ? max : x;
}

function ieLog2(x) {
  return Math.log(x) * Math.LOG2E;
}

var log2 = Math.log2 || ieLog2;
exports.log2 = log2;
//# sourceMappingURL=math-utils.js.map