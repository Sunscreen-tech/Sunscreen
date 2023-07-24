"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.createTypedArrayFromAccessor = createTypedArrayFromAccessor;
var _math = require("@loaders.gl/math");
var _loaderUtils = require("@loaders.gl/loader-utils");
var COMPONENTS_PER_ATTRIBUTE = {
  SCALAR: 1,
  VEC2: 2,
  VEC3: 3,
  VEC4: 4,
  MAT2: 4,
  MAT3: 9,
  MAT4: 16
};
var UNPACKER = {
  SCALAR: function SCALAR(values, i) {
    return values[i];
  },
  VEC2: function VEC2(values, i) {
    return [values[2 * i + 0], values[2 * i + 1]];
  },
  VEC3: function VEC3(values, i) {
    return [values[3 * i + 0], values[3 * i + 1], values[3 * i + 2]];
  },
  VEC4: function VEC4(values, i) {
    return [values[4 * i + 0], values[4 * i + 1], values[4 * i + 2], values[4 * i + 3]];
  },
  MAT2: function MAT2(values, i) {
    return [values[4 * i + 0], values[4 * i + 1], values[4 * i + 2], values[4 * i + 3]];
  },
  MAT3: function MAT3(values, i) {
    return [values[9 * i + 0], values[9 * i + 1], values[9 * i + 2], values[9 * i + 3], values[9 * i + 4], values[9 * i + 5], values[9 * i + 6], values[9 * i + 7], values[9 * i + 8]];
  },
  MAT4: function MAT4(values, i) {
    return [values[16 * i + 0], values[16 * i + 1], values[16 * i + 2], values[16 * i + 3], values[16 * i + 4], values[16 * i + 5], values[16 * i + 6], values[16 * i + 7], values[16 * i + 8], values[16 * i + 9], values[16 * i + 10], values[16 * i + 11], values[16 * i + 12], values[16 * i + 13], values[16 * i + 14], values[16 * i + 15]];
  }
};
var PACKER = {
  SCALAR: function SCALAR(x, values, i) {
    values[i] = x;
  },
  VEC2: function VEC2(x, values, i) {
    values[2 * i + 0] = x[0];
    values[2 * i + 1] = x[1];
  },
  VEC3: function VEC3(x, values, i) {
    values[3 * i + 0] = x[0];
    values[3 * i + 1] = x[1];
    values[3 * i + 2] = x[2];
  },
  VEC4: function VEC4(x, values, i) {
    values[4 * i + 0] = x[0];
    values[4 * i + 1] = x[1];
    values[4 * i + 2] = x[2];
    values[4 * i + 3] = x[3];
  },
  MAT2: function MAT2(x, values, i) {
    values[4 * i + 0] = x[0];
    values[4 * i + 1] = x[1];
    values[4 * i + 2] = x[2];
    values[4 * i + 3] = x[3];
  },
  MAT3: function MAT3(x, values, i) {
    values[9 * i + 0] = x[0];
    values[9 * i + 1] = x[1];
    values[9 * i + 2] = x[2];
    values[9 * i + 3] = x[3];
    values[9 * i + 4] = x[4];
    values[9 * i + 5] = x[5];
    values[9 * i + 6] = x[6];
    values[9 * i + 7] = x[7];
    values[9 * i + 8] = x[8];
    values[9 * i + 9] = x[9];
  },
  MAT4: function MAT4(x, values, i) {
    values[16 * i + 0] = x[0];
    values[16 * i + 1] = x[1];
    values[16 * i + 2] = x[2];
    values[16 * i + 3] = x[3];
    values[16 * i + 4] = x[4];
    values[16 * i + 5] = x[5];
    values[16 * i + 6] = x[6];
    values[16 * i + 7] = x[7];
    values[16 * i + 8] = x[8];
    values[16 * i + 9] = x[9];
    values[16 * i + 10] = x[10];
    values[16 * i + 11] = x[11];
    values[16 * i + 12] = x[12];
    values[16 * i + 13] = x[13];
    values[16 * i + 14] = x[14];
    values[16 * i + 15] = x[15];
  }
};
function createTypedArrayFromAccessor(tile3DAccessor, buffer, byteOffset, length) {
  var componentType = tile3DAccessor.componentType;
  (0, _loaderUtils.assert)(tile3DAccessor.componentType);
  var type = typeof componentType === 'string' ? _math.GLType.fromName(componentType) : componentType;
  var size = COMPONENTS_PER_ATTRIBUTE[tile3DAccessor.type];
  var unpacker = UNPACKER[tile3DAccessor.type];
  var packer = PACKER[tile3DAccessor.type];
  byteOffset += tile3DAccessor.byteOffset;
  var values = _math.GLType.createTypedArray(type, buffer, byteOffset, size * length);
  return {
    values: values,
    type: type,
    size: size,
    unpacker: unpacker,
    packer: packer
  };
}
//# sourceMappingURL=tile-3d-accessor-utils.js.map