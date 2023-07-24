"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = parseBasis;
exports.selectSupportedBasisFormat = selectSupportedBasisFormat;
var _regenerator = _interopRequireDefault(require("@babel/runtime/regenerator"));
var _typeof2 = _interopRequireDefault(require("@babel/runtime/helpers/typeof"));
var _asyncToGenerator2 = _interopRequireDefault(require("@babel/runtime/helpers/asyncToGenerator"));
var _basisModuleLoader = require("./basis-module-loader");
var _glExtensions = require("../gl-extensions");
var _textureFormats = require("../utils/texture-formats");
var _parseKtx = require("./parse-ktx");
var OutputFormat = {
  etc1: {
    basisFormat: 0,
    compressed: true,
    format: _glExtensions.GL_EXTENSIONS_CONSTANTS.COMPRESSED_RGB_ETC1_WEBGL
  },
  etc2: {
    basisFormat: 1,
    compressed: true
  },
  bc1: {
    basisFormat: 2,
    compressed: true,
    format: _glExtensions.GL_EXTENSIONS_CONSTANTS.COMPRESSED_RGB_S3TC_DXT1_EXT
  },
  bc3: {
    basisFormat: 3,
    compressed: true,
    format: _glExtensions.GL_EXTENSIONS_CONSTANTS.COMPRESSED_RGBA_S3TC_DXT5_EXT
  },
  bc4: {
    basisFormat: 4,
    compressed: true
  },
  bc5: {
    basisFormat: 5,
    compressed: true
  },
  'bc7-m6-opaque-only': {
    basisFormat: 6,
    compressed: true
  },
  'bc7-m5': {
    basisFormat: 7,
    compressed: true
  },
  'pvrtc1-4-rgb': {
    basisFormat: 8,
    compressed: true,
    format: _glExtensions.GL_EXTENSIONS_CONSTANTS.COMPRESSED_RGB_PVRTC_4BPPV1_IMG
  },
  'pvrtc1-4-rgba': {
    basisFormat: 9,
    compressed: true,
    format: _glExtensions.GL_EXTENSIONS_CONSTANTS.COMPRESSED_RGBA_PVRTC_4BPPV1_IMG
  },
  'astc-4x4': {
    basisFormat: 10,
    compressed: true,
    format: _glExtensions.GL_EXTENSIONS_CONSTANTS.COMPRESSED_RGBA_ASTC_4X4_KHR
  },
  'atc-rgb': {
    basisFormat: 11,
    compressed: true
  },
  'atc-rgba-interpolated-alpha': {
    basisFormat: 12,
    compressed: true
  },
  rgba32: {
    basisFormat: 13,
    compressed: false
  },
  rgb565: {
    basisFormat: 14,
    compressed: false
  },
  bgr565: {
    basisFormat: 15,
    compressed: false
  },
  rgba4444: {
    basisFormat: 16,
    compressed: false
  }
};
function parseBasis(_x, _x2) {
  return _parseBasis.apply(this, arguments);
}
function _parseBasis() {
  _parseBasis = (0, _asyncToGenerator2.default)(_regenerator.default.mark(function _callee(data, options) {
    var fileConstructors, _yield$loadBasisTrasc, BasisFile, _fileConstructors, _yield$loadBasisTrasc2, _BasisFile;
    return _regenerator.default.wrap(function _callee$(_context) {
      while (1) switch (_context.prev = _context.next) {
        case 0:
          if (!(options.basis.containerFormat === 'auto')) {
            _context.next = 11;
            break;
          }
          if (!(0, _parseKtx.isKTX)(data)) {
            _context.next = 6;
            break;
          }
          _context.next = 4;
          return (0, _basisModuleLoader.loadBasisEncoderModule)(options);
        case 4:
          fileConstructors = _context.sent;
          return _context.abrupt("return", parseKTX2File(fileConstructors.KTX2File, data, options));
        case 6:
          _context.next = 8;
          return (0, _basisModuleLoader.loadBasisTrascoderModule)(options);
        case 8:
          _yield$loadBasisTrasc = _context.sent;
          BasisFile = _yield$loadBasisTrasc.BasisFile;
          return _context.abrupt("return", parseBasisFile(BasisFile, data, options));
        case 11:
          _context.t0 = options.basis.module;
          _context.next = _context.t0 === 'encoder' ? 14 : _context.t0 === 'transcoder' ? 22 : 22;
          break;
        case 14:
          _context.next = 16;
          return (0, _basisModuleLoader.loadBasisEncoderModule)(options);
        case 16:
          _fileConstructors = _context.sent;
          _context.t1 = options.basis.containerFormat;
          _context.next = _context.t1 === 'ktx2' ? 20 : _context.t1 === 'basis' ? 21 : 21;
          break;
        case 20:
          return _context.abrupt("return", parseKTX2File(_fileConstructors.KTX2File, data, options));
        case 21:
          return _context.abrupt("return", parseBasisFile(_fileConstructors.BasisFile, data, options));
        case 22:
          _context.next = 24;
          return (0, _basisModuleLoader.loadBasisTrascoderModule)(options);
        case 24:
          _yield$loadBasisTrasc2 = _context.sent;
          _BasisFile = _yield$loadBasisTrasc2.BasisFile;
          return _context.abrupt("return", parseBasisFile(_BasisFile, data, options));
        case 27:
        case "end":
          return _context.stop();
      }
    }, _callee);
  }));
  return _parseBasis.apply(this, arguments);
}
function parseBasisFile(BasisFile, data, options) {
  var basisFile = new BasisFile(new Uint8Array(data));
  try {
    if (!basisFile.startTranscoding()) {
      throw new Error('Failed to start basis transcoding');
    }
    var imageCount = basisFile.getNumImages();
    var images = [];
    for (var imageIndex = 0; imageIndex < imageCount; imageIndex++) {
      var levelsCount = basisFile.getNumLevels(imageIndex);
      var levels = [];
      for (var levelIndex = 0; levelIndex < levelsCount; levelIndex++) {
        levels.push(transcodeImage(basisFile, imageIndex, levelIndex, options));
      }
      images.push(levels);
    }
    return images;
  } finally {
    basisFile.close();
    basisFile.delete();
  }
}
function transcodeImage(basisFile, imageIndex, levelIndex, options) {
  var width = basisFile.getImageWidth(imageIndex, levelIndex);
  var height = basisFile.getImageHeight(imageIndex, levelIndex);
  var hasAlpha = basisFile.getHasAlpha();
  var _getBasisOptions = getBasisOptions(options, hasAlpha),
    compressed = _getBasisOptions.compressed,
    format = _getBasisOptions.format,
    basisFormat = _getBasisOptions.basisFormat;
  var decodedSize = basisFile.getImageTranscodedSizeInBytes(imageIndex, levelIndex, basisFormat);
  var decodedData = new Uint8Array(decodedSize);
  if (!basisFile.transcodeImage(decodedData, imageIndex, levelIndex, basisFormat, 0, 0)) {
    throw new Error('failed to start Basis transcoding');
  }
  return {
    width: width,
    height: height,
    data: decodedData,
    compressed: compressed,
    format: format,
    hasAlpha: hasAlpha
  };
}
function parseKTX2File(KTX2File, data, options) {
  var ktx2File = new KTX2File(new Uint8Array(data));
  try {
    if (!ktx2File.startTranscoding()) {
      throw new Error('failed to start KTX2 transcoding');
    }
    var levelsCount = ktx2File.getLevels();
    var levels = [];
    for (var levelIndex = 0; levelIndex < levelsCount; levelIndex++) {
      levels.push(transcodeKTX2Image(ktx2File, levelIndex, options));
      break;
    }
    return [levels];
  } finally {
    ktx2File.close();
    ktx2File.delete();
  }
}
function transcodeKTX2Image(ktx2File, levelIndex, options) {
  var _ktx2File$getImageLev = ktx2File.getImageLevelInfo(levelIndex, 0, 0),
    alphaFlag = _ktx2File$getImageLev.alphaFlag,
    height = _ktx2File$getImageLev.height,
    width = _ktx2File$getImageLev.width;
  var _getBasisOptions2 = getBasisOptions(options, alphaFlag),
    compressed = _getBasisOptions2.compressed,
    format = _getBasisOptions2.format,
    basisFormat = _getBasisOptions2.basisFormat;
  var decodedSize = ktx2File.getImageTranscodedSizeInBytes(levelIndex, 0, 0, basisFormat);
  var decodedData = new Uint8Array(decodedSize);
  if (!ktx2File.transcodeImage(decodedData, levelIndex, 0, 0, basisFormat, 0, -1, -1)) {
    throw new Error('Failed to transcode KTX2 image');
  }
  return {
    width: width,
    height: height,
    data: decodedData,
    compressed: compressed,
    levelSize: decodedSize,
    hasAlpha: alphaFlag,
    format: format
  };
}
function getBasisOptions(options, hasAlpha) {
  var format = options && options.basis && options.basis.format;
  if (format === 'auto') {
    format = selectSupportedBasisFormat();
  }
  if ((0, _typeof2.default)(format) === 'object') {
    format = hasAlpha ? format.alpha : format.noAlpha;
  }
  format = format.toLowerCase();
  return OutputFormat[format];
}
function selectSupportedBasisFormat() {
  var supportedFormats = (0, _textureFormats.getSupportedGPUTextureFormats)();
  if (supportedFormats.has('astc')) {
    return 'astc-4x4';
  } else if (supportedFormats.has('dxt')) {
    return {
      alpha: 'bc3',
      noAlpha: 'bc1'
    };
  } else if (supportedFormats.has('pvrtc')) {
    return {
      alpha: 'pvrtc1-4-rgba',
      noAlpha: 'pvrtc1-4-rgb'
    };
  } else if (supportedFormats.has('etc1')) {
    return 'etc1';
  } else if (supportedFormats.has('etc2')) {
    return 'etc2';
  }
  return 'rgb565';
}
//# sourceMappingURL=parse-basis.js.map