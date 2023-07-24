"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.ImageWriter = void 0;
var _version = require("./lib/utils/version");
var _encodeImage = require("./lib/encoders/encode-image");
var ImageWriter = {
  name: 'Images',
  id: 'image',
  module: 'images',
  version: _version.VERSION,
  extensions: ['jpeg'],
  options: {
    image: {
      mimeType: 'image/png',
      jpegQuality: null
    }
  },
  encode: _encodeImage.encodeImage
};
exports.ImageWriter = ImageWriter;
//# sourceMappingURL=image-writer.js.map