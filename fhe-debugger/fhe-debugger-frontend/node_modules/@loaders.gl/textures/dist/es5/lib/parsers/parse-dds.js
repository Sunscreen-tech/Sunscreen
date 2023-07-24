"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getDxt1LevelSize = getDxt1LevelSize;
exports.getDxtXLevelSize = getDxtXLevelSize;
exports.isDDS = isDDS;
exports.parseDDS = parseDDS;
var _loaderUtils = require("@loaders.gl/loader-utils");
var _glExtensions = require("../gl-extensions");
var _extractMipmapImages = require("../utils/extract-mipmap-images");
var DDS_CONSTANTS = {
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
var DDS_PIXEL_FORMATS = {
  DXT1: _glExtensions.GL_EXTENSIONS_CONSTANTS.COMPRESSED_RGB_S3TC_DXT1_EXT,
  DXT3: _glExtensions.GL_EXTENSIONS_CONSTANTS.COMPRESSED_RGBA_S3TC_DXT3_EXT,
  DXT5: _glExtensions.GL_EXTENSIONS_CONSTANTS.COMPRESSED_RGBA_S3TC_DXT5_EXT,
  'ATC ': _glExtensions.GL_EXTENSIONS_CONSTANTS.COMPRESSED_RGB_ATC_WEBGL,
  ATCA: _glExtensions.GL_EXTENSIONS_CONSTANTS.COMPRESSED_RGBA_ATC_EXPLICIT_ALPHA_WEBGL,
  ATCI: _glExtensions.GL_EXTENSIONS_CONSTANTS.COMPRESSED_RGBA_ATC_INTERPOLATED_ALPHA_WEBGL
};
var getATCLevelSize = getDxt1LevelSize;
var getATCALevelSize = getDxtXLevelSize;
var getATCILevelSize = getDxtXLevelSize;
var DDS_SIZE_FUNCTIONS = {
  DXT1: getDxt1LevelSize,
  DXT3: getDxtXLevelSize,
  DXT5: getDxtXLevelSize,
  'ATC ': getATCLevelSize,
  ATCA: getATCALevelSize,
  ATCI: getATCILevelSize
};
function isDDS(data) {
  var header = new Uint32Array(data, 0, DDS_CONSTANTS.HEADER_LENGTH);
  var magic = header[DDS_CONSTANTS.MAGIC_NUMBER_INDEX];
  return magic === DDS_CONSTANTS.MAGIC_NUMBER;
}
function parseDDS(data) {
  var header = new Int32Array(data, 0, DDS_CONSTANTS.HEADER_LENGTH);
  var pixelFormatNumber = header[DDS_CONSTANTS.HEADER_PF_FOURCC_INDEX];
  (0, _loaderUtils.assert)(Boolean(header[DDS_CONSTANTS.HEADER_PF_FLAGS_INDEX] & DDS_CONSTANTS.DDPF_FOURCC), 'DDS: Unsupported format, must contain a FourCC code');
  var fourCC = int32ToFourCC(pixelFormatNumber);
  var internalFormat = DDS_PIXEL_FORMATS[fourCC];
  var sizeFunction = DDS_SIZE_FUNCTIONS[fourCC];
  (0, _loaderUtils.assert)(internalFormat && sizeFunction, "DDS: Unknown pixel format ".concat(pixelFormatNumber));
  var mipMapLevels = 1;
  if (header[DDS_CONSTANTS.HEADER_FLAGS_INDEX] & DDS_CONSTANTS.DDSD_MIPMAPCOUNT) {
    mipMapLevels = Math.max(1, header[DDS_CONSTANTS.MIPMAPCOUNT_INDEX]);
  }
  var width = header[DDS_CONSTANTS.HEADER_WIDTH_INDEX];
  var height = header[DDS_CONSTANTS.HEADER_HEIGHT_INDEX];
  var dataOffset = header[DDS_CONSTANTS.HEADER_SIZE_INDEX] + 4;
  var image = new Uint8Array(data, dataOffset);
  return (0, _extractMipmapImages.extractMipmapImages)(image, {
    mipMapLevels: mipMapLevels,
    width: width,
    height: height,
    sizeFunction: sizeFunction,
    internalFormat: internalFormat
  });
}
function getDxt1LevelSize(width, height) {
  return (width + 3 >> 2) * (height + 3 >> 2) * 8;
}
function getDxtXLevelSize(width, height) {
  return (width + 3 >> 2) * (height + 3 >> 2) * 16;
}
function int32ToFourCC(value) {
  return String.fromCharCode(value & 0xff, value >> 8 & 0xff, value >> 16 & 0xff, value >> 24 & 0xff);
}
//# sourceMappingURL=parse-dds.js.map