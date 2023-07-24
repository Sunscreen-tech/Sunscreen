"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.encodeImageURLToCompressedTextureURL = encodeImageURLToCompressedTextureURL;
var _regenerator = _interopRequireDefault(require("@babel/runtime/regenerator"));
var _asyncToGenerator2 = _interopRequireDefault(require("@babel/runtime/helpers/asyncToGenerator"));
var _workerUtils = require("@loaders.gl/worker-utils");
function encodeImageURLToCompressedTextureURL(_x, _x2, _x3) {
  return _encodeImageURLToCompressedTextureURL.apply(this, arguments);
}
function _encodeImageURLToCompressedTextureURL() {
  _encodeImageURLToCompressedTextureURL = (0, _asyncToGenerator2.default)(_regenerator.default.mark(function _callee(inputUrl, outputUrl, options) {
    var args, childProcess;
    return _regenerator.default.wrap(function _callee$(_context) {
      while (1) switch (_context.prev = _context.next) {
        case 0:
          args = ['texture-compressor', '--type', 's3tc', '--compression', 'DXT1', '--quality', 'normal', '--input', inputUrl, '--output', outputUrl];
          childProcess = new _workerUtils.ChildProcessProxy();
          _context.next = 4;
          return childProcess.start({
            command: 'npx',
            arguments: args,
            spawn: options
          });
        case 4:
          return _context.abrupt("return", outputUrl);
        case 5:
        case "end":
          return _context.stop();
      }
    }, _callee);
  }));
  return _encodeImageURLToCompressedTextureURL.apply(this, arguments);
}
//# sourceMappingURL=encode-texture.js.map