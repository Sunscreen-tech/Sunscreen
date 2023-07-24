"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getGLEnumFromSamplerParameter = exports.getSizeFromAccessorType = exports.getBytesFromComponentType = exports.BYTES = exports.COMPONENTS = void 0;
exports.COMPONENTS = {
    SCALAR: 1,
    VEC2: 2,
    VEC3: 3,
    VEC4: 4,
    MAT2: 4,
    MAT3: 9,
    MAT4: 16
};
exports.BYTES = {
    5120: 1,
    5121: 1,
    5122: 2,
    5123: 2,
    5125: 4,
    5126: 4 // FLOAT
};
// ENUM LOOKUP
function getBytesFromComponentType(componentType) {
    return exports.BYTES[componentType];
}
exports.getBytesFromComponentType = getBytesFromComponentType;
function getSizeFromAccessorType(type) {
    return exports.COMPONENTS[type];
}
exports.getSizeFromAccessorType = getSizeFromAccessorType;
function getGLEnumFromSamplerParameter(parameter) {
    const GL_TEXTURE_MAG_FILTER = 0x2800;
    const GL_TEXTURE_MIN_FILTER = 0x2801;
    const GL_TEXTURE_WRAP_S = 0x2802;
    const GL_TEXTURE_WRAP_T = 0x2803;
    const PARAMETER_MAP = {
        magFilter: GL_TEXTURE_MAG_FILTER,
        minFilter: GL_TEXTURE_MIN_FILTER,
        wrapS: GL_TEXTURE_WRAP_S,
        wrapT: GL_TEXTURE_WRAP_T
    };
    return PARAMETER_MAP[parameter];
}
exports.getGLEnumFromSamplerParameter = getGLEnumFromSamplerParameter;
