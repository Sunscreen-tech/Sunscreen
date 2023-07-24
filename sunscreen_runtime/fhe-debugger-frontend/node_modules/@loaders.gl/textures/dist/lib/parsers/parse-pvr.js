"use strict";
/* eslint-disable camelcase */
// Forked from PicoGL: https://github.com/tsherif/picogl.js/blob/master/examples/utils/utils.js
// Copyright (c) 2017 Tarek Sherif, The MIT License (MIT)
Object.defineProperty(exports, "__esModule", { value: true });
exports.parsePVR = exports.isPVR = void 0;
const gl_extensions_1 = require("../gl-extensions");
const extract_mipmap_images_1 = require("../utils/extract-mipmap-images");
const PVR_CONSTANTS = {
    MAGIC_NUMBER: 0x03525650,
    MAGIC_NUMBER_EXTRA: 0x50565203,
    HEADER_LENGTH: 13,
    HEADER_SIZE: 52,
    MAGIC_NUMBER_INDEX: 0,
    PIXEL_FORMAT_INDEX: 2,
    COLOUR_SPACE_INDEX: 4,
    HEIGHT_INDEX: 6,
    WIDTH_INDEX: 7,
    MIPMAPCOUNT_INDEX: 11,
    METADATA_SIZE_INDEX: 12
};
const PVR_PIXEL_FORMATS = {
    0: [gl_extensions_1.GL_EXTENSIONS_CONSTANTS.COMPRESSED_RGB_PVRTC_2BPPV1_IMG],
    1: [gl_extensions_1.GL_EXTENSIONS_CONSTANTS.COMPRESSED_RGBA_PVRTC_2BPPV1_IMG],
    2: [gl_extensions_1.GL_EXTENSIONS_CONSTANTS.COMPRESSED_RGB_PVRTC_4BPPV1_IMG],
    3: [gl_extensions_1.GL_EXTENSIONS_CONSTANTS.COMPRESSED_RGBA_PVRTC_4BPPV1_IMG],
    6: [gl_extensions_1.GL_EXTENSIONS_CONSTANTS.COMPRESSED_RGB_ETC1_WEBGL],
    7: [gl_extensions_1.GL_EXTENSIONS_CONSTANTS.COMPRESSED_RGB_S3TC_DXT1_EXT],
    9: [gl_extensions_1.GL_EXTENSIONS_CONSTANTS.COMPRESSED_RGBA_S3TC_DXT3_EXT],
    11: [gl_extensions_1.GL_EXTENSIONS_CONSTANTS.COMPRESSED_RGBA_S3TC_DXT5_EXT],
    22: [gl_extensions_1.GL_EXTENSIONS_CONSTANTS.COMPRESSED_RGB8_ETC2],
    23: [gl_extensions_1.GL_EXTENSIONS_CONSTANTS.COMPRESSED_RGBA8_ETC2_EAC],
    24: [gl_extensions_1.GL_EXTENSIONS_CONSTANTS.COMPRESSED_RGB8_PUNCHTHROUGH_ALPHA1_ETC2],
    25: [gl_extensions_1.GL_EXTENSIONS_CONSTANTS.COMPRESSED_R11_EAC],
    26: [gl_extensions_1.GL_EXTENSIONS_CONSTANTS.COMPRESSED_RG11_EAC],
    27: [
        gl_extensions_1.GL_EXTENSIONS_CONSTANTS.COMPRESSED_RGBA_ASTC_4X4_KHR,
        gl_extensions_1.GL_EXTENSIONS_CONSTANTS.COMPRESSED_SRGB8_ALPHA8_ASTC_4X4_KHR
    ],
    28: [
        gl_extensions_1.GL_EXTENSIONS_CONSTANTS.COMPRESSED_RGBA_ASTC_5X4_KHR,
        gl_extensions_1.GL_EXTENSIONS_CONSTANTS.COMPRESSED_SRGB8_ALPHA8_ASTC_5X4_KHR
    ],
    29: [
        gl_extensions_1.GL_EXTENSIONS_CONSTANTS.COMPRESSED_RGBA_ASTC_5X5_KHR,
        gl_extensions_1.GL_EXTENSIONS_CONSTANTS.COMPRESSED_SRGB8_ALPHA8_ASTC_5X5_KHR
    ],
    30: [
        gl_extensions_1.GL_EXTENSIONS_CONSTANTS.COMPRESSED_RGBA_ASTC_6X5_KHR,
        gl_extensions_1.GL_EXTENSIONS_CONSTANTS.COMPRESSED_SRGB8_ALPHA8_ASTC_6X5_KHR
    ],
    31: [
        gl_extensions_1.GL_EXTENSIONS_CONSTANTS.COMPRESSED_RGBA_ASTC_6X6_KHR,
        gl_extensions_1.GL_EXTENSIONS_CONSTANTS.COMPRESSED_SRGB8_ALPHA8_ASTC_6X6_KHR
    ],
    32: [
        gl_extensions_1.GL_EXTENSIONS_CONSTANTS.COMPRESSED_RGBA_ASTC_8X5_KHR,
        gl_extensions_1.GL_EXTENSIONS_CONSTANTS.COMPRESSED_SRGB8_ALPHA8_ASTC_8X5_KHR
    ],
    33: [
        gl_extensions_1.GL_EXTENSIONS_CONSTANTS.COMPRESSED_RGBA_ASTC_8X6_KHR,
        gl_extensions_1.GL_EXTENSIONS_CONSTANTS.COMPRESSED_SRGB8_ALPHA8_ASTC_8X6_KHR
    ],
    34: [
        gl_extensions_1.GL_EXTENSIONS_CONSTANTS.COMPRESSED_RGBA_ASTC_8X8_KHR,
        gl_extensions_1.GL_EXTENSIONS_CONSTANTS.COMPRESSED_SRGB8_ALPHA8_ASTC_8X8_KHR
    ],
    35: [
        gl_extensions_1.GL_EXTENSIONS_CONSTANTS.COMPRESSED_RGBA_ASTC_10X5_KHR,
        gl_extensions_1.GL_EXTENSIONS_CONSTANTS.COMPRESSED_SRGB8_ALPHA8_ASTC_10X5_KHR
    ],
    36: [
        gl_extensions_1.GL_EXTENSIONS_CONSTANTS.COMPRESSED_RGBA_ASTC_10X6_KHR,
        gl_extensions_1.GL_EXTENSIONS_CONSTANTS.COMPRESSED_SRGB8_ALPHA8_ASTC_10X6_KHR
    ],
    37: [
        gl_extensions_1.GL_EXTENSIONS_CONSTANTS.COMPRESSED_RGBA_ASTC_10X8_KHR,
        gl_extensions_1.GL_EXTENSIONS_CONSTANTS.COMPRESSED_SRGB8_ALPHA8_ASTC_10X8_KHR
    ],
    38: [
        gl_extensions_1.GL_EXTENSIONS_CONSTANTS.COMPRESSED_RGBA_ASTC_10X10_KHR,
        gl_extensions_1.GL_EXTENSIONS_CONSTANTS.COMPRESSED_SRGB8_ALPHA8_ASTC_10X10_KHR
    ],
    39: [
        gl_extensions_1.GL_EXTENSIONS_CONSTANTS.COMPRESSED_RGBA_ASTC_12X10_KHR,
        gl_extensions_1.GL_EXTENSIONS_CONSTANTS.COMPRESSED_SRGB8_ALPHA8_ASTC_12X10_KHR
    ],
    40: [
        gl_extensions_1.GL_EXTENSIONS_CONSTANTS.COMPRESSED_RGBA_ASTC_12X12_KHR,
        gl_extensions_1.GL_EXTENSIONS_CONSTANTS.COMPRESSED_SRGB8_ALPHA8_ASTC_12X12_KHR
    ]
};
const PVR_SIZE_FUNCTIONS = {
    0: pvrtc2bppSize,
    1: pvrtc2bppSize,
    2: pvrtc4bppSize,
    3: pvrtc4bppSize,
    6: dxtEtcSmallSize,
    7: dxtEtcSmallSize,
    9: dxtEtcAstcBigSize,
    11: dxtEtcAstcBigSize,
    22: dxtEtcSmallSize,
    23: dxtEtcAstcBigSize,
    24: dxtEtcSmallSize,
    25: dxtEtcSmallSize,
    26: dxtEtcAstcBigSize,
    27: dxtEtcAstcBigSize,
    28: atc5x4Size,
    29: atc5x5Size,
    30: atc6x5Size,
    31: atc6x6Size,
    32: atc8x5Size,
    33: atc8x6Size,
    34: atc8x8Size,
    35: atc10x5Size,
    36: atc10x6Size,
    37: atc10x8Size,
    38: atc10x10Size,
    39: atc12x10Size,
    40: atc12x12Size
};
/**
 * Check if data is in "PVR" format by its magic number
 * @param data - binary data of compressed texture
 * @returns true - data in "PVR" format, else - false
 */
function isPVR(data) {
    const header = new Uint32Array(data, 0, PVR_CONSTANTS.HEADER_LENGTH);
    const version = header[PVR_CONSTANTS.MAGIC_NUMBER_INDEX];
    return version === PVR_CONSTANTS.MAGIC_NUMBER || version === PVR_CONSTANTS.MAGIC_NUMBER_EXTRA;
}
exports.isPVR = isPVR;
/**
 * Parse texture data as "PVR" format
 * @param data - binary data of compressed texture
 * @returns Array of the texture levels
 * @see http://cdn.imgtec.com/sdk-documentation/PVR+File+Format.Specification.pdf
 */
function parsePVR(data) {
    const header = new Uint32Array(data, 0, PVR_CONSTANTS.HEADER_LENGTH);
    const pvrFormat = header[PVR_CONSTANTS.PIXEL_FORMAT_INDEX];
    const colourSpace = header[PVR_CONSTANTS.COLOUR_SPACE_INDEX];
    const pixelFormats = PVR_PIXEL_FORMATS[pvrFormat] || [];
    const internalFormat = pixelFormats.length > 1 && colourSpace ? pixelFormats[1] : pixelFormats[0];
    const sizeFunction = PVR_SIZE_FUNCTIONS[pvrFormat];
    const mipMapLevels = header[PVR_CONSTANTS.MIPMAPCOUNT_INDEX];
    const width = header[PVR_CONSTANTS.WIDTH_INDEX];
    const height = header[PVR_CONSTANTS.HEIGHT_INDEX];
    const dataOffset = PVR_CONSTANTS.HEADER_SIZE + header[PVR_CONSTANTS.METADATA_SIZE_INDEX];
    const image = new Uint8Array(data, dataOffset);
    return (0, extract_mipmap_images_1.extractMipmapImages)(image, {
        mipMapLevels,
        width,
        height,
        sizeFunction,
        internalFormat
    });
}
exports.parsePVR = parsePVR;
// https://www.khronos.org/registry/webgl/extensions/WEBGL_compressed_texture_pvrtc/
function pvrtc2bppSize(width, height) {
    width = Math.max(width, 16);
    height = Math.max(height, 8);
    return (width * height) / 4;
}
// https://www.khronos.org/registry/webgl/extensions/WEBGL_compressed_texture_pvrtc/
function pvrtc4bppSize(width, height) {
    width = Math.max(width, 8);
    height = Math.max(height, 8);
    return (width * height) / 2;
}
// https://www.khronos.org/registry/webgl/extensions/WEBGL_compressed_texture_s3tc/
// https://www.khronos.org/registry/webgl/extensions/WEBGL_compressed_texture_etc/
// Size for:
// COMPRESSED_RGB_S3TC_DXT1_EXT
// COMPRESSED_R11_EAC
// COMPRESSED_SIGNED_R11_EAC
// COMPRESSED_RGB8_ETC2
// COMPRESSED_SRGB8_ETC2
// COMPRESSED_RGB8_PUNCHTHROUGH_ALPHA1_ETC2
// COMPRESSED_SRGB8_PUNCHTHROUGH_ALPHA1_ETC2
function dxtEtcSmallSize(width, height) {
    return Math.floor((width + 3) / 4) * Math.floor((height + 3) / 4) * 8;
}
// https://www.khronos.org/registry/webgl/extensions/WEBGL_compressed_texture_s3tc/
// https://www.khronos.org/registry/webgl/extensions/WEBGL_compressed_texture_etc/
// https://www.khronos.org/registry/webgl/extensions/WEBGL_compressed_texture_astc/
// Size for:
// COMPRESSED_RGBA_S3TC_DXT3_EXT
// COMPRESSED_RGBA_S3TC_DXT5_EXT
// COMPRESSED_RG11_EAC
// COMPRESSED_SIGNED_RG11_EAC
// COMPRESSED_RGBA8_ETC2_EAC
// COMPRESSED_SRGB8_ALPHA8_ETC2_EAC
// COMPRESSED_RGBA_ASTC_4x4_KHR
function dxtEtcAstcBigSize(width, height) {
    return Math.floor((width + 3) / 4) * Math.floor((height + 3) / 4) * 16;
}
// https://www.khronos.org/registry/webgl/extensions/WEBGL_compressed_texture_astc/
function atc5x4Size(width, height) {
    return Math.floor((width + 4) / 5) * Math.floor((height + 3) / 4) * 16;
}
// https://www.khronos.org/registry/webgl/extensions/WEBGL_compressed_texture_astc/
function atc5x5Size(width, height) {
    return Math.floor((width + 4) / 5) * Math.floor((height + 4) / 5) * 16;
}
// https://www.khronos.org/registry/webgl/extensions/WEBGL_compressed_texture_astc/
function atc6x5Size(width, height) {
    return Math.floor((width + 5) / 6) * Math.floor((height + 4) / 5) * 16;
}
// https://www.khronos.org/registry/webgl/extensions/WEBGL_compressed_texture_astc/
function atc6x6Size(width, height) {
    return Math.floor((width + 5) / 6) * Math.floor((height + 5) / 6) * 16;
}
// https://www.khronos.org/registry/webgl/extensions/WEBGL_compressed_texture_astc/
function atc8x5Size(width, height) {
    return Math.floor((width + 7) / 8) * Math.floor((height + 4) / 5) * 16;
}
// https://www.khronos.org/registry/webgl/extensions/WEBGL_compressed_texture_astc/
function atc8x6Size(width, height) {
    return Math.floor((width + 7) / 8) * Math.floor((height + 5) / 6) * 16;
}
// https://www.khronos.org/registry/webgl/extensions/WEBGL_compressed_texture_astc/
function atc8x8Size(width, height) {
    return Math.floor((width + 7) / 8) * Math.floor((height + 7) / 8) * 16;
}
// https://www.khronos.org/registry/webgl/extensions/WEBGL_compressed_texture_astc/
function atc10x5Size(width, height) {
    return Math.floor((width + 9) / 10) * Math.floor((height + 4) / 5) * 16;
}
// https://www.khronos.org/registry/webgl/extensions/WEBGL_compressed_texture_astc/
function atc10x6Size(width, height) {
    return Math.floor((width + 9) / 10) * Math.floor((height + 5) / 6) * 16;
}
// https://www.khronos.org/registry/webgl/extensions/WEBGL_compressed_texture_astc/
function atc10x8Size(width, height) {
    return Math.floor((width + 9) / 10) * Math.floor((height + 7) / 8) * 16;
}
// https://www.khronos.org/registry/webgl/extensions/WEBGL_compressed_texture_astc/
function atc10x10Size(width, height) {
    return Math.floor((width + 9) / 10) * Math.floor((height + 9) / 10) * 16;
}
// https://www.khronos.org/registry/webgl/extensions/WEBGL_compressed_texture_astc/
function atc12x10Size(width, height) {
    return Math.floor((width + 11) / 12) * Math.floor((height + 9) / 10) * 16;
}
// https://www.khronos.org/registry/webgl/extensions/WEBGL_compressed_texture_astc/
function atc12x12Size(width, height) {
    return Math.floor((width + 11) / 12) * Math.floor((height + 11) / 12) * 16;
}
