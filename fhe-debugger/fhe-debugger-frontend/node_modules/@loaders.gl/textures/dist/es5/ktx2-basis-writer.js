"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports._TypecheckKTX2TextureWriter = exports.KTX2BasisWriter = void 0;
var _version = require("./lib/utils/version");
var _encodeKtx2BasisTexture = require("./lib/encoders/encode-ktx2-basis-texture");
var KTX2BasisWriter = {
  name: 'Basis Universal Supercompressed GPU Texture',
  id: 'ktx2-basis-writer',
  module: 'textures',
  version: _version.VERSION,
  extensions: ['ktx2'],
  options: {
    useSRGB: false,
    qualityLevel: 10,
    encodeUASTC: false,
    mipmaps: false
  },
  encode: _encodeKtx2BasisTexture.encodeKTX2BasisTexture
};
exports.KTX2BasisWriter = KTX2BasisWriter;
var _TypecheckKTX2TextureWriter = KTX2BasisWriter;
exports._TypecheckKTX2TextureWriter = _TypecheckKTX2TextureWriter;
//# sourceMappingURL=ktx2-basis-writer.js.map