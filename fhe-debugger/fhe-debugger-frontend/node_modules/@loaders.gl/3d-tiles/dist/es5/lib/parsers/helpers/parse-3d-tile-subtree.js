"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = parse3DTilesSubtree;
var _regenerator = _interopRequireDefault(require("@babel/runtime/regenerator"));
var _asyncToGenerator2 = _interopRequireDefault(require("@babel/runtime/helpers/asyncToGenerator"));
var SUBTREE_FILE_MAGIC = 0x74627573;
var SUBTREE_FILE_VERSION = 1;
function parse3DTilesSubtree(_x, _x2, _x3) {
  return _parse3DTilesSubtree.apply(this, arguments);
}
function _parse3DTilesSubtree() {
  _parse3DTilesSubtree = (0, _asyncToGenerator2.default)(_regenerator.default.mark(function _callee(data, options, context) {
    var magic, version, jsonByteLength, stringAttribute, textDecoder, string, subtree, binaryByteLength, internalBinaryBuffer;
    return _regenerator.default.wrap(function _callee$(_context) {
      while (1) switch (_context.prev = _context.next) {
        case 0:
          magic = new Uint32Array(data.slice(0, 4));
          if (!(magic[0] !== SUBTREE_FILE_MAGIC)) {
            _context.next = 3;
            break;
          }
          throw new Error('Wrong subtree file magic number');
        case 3:
          version = new Uint32Array(data.slice(4, 8));
          if (!(version[0] !== SUBTREE_FILE_VERSION)) {
            _context.next = 6;
            break;
          }
          throw new Error('Wrong subtree file verson, must be 1');
        case 6:
          jsonByteLength = parseUint64Value(data.slice(8, 16));
          stringAttribute = new Uint8Array(data, 24, jsonByteLength);
          textDecoder = new TextDecoder('utf8');
          string = textDecoder.decode(stringAttribute);
          subtree = JSON.parse(string);
          binaryByteLength = parseUint64Value(data.slice(16, 24));
          internalBinaryBuffer = new ArrayBuffer(0);
          if (binaryByteLength) {
            internalBinaryBuffer = data.slice(24 + jsonByteLength);
          }
          if (!('bufferView' in subtree.tileAvailability)) {
            _context.next = 18;
            break;
          }
          _context.next = 17;
          return getExplicitBitstream(subtree, 'tileAvailability', internalBinaryBuffer, context);
        case 17:
          subtree.tileAvailability.explicitBitstream = _context.sent;
        case 18:
          if (!('bufferView' in subtree.contentAvailability)) {
            _context.next = 22;
            break;
          }
          _context.next = 21;
          return getExplicitBitstream(subtree, 'contentAvailability', internalBinaryBuffer, context);
        case 21:
          subtree.contentAvailability.explicitBitstream = _context.sent;
        case 22:
          if (!('bufferView' in subtree.childSubtreeAvailability)) {
            _context.next = 26;
            break;
          }
          _context.next = 25;
          return getExplicitBitstream(subtree, 'childSubtreeAvailability', internalBinaryBuffer, context);
        case 25:
          subtree.childSubtreeAvailability.explicitBitstream = _context.sent;
        case 26:
          return _context.abrupt("return", subtree);
        case 27:
        case "end":
          return _context.stop();
      }
    }, _callee);
  }));
  return _parse3DTilesSubtree.apply(this, arguments);
}
function resolveBufferUri(bitstreamRelativeUri, basePath) {
  var hasProtocol = basePath.startsWith('http');
  if (hasProtocol) {
    var _resolvedUri = new URL(bitstreamRelativeUri, basePath);
    return decodeURI(_resolvedUri.toString());
  }
  var basePathWithProtocol = "http://".concat(basePath);
  var resolvedUri = new URL(bitstreamRelativeUri, basePathWithProtocol);
  return "/".concat(resolvedUri.host).concat(resolvedUri.pathname);
}
function getExplicitBitstream(_x4, _x5, _x6, _x7) {
  return _getExplicitBitstream.apply(this, arguments);
}
function _getExplicitBitstream() {
  _getExplicitBitstream = (0, _asyncToGenerator2.default)(_regenerator.default.mark(function _callee2(subtree, name, internalBinaryBuffer, context) {
    var bufferViewIndex, bufferView, buffer, bufferUri, response, data;
    return _regenerator.default.wrap(function _callee2$(_context2) {
      while (1) switch (_context2.prev = _context2.next) {
        case 0:
          bufferViewIndex = subtree[name].bufferView;
          bufferView = subtree.bufferViews[bufferViewIndex];
          buffer = subtree.buffers[bufferView.buffer];
          if (!(!(context !== null && context !== void 0 && context.url) || !context.fetch)) {
            _context2.next = 5;
            break;
          }
          throw new Error('Url is not provided');
        case 5:
          if (context.fetch) {
            _context2.next = 7;
            break;
          }
          throw new Error('fetch is not provided');
        case 7:
          if (!buffer.uri) {
            _context2.next = 16;
            break;
          }
          bufferUri = resolveBufferUri(buffer.uri, context === null || context === void 0 ? void 0 : context.url);
          _context2.next = 11;
          return context.fetch(bufferUri);
        case 11:
          response = _context2.sent;
          _context2.next = 14;
          return response.arrayBuffer();
        case 14:
          data = _context2.sent;
          return _context2.abrupt("return", new Uint8Array(data, bufferView.byteOffset, bufferView.byteLength));
        case 16:
          return _context2.abrupt("return", new Uint8Array(internalBinaryBuffer, bufferView.byteOffset, bufferView.byteLength));
        case 17:
        case "end":
          return _context2.stop();
      }
    }, _callee2);
  }));
  return _getExplicitBitstream.apply(this, arguments);
}
function parseUint64Value(buffer) {
  var dataView = new DataView(buffer);
  var left = dataView.getUint32(0, true);
  var right = dataView.getUint32(4, true);
  return left + Math.pow(2, 32) * right;
}
//# sourceMappingURL=parse-3d-tile-subtree.js.map