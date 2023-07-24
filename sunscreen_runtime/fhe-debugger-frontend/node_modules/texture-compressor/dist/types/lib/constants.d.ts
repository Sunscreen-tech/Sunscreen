/**
 * General constants
 */
export declare const COMPRESSION_FORMAT_FLAGS: string[];
/**
 * Compression tool: PVRTexTool (http://cdn.imgtec.com/sdk-documentation/PVRTexTool.User+Manual.pdf)
 * Compression tool: ASTCenc (https://github.com/ARM-software/astc-encoder)
 * WebGL extension: https://www.khronos.org/registry/webgl/extensions/WEBGL_compressed_texture_astc/
 */
export declare const ASTC = "astc";
export declare const IS_ASTC: boolean;
export declare const ASTC_SUPPORTED_INPUT_TYPES: string[];
export declare const ASTC_SUPPORTED_OUTPUT_TYPES: string[];
export declare const ASTC_COMPRESSION_TYPES: string[];
export declare const ASTC_QUALITY_TYPES: string[];
/**
 * Compression tool: PVRTexTool (http://cdn.imgtec.com/sdk-documentation/PVRTexTool.User+Manual.pdf)
 * WebGL extension: https://www.khronos.org/registry/webgl/extensions/WEBGL_compressed_texture_etc/
 */
export declare const ETC = "etc";
export declare const IS_ETC: boolean;
export declare const ETC_SUPPORTED_INPUT_TYPES: string[];
export declare const ETC_SUPPORTED_OUTPUT_TYPES: string[];
export declare const ETC_COMPRESSION_TYPES: string[];
export declare const ETC_QUALITY_TYPES: string[];
/**
 * Compression tool: PVRTexTool (http://cdn.imgtec.com/sdk-documentation/PVRTexTool.User+Manual.pdf)
 * WebGL extension: http://www.khronos.org/registry/webgl/extensions/WEBGL_compressed_texture_pvrtc/
 */
export declare const PVRTC = "pvrtc";
export declare const IS_PVRTC: boolean;
export declare const PVRTC_SUPPORTED_INPUT_TYPES: string[];
export declare const PVRTC_SUPPORTED_OUTPUT_TYPES: string[];
export declare const PVRTC_COMPRESSION_TYPES: string[];
export declare const PVRTC_QUALITY_TYPES: string[];
/**
 * Compression tool: Crunch (https://github.com/BinomialLLC/crunch/blob/235946f7a1cf8b9c97e8bf0e8062d5439a51dec7/crunch/crunch.cpp#L70-L181)
 * WebGL extension: http://www.khronos.org/registry/webgl/extensions/WEBGL_compressed_texture_s3tc/
 */
export declare const S3TC = "s3tc";
export declare const IS_S3TC: boolean;
export declare const S3TC_SUPPORTED_INPUT_TYPES: string[];
export declare const S3TC_SUPPORTED_OUTPUT_TYPES: string[];
export declare const S3TC_COMPRESSION_TYPES: string[];
export declare const S3TC_QUALITY_TYPES: string[];
