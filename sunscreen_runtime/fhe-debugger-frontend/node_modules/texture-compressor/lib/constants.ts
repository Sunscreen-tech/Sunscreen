/**
 * General constants
 */
export const COMPRESSION_FORMAT_FLAGS = ['astc', 'etc', 'pvrtc', 's3tc'];

/**
 * Compression tool: PVRTexTool (http://cdn.imgtec.com/sdk-documentation/PVRTexTool.User+Manual.pdf)
 * Compression tool: ASTCenc (https://github.com/ARM-software/astc-encoder)
 * WebGL extension: https://www.khronos.org/registry/webgl/extensions/WEBGL_compressed_texture_astc/
 */
export const ASTC = 'astc';
export const IS_ASTC = process.argv.includes(ASTC);
export const ASTC_SUPPORTED_INPUT_TYPES = ['.jpeg', '.jpg', '.png', '.bmp', '.gif'];
export const ASTC_SUPPORTED_OUTPUT_TYPES = ['.ktx'];
export const ASTC_COMPRESSION_TYPES = [
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
export const ASTC_QUALITY_TYPES = [
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
export const ETC = 'etc';
export const IS_ETC = process.argv.includes(ETC);
export const ETC_SUPPORTED_INPUT_TYPES = ['.jpeg', '.jpg', '.png', '.bmp'];
export const ETC_SUPPORTED_OUTPUT_TYPES = ['.ktx'];
export const ETC_COMPRESSION_TYPES = ['ETC1', 'ETC2_RGBA', 'ETC2_RGB'];
export const ETC_QUALITY_TYPES = ['etcfast', 'etcslow', 'etcfastperceptual', 'etcslowperceptual'];

/**
 * Compression tool: PVRTexTool (http://cdn.imgtec.com/sdk-documentation/PVRTexTool.User+Manual.pdf)
 * WebGL extension: http://www.khronos.org/registry/webgl/extensions/WEBGL_compressed_texture_pvrtc/
 */
export const PVRTC = 'pvrtc';
export const IS_PVRTC = process.argv.includes(PVRTC);
export const PVRTC_SUPPORTED_INPUT_TYPES = ['.jpeg', '.jpg', '.png', '.bmp'];
export const PVRTC_SUPPORTED_OUTPUT_TYPES = ['.ktx'];
export const PVRTC_COMPRESSION_TYPES = ['PVRTC1_2', 'PVRTC1_4', 'PVRTC1_2_RGB', 'PVRTC1_4_RGB'];
export const PVRTC_QUALITY_TYPES = [
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
export const S3TC = 's3tc';
export const IS_S3TC = process.argv.includes(S3TC);
export const S3TC_SUPPORTED_INPUT_TYPES = ['.jpeg', '.jpg', '.png', '.bmp', '.gif'];
export const S3TC_SUPPORTED_OUTPUT_TYPES = ['.ktx'];
export const S3TC_COMPRESSION_TYPES = ['DXT1', 'DXT1A', 'DXT3', 'DXT5'];
export const S3TC_QUALITY_TYPES = ['superfast', 'fast', 'normal', 'better', 'uber'];
