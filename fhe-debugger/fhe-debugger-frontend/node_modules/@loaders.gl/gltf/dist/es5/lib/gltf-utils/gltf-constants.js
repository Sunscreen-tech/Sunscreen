"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.COMPONENTS = exports.BYTES = void 0;
exports.getBytesFromComponentType = getBytesFromComponentType;
exports.getGLEnumFromSamplerParameter = getGLEnumFromSamplerParameter;
exports.getSizeFromAccessorType = getSizeFromAccessorType;
var COMPONENTS = {
  SCALAR: 1,
  VEC2: 2,
  VEC3: 3,
  VEC4: 4,
  MAT2: 4,
  MAT3: 9,
  MAT4: 16
};
exports.COMPONENTS = COMPONENTS;
var BYTES = {
  5120: 1,
  5121: 1,
  5122: 2,
  5123: 2,
  5125: 4,
  5126: 4
};
exports.BYTES = BYTES;
function getBytesFromComponentType(componentType) {
  return BYTES[componentType];
}
function getSizeFromAccessorType(type) {
  return COMPONENTS[type];
}
function getGLEnumFromSamplerParameter(parameter) {
  var GL_TEXTURE_MAG_FILTER = 0x2800;
  var GL_TEXTURE_MIN_FILTER = 0x2801;
  var GL_TEXTURE_WRAP_S = 0x2802;
  var GL_TEXTURE_WRAP_T = 0x2803;
  var PARAMETER_MAP = {
    magFilter: GL_TEXTURE_MAG_FILTER,
    minFilter: GL_TEXTURE_MIN_FILTER,
    wrapS: GL_TEXTURE_WRAP_S,
    wrapT: GL_TEXTURE_WRAP_T
  };
  return PARAMETER_MAP[parameter];
}
//# sourceMappingURL=gltf-constants.js.map