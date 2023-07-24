"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * General constants
 */
exports.COMPRESSION_FORMAT_FLAGS = ['astc', 'etc', 'pvrtc', 's3tc'];
/**
 * Compression tool: PVRTexTool (http://cdn.imgtec.com/sdk-documentation/PVRTexTool.User+Manual.pdf)
 * Compression tool: ASTCenc (https://github.com/ARM-software/astc-encoder)
 * WebGL extension: https://www.khronos.org/registry/webgl/extensions/WEBGL_compressed_texture_astc/
 */
exports.ASTC = 'astc';
exports.IS_ASTC = process.argv.includes(exports.ASTC);
exports.ASTC_SUPPORTED_INPUT_TYPES = ['.jpeg', '.jpg', '.png', '.bmp', '.gif'];
exports.ASTC_SUPPORTED_OUTPUT_TYPES = ['.ktx'];
exports.ASTC_COMPRESSION_TYPES = [
    'ASTC_4x4',
    'ASTC_5x4',
    'ASTC_5x5',
    'ASTC_6x5',
    'ASTC_6x6',
    'ASTC_8x5',
    'ASTC_8x6',
    'ASTC_8x8',
    'ASTC_10x5',
    'ASTC_10x6',
    'ASTC_10x8',
    'ASTC_10x10',
    'ASTC_12x10',
    'ASTC_12x12',
    'ASTC_3x3x3',
    'ASTC_4x3x3',
    'ASTC_4x4x3',
    'ASTC_4x4x4',
    'ASTC_5x4x4',
    'ASTC_5x5x4',
    'ASTC_5x5x5',
    'ASTC_6x5x5',
    'ASTC_6x6x5',
    'ASTC_6x6x6',
];
exports.ASTC_QUALITY_TYPES = [
    'astcveryfast',
    'astcfast',
    'astcmedium',
    'astcthorough',
    'astcexhaustive',
];
/**
 * Compression tool: PVRTexTool (http://cdn.imgtec.com/sdk-documentation/PVRTexTool.User+Manual.pdf)
 * WebGL extension: https://www.khronos.org/registry/webgl/extensions/WEBGL_compressed_texture_etc/
 */
exports.ETC = 'etc';
exports.IS_ETC = process.argv.includes(exports.ETC);
exports.ETC_SUPPORTED_INPUT_TYPES = ['.jpeg', '.jpg', '.png', '.bmp'];
exports.ETC_SUPPORTED_OUTPUT_TYPES = ['.ktx'];
exports.ETC_COMPRESSION_TYPES = ['ETC1', 'ETC2_RGBA', 'ETC2_RGB'];
exports.ETC_QUALITY_TYPES = ['etcfast', 'etcslow', 'etcfastperceptual', 'etcslowperceptual'];
/**
 * Compression tool: PVRTexTool (http://cdn.imgtec.com/sdk-documentation/PVRTexTool.User+Manual.pdf)
 * WebGL extension: http://www.khronos.org/registry/webgl/extensions/WEBGL_compressed_texture_pvrtc/
 */
exports.PVRTC = 'pvrtc';
exports.IS_PVRTC = process.argv.includes(exports.PVRTC);
exports.PVRTC_SUPPORTED_INPUT_TYPES = ['.jpeg', '.jpg', '.png', '.bmp'];
exports.PVRTC_SUPPORTED_OUTPUT_TYPES = ['.ktx'];
exports.PVRTC_COMPRESSION_TYPES = ['PVRTC1_2', 'PVRTC1_4', 'PVRTC1_2_RGB', 'PVRTC1_4_RGB'];
exports.PVRTC_QUALITY_TYPES = [
    'pvrtcfastest',
    'pvrtcfast',
    'pvrtcnormal',
    'pvrtchigh',
    'pvrtcbest',
];
/**
 * Compression tool: Crunch (https://github.com/BinomialLLC/crunch/blob/235946f7a1cf8b9c97e8bf0e8062d5439a51dec7/crunch/crunch.cpp#L70-L181)
 * WebGL extension: http://www.khronos.org/registry/webgl/extensions/WEBGL_compressed_texture_s3tc/
 */
exports.S3TC = 's3tc';
exports.IS_S3TC = process.argv.includes(exports.S3TC);
exports.S3TC_SUPPORTED_INPUT_TYPES = ['.jpeg', '.jpg', '.png', '.bmp', '.gif'];
exports.S3TC_SUPPORTED_OUTPUT_TYPES = ['.ktx'];
exports.S3TC_COMPRESSION_TYPES = ['DXT1', 'DXT1A', 'DXT3', 'DXT5'];
exports.S3TC_QUALITY_TYPES = ['superfast', 'fast', 'normal', 'better', 'uber'];
//# sourceMappingURL=constants.js.map