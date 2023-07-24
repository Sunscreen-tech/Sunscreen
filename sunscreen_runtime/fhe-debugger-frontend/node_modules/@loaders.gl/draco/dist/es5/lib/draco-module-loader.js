"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.loadDracoDecoderModule = loadDracoDecoderModule;
exports.loadDracoEncoderModule = loadDracoEncoderModule;
var _regenerator = _interopRequireDefault(require("@babel/runtime/regenerator"));
var _slicedToArray2 = _interopRequireDefault(require("@babel/runtime/helpers/slicedToArray"));
var _defineProperty2 = _interopRequireDefault(require("@babel/runtime/helpers/defineProperty"));
var _asyncToGenerator2 = _interopRequireDefault(require("@babel/runtime/helpers/asyncToGenerator"));
var _workerUtils = require("@loaders.gl/worker-utils");
function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); enumerableOnly && (symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; })), keys.push.apply(keys, symbols); } return keys; }
function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = null != arguments[i] ? arguments[i] : {}; i % 2 ? ownKeys(Object(source), !0).forEach(function (key) { (0, _defineProperty2.default)(target, key, source[key]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)) : ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } return target; }
var DRACO_DECODER_VERSION = '1.5.5';
var DRACO_ENCODER_VERSION = '1.4.1';
var STATIC_DECODER_URL = "https://www.gstatic.com/draco/versioned/decoders/".concat(DRACO_DECODER_VERSION);
var DRACO_JS_DECODER_URL = "".concat(STATIC_DECODER_URL, "/draco_decoder.js");
var DRACO_WASM_WRAPPER_URL = "".concat(STATIC_DECODER_URL, "/draco_wasm_wrapper.js");
var DRACO_WASM_DECODER_URL = "".concat(STATIC_DECODER_URL, "/draco_decoder.wasm");
var DRACO_ENCODER_URL = "https://raw.githubusercontent.com/google/draco/".concat(DRACO_ENCODER_VERSION, "/javascript/draco_encoder.js");
var loadDecoderPromise;
var loadEncoderPromise;
function loadDracoDecoderModule(_x) {
  return _loadDracoDecoderModule.apply(this, arguments);
}
function _loadDracoDecoderModule() {
  _loadDracoDecoderModule = (0, _asyncToGenerator2.default)(_regenerator.default.mark(function _callee(options) {
    var modules;
    return _regenerator.default.wrap(function _callee$(_context) {
      while (1) switch (_context.prev = _context.next) {
        case 0:
          modules = options.modules || {};
          if (modules.draco3d) {
            loadDecoderPromise = loadDecoderPromise || modules.draco3d.createDecoderModule({}).then(function (draco) {
              return {
                draco: draco
              };
            });
          } else {
            loadDecoderPromise = loadDecoderPromise || loadDracoDecoder(options);
          }
          _context.next = 4;
          return loadDecoderPromise;
        case 4:
          return _context.abrupt("return", _context.sent);
        case 5:
        case "end":
          return _context.stop();
      }
    }, _callee);
  }));
  return _loadDracoDecoderModule.apply(this, arguments);
}
function loadDracoEncoderModule(_x2) {
  return _loadDracoEncoderModule.apply(this, arguments);
}
function _loadDracoEncoderModule() {
  _loadDracoEncoderModule = (0, _asyncToGenerator2.default)(_regenerator.default.mark(function _callee2(options) {
    var modules;
    return _regenerator.default.wrap(function _callee2$(_context2) {
      while (1) switch (_context2.prev = _context2.next) {
        case 0:
          modules = options.modules || {};
          if (modules.draco3d) {
            loadEncoderPromise = loadEncoderPromise || modules.draco3d.createEncoderModule({}).then(function (draco) {
              return {
                draco: draco
              };
            });
          } else {
            loadEncoderPromise = loadEncoderPromise || loadDracoEncoder(options);
          }
          _context2.next = 4;
          return loadEncoderPromise;
        case 4:
          return _context2.abrupt("return", _context2.sent);
        case 5:
        case "end":
          return _context2.stop();
      }
    }, _callee2);
  }));
  return _loadDracoEncoderModule.apply(this, arguments);
}
function loadDracoDecoder(_x3) {
  return _loadDracoDecoder.apply(this, arguments);
}
function _loadDracoDecoder() {
  _loadDracoDecoder = (0, _asyncToGenerator2.default)(_regenerator.default.mark(function _callee3(options) {
    var DracoDecoderModule, wasmBinary, _yield$Promise$all, _yield$Promise$all2;
    return _regenerator.default.wrap(function _callee3$(_context3) {
      while (1) switch (_context3.prev = _context3.next) {
        case 0:
          _context3.t0 = options.draco && options.draco.decoderType;
          _context3.next = _context3.t0 === 'js' ? 3 : _context3.t0 === 'wasm' ? 7 : 7;
          break;
        case 3:
          _context3.next = 5;
          return (0, _workerUtils.loadLibrary)(DRACO_JS_DECODER_URL, 'draco', options);
        case 5:
          DracoDecoderModule = _context3.sent;
          return _context3.abrupt("break", 21);
        case 7:
          _context3.t1 = Promise;
          _context3.next = 10;
          return (0, _workerUtils.loadLibrary)(DRACO_WASM_WRAPPER_URL, 'draco', options);
        case 10:
          _context3.t2 = _context3.sent;
          _context3.next = 13;
          return (0, _workerUtils.loadLibrary)(DRACO_WASM_DECODER_URL, 'draco', options);
        case 13:
          _context3.t3 = _context3.sent;
          _context3.t4 = [_context3.t2, _context3.t3];
          _context3.next = 17;
          return _context3.t1.all.call(_context3.t1, _context3.t4);
        case 17:
          _yield$Promise$all = _context3.sent;
          _yield$Promise$all2 = (0, _slicedToArray2.default)(_yield$Promise$all, 2);
          DracoDecoderModule = _yield$Promise$all2[0];
          wasmBinary = _yield$Promise$all2[1];
        case 21:
          DracoDecoderModule = DracoDecoderModule || globalThis.DracoDecoderModule;
          _context3.next = 24;
          return initializeDracoDecoder(DracoDecoderModule, wasmBinary);
        case 24:
          return _context3.abrupt("return", _context3.sent);
        case 25:
        case "end":
          return _context3.stop();
      }
    }, _callee3);
  }));
  return _loadDracoDecoder.apply(this, arguments);
}
function initializeDracoDecoder(DracoDecoderModule, wasmBinary) {
  var options = {};
  if (wasmBinary) {
    options.wasmBinary = wasmBinary;
  }
  return new Promise(function (resolve) {
    DracoDecoderModule(_objectSpread(_objectSpread({}, options), {}, {
      onModuleLoaded: function onModuleLoaded(draco) {
        return resolve({
          draco: draco
        });
      }
    }));
  });
}
function loadDracoEncoder(_x4) {
  return _loadDracoEncoder.apply(this, arguments);
}
function _loadDracoEncoder() {
  _loadDracoEncoder = (0, _asyncToGenerator2.default)(_regenerator.default.mark(function _callee4(options) {
    var DracoEncoderModule;
    return _regenerator.default.wrap(function _callee4$(_context4) {
      while (1) switch (_context4.prev = _context4.next) {
        case 0:
          _context4.next = 2;
          return (0, _workerUtils.loadLibrary)(DRACO_ENCODER_URL, 'draco', options);
        case 2:
          DracoEncoderModule = _context4.sent;
          DracoEncoderModule = DracoEncoderModule || globalThis.DracoEncoderModule;
          return _context4.abrupt("return", new Promise(function (resolve) {
            DracoEncoderModule({
              onModuleLoaded: function onModuleLoaded(draco) {
                return resolve({
                  draco: draco
                });
              }
            });
          }));
        case 5:
        case "end":
          return _context4.stop();
      }
    }, _callee4);
  }));
  return _loadDracoEncoder.apply(this, arguments);
}
//# sourceMappingURL=draco-module-loader.js.map