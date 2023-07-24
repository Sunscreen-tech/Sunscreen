"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports._TypecheckGLBLoader = exports.GLTFWriter = void 0;
var _version = require("./lib/utils/version");
var _encodeGltf = require("./lib/encoders/encode-gltf");
var GLTFWriter = {
  name: 'glTF',
  id: 'gltf',
  module: 'gltf',
  version: _version.VERSION,
  extensions: ['glb'],
  mimeTypes: ['model/gltf-binary'],
  binary: true,
  encodeSync: encodeSync,
  options: {
    gltf: {}
  }
};
exports.GLTFWriter = GLTFWriter;
function encodeSync(gltf) {
  var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
  var _options$byteOffset = options.byteOffset,
    byteOffset = _options$byteOffset === void 0 ? 0 : _options$byteOffset;
  var byteLength = (0, _encodeGltf.encodeGLTFSync)(gltf, null, byteOffset, options);
  var arrayBuffer = new ArrayBuffer(byteLength);
  var dataView = new DataView(arrayBuffer);
  (0, _encodeGltf.encodeGLTFSync)(gltf, dataView, byteOffset, options);
  return arrayBuffer;
}
var _TypecheckGLBLoader = GLTFWriter;
exports._TypecheckGLBLoader = _TypecheckGLBLoader;
//# sourceMappingURL=gltf-writer.js.map