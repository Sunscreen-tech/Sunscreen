"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getImageCubeUrls = getImageCubeUrls;
exports.loadImageTextureCube = loadImageTextureCube;
var _regenerator = _interopRequireDefault(require("@babel/runtime/regenerator"));
var _defineProperty2 = _interopRequireDefault(require("@babel/runtime/helpers/defineProperty"));
var _asyncToGenerator2 = _interopRequireDefault(require("@babel/runtime/helpers/asyncToGenerator"));
var _images = require("@loaders.gl/images");
var _loadImage = require("./load-image");
var _deepLoad = require("./deep-load");
function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); enumerableOnly && (symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; })), keys.push.apply(keys, symbols); } return keys; }
function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = null != arguments[i] ? arguments[i] : {}; i % 2 ? ownKeys(Object(source), !0).forEach(function (key) { (0, _defineProperty2.default)(target, key, source[key]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)) : ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } return target; }
var GL_TEXTURE_CUBE_MAP_POSITIVE_X = 0x8515;
var GL_TEXTURE_CUBE_MAP_NEGATIVE_X = 0x8516;
var GL_TEXTURE_CUBE_MAP_POSITIVE_Y = 0x8517;
var GL_TEXTURE_CUBE_MAP_NEGATIVE_Y = 0x8518;
var GL_TEXTURE_CUBE_MAP_POSITIVE_Z = 0x8519;
var GL_TEXTURE_CUBE_MAP_NEGATIVE_Z = 0x851a;
var CUBE_FACES = [{
  face: GL_TEXTURE_CUBE_MAP_POSITIVE_X,
  direction: 'right',
  axis: 'x',
  sign: 'positive'
}, {
  face: GL_TEXTURE_CUBE_MAP_NEGATIVE_X,
  direction: 'left',
  axis: 'x',
  sign: 'negative'
}, {
  face: GL_TEXTURE_CUBE_MAP_POSITIVE_Y,
  direction: 'top',
  axis: 'y',
  sign: 'positive'
}, {
  face: GL_TEXTURE_CUBE_MAP_NEGATIVE_Y,
  direction: 'bottom',
  axis: 'y',
  sign: 'negative'
}, {
  face: GL_TEXTURE_CUBE_MAP_POSITIVE_Z,
  direction: 'front',
  axis: 'z',
  sign: 'positive'
}, {
  face: GL_TEXTURE_CUBE_MAP_NEGATIVE_Z,
  direction: 'back',
  axis: 'z',
  sign: 'negative'
}];
function getImageCubeUrls(_x, _x2) {
  return _getImageCubeUrls.apply(this, arguments);
}
function _getImageCubeUrls() {
  _getImageCubeUrls = (0, _asyncToGenerator2.default)(_regenerator.default.mark(function _callee(getUrl, options) {
    var urls, promises, index, _loop, i;
    return _regenerator.default.wrap(function _callee$(_context2) {
      while (1) switch (_context2.prev = _context2.next) {
        case 0:
          urls = {};
          promises = [];
          index = 0;
          _loop = _regenerator.default.mark(function _loop() {
            var face, promise;
            return _regenerator.default.wrap(function _loop$(_context) {
              while (1) switch (_context.prev = _context.next) {
                case 0:
                  face = CUBE_FACES[index];
                  promise = (0, _loadImage.getImageUrls)(getUrl, options, _objectSpread(_objectSpread({}, face), {}, {
                    index: index++
                  })).then(function (url) {
                    urls[face.face] = url;
                  });
                  promises.push(promise);
                case 3:
                case "end":
                  return _context.stop();
              }
            }, _loop);
          });
          i = 0;
        case 5:
          if (!(i < CUBE_FACES.length)) {
            _context2.next = 10;
            break;
          }
          return _context2.delegateYield(_loop(), "t0", 7);
        case 7:
          ++i;
          _context2.next = 5;
          break;
        case 10:
          _context2.next = 12;
          return Promise.all(promises);
        case 12:
          return _context2.abrupt("return", urls);
        case 13:
        case "end":
          return _context2.stop();
      }
    }, _callee);
  }));
  return _getImageCubeUrls.apply(this, arguments);
}
function loadImageTextureCube(_x3) {
  return _loadImageTextureCube.apply(this, arguments);
}
function _loadImageTextureCube() {
  _loadImageTextureCube = (0, _asyncToGenerator2.default)(_regenerator.default.mark(function _callee2(getUrl) {
    var options,
      urls,
      _args3 = arguments;
    return _regenerator.default.wrap(function _callee2$(_context3) {
      while (1) switch (_context3.prev = _context3.next) {
        case 0:
          options = _args3.length > 1 && _args3[1] !== undefined ? _args3[1] : {};
          _context3.next = 3;
          return getImageCubeUrls(getUrl, options);
        case 3:
          urls = _context3.sent;
          _context3.next = 6;
          return (0, _deepLoad.deepLoad)(urls, _images.ImageLoader.parse, options);
        case 6:
          return _context3.abrupt("return", _context3.sent);
        case 7:
        case "end":
          return _context3.stop();
      }
    }, _callee2);
  }));
  return _loadImageTextureCube.apply(this, arguments);
}
//# sourceMappingURL=load-image-cube.js.map