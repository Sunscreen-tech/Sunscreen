"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.encodeKTX2BasisTexture = encodeKTX2BasisTexture;
var _regenerator = _interopRequireDefault(require("@babel/runtime/regenerator"));
var _asyncToGenerator2 = _interopRequireDefault(require("@babel/runtime/helpers/asyncToGenerator"));
var _basisModuleLoader = require("../parsers/basis-module-loader");
function encodeKTX2BasisTexture(_x) {
  return _encodeKTX2BasisTexture.apply(this, arguments);
}
function _encodeKTX2BasisTexture() {
  _encodeKTX2BasisTexture = (0, _asyncToGenerator2.default)(_regenerator.default.mark(function _callee(image) {
    var options,
      _options$useSRGB,
      useSRGB,
      _options$qualityLevel,
      qualityLevel,
      _options$encodeUASTC,
      encodeUASTC,
      _options$mipmaps,
      mipmaps,
      _yield$loadBasisEncod,
      BasisEncoder,
      basisEncoder,
      basisFileData,
      numOutputBytes,
      actualKTX2FileData,
      _args = arguments;
    return _regenerator.default.wrap(function _callee$(_context) {
      while (1) switch (_context.prev = _context.next) {
        case 0:
          options = _args.length > 1 && _args[1] !== undefined ? _args[1] : {};
          _options$useSRGB = options.useSRGB, useSRGB = _options$useSRGB === void 0 ? false : _options$useSRGB, _options$qualityLevel = options.qualityLevel, qualityLevel = _options$qualityLevel === void 0 ? 10 : _options$qualityLevel, _options$encodeUASTC = options.encodeUASTC, encodeUASTC = _options$encodeUASTC === void 0 ? false : _options$encodeUASTC, _options$mipmaps = options.mipmaps, mipmaps = _options$mipmaps === void 0 ? false : _options$mipmaps;
          _context.next = 4;
          return (0, _basisModuleLoader.loadBasisEncoderModule)(options);
        case 4:
          _yield$loadBasisEncod = _context.sent;
          BasisEncoder = _yield$loadBasisEncod.BasisEncoder;
          basisEncoder = new BasisEncoder();
          _context.prev = 7;
          basisFileData = new Uint8Array(image.width * image.height * 4);
          basisEncoder.setCreateKTX2File(true);
          basisEncoder.setKTX2UASTCSupercompression(true);
          basisEncoder.setKTX2SRGBTransferFunc(true);
          basisEncoder.setSliceSourceImage(0, image.data, image.width, image.height, false);
          basisEncoder.setPerceptual(useSRGB);
          basisEncoder.setMipSRGB(useSRGB);
          basisEncoder.setQualityLevel(qualityLevel);
          basisEncoder.setUASTC(encodeUASTC);
          basisEncoder.setMipGen(mipmaps);
          numOutputBytes = basisEncoder.encode(basisFileData);
          actualKTX2FileData = basisFileData.subarray(0, numOutputBytes).buffer;
          return _context.abrupt("return", actualKTX2FileData);
        case 23:
          _context.prev = 23;
          _context.t0 = _context["catch"](7);
          console.error('Basis Universal Supercompressed GPU Texture encoder Error: ', _context.t0);
          throw _context.t0;
        case 27:
          _context.prev = 27;
          basisEncoder.delete();
          return _context.finish(27);
        case 30:
        case "end":
          return _context.stop();
      }
    }, _callee, null, [[7, 23, 27, 30]]);
  }));
  return _encodeKTX2BasisTexture.apply(this, arguments);
}
//# sourceMappingURL=encode-ktx2-basis-texture.js.map