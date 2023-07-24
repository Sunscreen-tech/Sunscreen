"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDxtXLevelSize = exports.getDxt1LevelSize = exports.parseDDS = exports.isDDS = void 0;
const loader_utils_1 = require("@loaders.gl/loader-utils");
const gl_extensions_1 = require("../gl-extensions");
const extract_mipmap_images_1 = require("../utils/extract-mipmap-images");
const DDS_CONSTANTS = {
    MAGIC_NUMBER: 0x20534444,
    HEADER_LENGTH: 31,
    MAGIC_NUMBER_INDEX: 0,
    HEADER_SIZE_INDEX: 1,
    HEADER_FLAGS_INDEX: 2,
    HEADER_HEIGHT_INDEX: 3,
    HEADER_WIDTH_INDEX: 4,
    MIPMAPCOUNT_INDEX: 7,
    HEADER_PF_FLAGS_INDEX: 20,
    HEADER_PF_FOURCC_INDEX: 21,
    DDSD_MIPMAPCOUNT: 0x20000,
    DDPF_FOURCC: 0x4
};
const DDS_PIXEL_FORMATS = {
    DXT1: gl_extensions_1.GL_EXTENSIONS_CONSTANTS.COMPRESSED_RGB_S3TC_DXT1_EXT,
    DXT3: gl_extensions_1.GL_EXTENSIONS_CONSTANTS.COMPRESSED_RGBA_S3TC_DXT3_EXT,
    DXT5: gl_extensions_1.GL_EXTENSIONS_CONSTANTS.COMPRESSED_RGBA_S3TC_DXT5_EXT,
    'ATC ': gl_extensions_1.GL_EXTENSIONS_CONSTANTS.COMPRESSED_RGB_ATC_WEBGL,
    ATCA: gl_extensions_1.GL_EXTENSIONS_CONSTANTS.COMPRESSED_RGBA_ATC_EXPLICIT_ALPHA_WEBGL,
    ATCI: gl_extensions_1.GL_EXTENSIONS_CONSTANTS.COMPRESSED_RGBA_ATC_INTERPOLATED_ALPHA_WEBGL
};
const getATCLevelSize = getDxt1LevelSize;
const getATCALevelSize = getDxtXLevelSize;
const getATCILevelSize = getDxtXLevelSize;
const DDS_SIZE_FUNCTIONS = {
    DXT1: getDxt1LevelSize,
    DXT3: getDxtXLevelSize,
    DXT5: getDxtXLevelSize,
    'ATC ': getATCLevelSize,
    ATCA: getATCALevelSize,
    ATCI: getATCILevelSize
};
/**
 * Check if data is in "DDS" format by its magic number
 * @param data - binary data of compressed texture
 * @returns true - data in "DDS" format, else - false
 */
function isDDS(data) {
    const header = new Uint32Array(data, 0, DDS_CONSTANTS.HEADER_LENGTH);
    const magic = header[DDS_CONSTANTS.MAGIC_NUMBER_INDEX];
    return magic === DDS_CONSTANTS.MAGIC_NUMBER;
}
exports.isDDS = isDDS;
/**
 * Parse texture data as "DDS" format
 * @param data - binary data of compressed texture
 * @returns Array of the texture levels
 */
function parseDDS(data) {
    const header = new Int32Array(data, 0, DDS_CONSTANTS.HEADER_LENGTH);
    const pixelFormatNumber = header[DDS_CONSTANTS.HEADER_PF_FOURCC_INDEX];
    (0, loader_utils_1.assert)(Boolean(header[DDS_CONSTANTS.HEADER_PF_FLAGS_INDEX] & DDS_CONSTANTS.DDPF_FOURCC), 'DDS: Unsupported format, must contain a FourCC code');
    const fourCC = int32ToFourCC(pixelFormatNumber);
    const internalFormat = DDS_PIXEL_FORMATS[fourCC];
    const sizeFunction = DDS_SIZE_FUNCTIONS[fourCC];
    (0, loader_utils_1.assert)(internalFormat && sizeFunction, `DDS: Unknown pixel format ${pixelFormatNumber}`);
    let mipMapLevels = 1;
    if (header[DDS_CONSTANTS.HEADER_FLAGS_INDEX] & DDS_CONSTANTS.DDSD_MIPMAPCOUNT) {
        mipMapLevels = Math.max(1, header[DDS_CONSTANTS.MIPMAPCOUNT_INDEX]);
    }
    const width = header[DDS_CONSTANTS.HEADER_WIDTH_INDEX];
    const height = header[DDS_CONSTANTS.HEADER_HEIGHT_INDEX];
    const dataOffset = header[DDS_CONSTANTS.HEADER_SIZE_INDEX] + 4;
    const image = new Uint8Array(data, dataOffset);
    return (0, extract_mipmap_images_1.extractMipmapImages)(image, {
        mipMapLevels,
        width,
        height,
        sizeFunction,
        internalFormat
    });
}
exports.parseDDS = parseDDS;
/**
 * DXT1 applicable function to calculate level size
 * @param width - level width
 * @param height - level height
 * @returns level size in bytes
 */
function getDxt1LevelSize(width, height) {
    return ((width + 3) >> 2) * ((height + 3) >> 2) * 8;
}
exports.getDxt1LevelSize = getDxt1LevelSize;
/**
 * DXT3 & DXT5 applicable function to calculate level size
 * @param width - level width
 * @param height - level height
 * @returns level size in bytes
 */
function getDxtXLevelSize(width, height) {
    return ((width + 3) >> 2) * ((height + 3) >> 2) * 16;
}
exports.getDxtXLevelSize = getDxtXLevelSize;
/**
 * Convert every byte of Int32 value to char
 * @param value - Int32 number
 * @returns string of 4 characters
 */
function int32ToFourCC(value) {
    return String.fromCharCode(value & 0xff, (value >> 8) & 0xff, (value >> 16) & 0xff, (value >> 24) & 0xff);
}
