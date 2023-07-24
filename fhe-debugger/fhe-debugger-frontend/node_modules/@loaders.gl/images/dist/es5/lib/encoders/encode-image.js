"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.encodeImage = encodeImage;
var _regenerator = _interopRequireDefault(require("@babel/runtime/regenerator"));
var _asyncToGenerator2 = _interopRequireDefault(require("@babel/runtime/helpers/asyncToGenerator"));
var _parsedImageApi = require("../category-api/parsed-image-api");
var _encodeImageNode = globalThis._encodeImageNode;
function encodeImage(_x, _x2) {
  return _encodeImage.apply(this, arguments);
}
function _encodeImage() {
  _encodeImage = (0, _asyncToGenerator2.default)(_regenerator.default.mark(function _callee(image, options) {
    return _regenerator.default.wrap(function _callee$(_context2) {
      while (1) switch (_context2.prev = _context2.next) {
        case 0:
          options = options || {};
          options.image = options.image || {};
          return _context2.abrupt("return", _encodeImageNode ? _encodeImageNode(image, {
            type: options.image.mimeType
          }) : encodeImageInBrowser(image, options));
        case 3:
        case "end":
          return _context2.stop();
      }
    }, _callee);
  }));
  return _encodeImage.apply(this, arguments);
}
var qualityParamSupported = true;
function encodeImageInBrowser(_x3, _x4) {
  return _encodeImageInBrowser.apply(this, arguments);
}
function _encodeImageInBrowser() {
  _encodeImageInBrowser = (0, _asyncToGenerator2.default)(_regenerator.default.mark(function _callee2(image, options) {
    var _options$image, mimeType, jpegQuality, _getImageSize, width, height, canvas, blob;
    return _regenerator.default.wrap(function _callee2$(_context3) {
      while (1) switch (_context3.prev = _context3.next) {
        case 0:
          _options$image = options.image, mimeType = _options$image.mimeType, jpegQuality = _options$image.jpegQuality;
          _getImageSize = (0, _parsedImageApi.getImageSize)(image), width = _getImageSize.width, height = _getImageSize.height;
          canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          drawImageToCanvas(image, canvas);
          _context3.next = 8;
          return new Promise(function (resolve) {
            if (jpegQuality && qualityParamSupported) {
              try {
                canvas.toBlob(resolve, mimeType, jpegQuality);
                return;
              } catch (error) {
                qualityParamSupported = false;
              }
            }
            canvas.toBlob(resolve, mimeType);
          });
        case 8:
          blob = _context3.sent;
          if (blob) {
            _context3.next = 11;
            break;
          }
          throw new Error('image encoding failed');
        case 11:
          _context3.next = 13;
          return blob.arrayBuffer();
        case 13:
          return _context3.abrupt("return", _context3.sent);
        case 14:
        case "end":
          return _context3.stop();
      }
    }, _callee2);
  }));
  return _encodeImageInBrowser.apply(this, arguments);
}
function drawImageToCanvas(image, canvas) {
  var x = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 0;
  var y = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : 0;
  if (x === 0 && y === 0 && typeof ImageBitmap !== 'undefined' && image instanceof ImageBitmap) {
    var _context = canvas.getContext('bitmaprenderer');
    if (_context) {
      _context.transferFromImageBitmap(image);
      return canvas;
    }
  }
  var context = canvas.getContext('2d');
  if (image.data) {
    var clampedArray = new Uint8ClampedArray(image.data);
    var imageData = new ImageData(clampedArray, image.width, image.height);
    context.putImageData(imageData, 0, 0);
    return canvas;
  }
  context.drawImage(image, 0, 0);
  return canvas;
}
//# sourceMappingURL=encode-image.js.map