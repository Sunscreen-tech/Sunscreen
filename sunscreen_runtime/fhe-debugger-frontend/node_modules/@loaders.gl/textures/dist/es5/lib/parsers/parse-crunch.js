"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.parseCrunch = parseCrunch;
var _regenerator = _interopRequireDefault(require("@babel/runtime/regenerator"));
var _asyncToGenerator2 = _interopRequireDefault(require("@babel/runtime/helpers/asyncToGenerator"));
var _defineProperty2 = _interopRequireDefault(require("@babel/runtime/helpers/defineProperty"));
var _crunchModuleLoader = require("./crunch-module-loader");
var _glExtensions = require("../gl-extensions");
var _loaderUtils = require("@loaders.gl/loader-utils");
var _parseDds = require("./parse-dds");
var _extractMipmapImages = require("../utils/extract-mipmap-images");
var _DXT_FORMAT_MAP;
var CRN_FORMAT = {
  cCRNFmtInvalid: -1,
  cCRNFmtDXT1: 0,
  cCRNFmtDXT3: 1,
  cCRNFmtDXT5: 2
};
var DXT_FORMAT_MAP = (_DXT_FORMAT_MAP = {}, (0, _defineProperty2.default)(_DXT_FORMAT_MAP, CRN_FORMAT.cCRNFmtDXT1, {
  pixelFormat: _glExtensions.GL_EXTENSIONS_CONSTANTS.COMPRESSED_RGB_S3TC_DXT1_EXT,
  sizeFunction: _parseDds.getDxt1LevelSize
}), (0, _defineProperty2.default)(_DXT_FORMAT_MAP, CRN_FORMAT.cCRNFmtDXT3, {
  pixelFormat: _glExtensions.GL_EXTENSIONS_CONSTANTS.COMPRESSED_RGBA_S3TC_DXT3_EXT,
  sizeFunction: _parseDds.getDxtXLevelSize
}), (0, _defineProperty2.default)(_DXT_FORMAT_MAP, CRN_FORMAT.cCRNFmtDXT5, {
  pixelFormat: _glExtensions.GL_EXTENSIONS_CONSTANTS.COMPRESSED_RGBA_S3TC_DXT5_EXT,
  sizeFunction: _parseDds.getDxtXLevelSize
}), _DXT_FORMAT_MAP);
var cachedDstSize = 0;
var dst;
function parseCrunch(_x, _x2) {
  return _parseCrunch.apply(this, arguments);
}
function _parseCrunch() {
  _parseCrunch = (0, _asyncToGenerator2.default)(_regenerator.default.mark(function _callee(data, options) {
    var crunchModule, srcSize, bytes, src, format, mipMapLevels, width, height, sizeFunction, dstSize, i, image;
    return _regenerator.default.wrap(function _callee$(_context) {
      while (1) switch (_context.prev = _context.next) {
        case 0:
          _context.next = 2;
          return (0, _crunchModuleLoader.loadCrunchModule)(options);
        case 2:
          crunchModule = _context.sent;
          srcSize = data.byteLength;
          bytes = new Uint8Array(data);
          src = crunchModule._malloc(srcSize);
          arrayBufferCopy(bytes, crunchModule.HEAPU8, src, srcSize);
          format = crunchModule._crn_get_dxt_format(src, srcSize);
          (0, _loaderUtils.assert)(Boolean(DXT_FORMAT_MAP[format]), 'Unsupported format');
          mipMapLevels = crunchModule._crn_get_levels(src, srcSize);
          width = crunchModule._crn_get_width(src, srcSize);
          height = crunchModule._crn_get_height(src, srcSize);
          sizeFunction = DXT_FORMAT_MAP[format].sizeFunction;
          dstSize = 0;
          for (i = 0; i < mipMapLevels; ++i) {
            dstSize += sizeFunction(width >> i, height >> i);
          }
          if (cachedDstSize < dstSize) {
            if (dst) {
              crunchModule._free(dst);
            }
            dst = crunchModule._malloc(dstSize);
            cachedDstSize = dstSize;
          }
          crunchModule._crn_decompress(src, srcSize, dst, dstSize, 0, mipMapLevels);
          crunchModule._free(src);
          image = new Uint8Array(crunchModule.HEAPU8.buffer, dst, dstSize).slice();
          return _context.abrupt("return", (0, _extractMipmapImages.extractMipmapImages)(image, {
            mipMapLevels: mipMapLevels,
            width: width,
            height: height,
            sizeFunction: sizeFunction,
            internalFormat: DXT_FORMAT_MAP[format].pixelFormat
          }));
        case 20:
        case "end":
          return _context.stop();
      }
    }, _callee);
  }));
  return _parseCrunch.apply(this, arguments);
}
function arrayBufferCopy(srcData, dstData, dstByteOffset, numBytes) {
  var i;
  var dst32Offset = dstByteOffset / 4;
  var tail = numBytes % 4;
  var src32 = new Uint32Array(srcData.buffer, 0, (numBytes - tail) / 4);
  var dst32 = new Uint32Array(dstData.buffer);
  for (i = 0; i < src32.length; i++) {
    dst32[dst32Offset + i] = src32[i];
  }
  for (i = numBytes - tail; i < numBytes; i++) {
    dstData[dstByteOffset + i] = srcData[i];
  }
}
//# sourceMappingURL=parse-crunch.js.map