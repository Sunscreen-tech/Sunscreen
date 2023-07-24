"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
Object.defineProperty(exports, "ImageLoader", {
  enumerable: true,
  get: function get() {
    return _imageLoader.ImageLoader;
  }
});
Object.defineProperty(exports, "ImageWriter", {
  enumerable: true,
  get: function get() {
    return _imageWriter.ImageWriter;
  }
});
Object.defineProperty(exports, "getBinaryImageMetadata", {
  enumerable: true,
  get: function get() {
    return _binaryImageApi.getBinaryImageMetadata;
  }
});
Object.defineProperty(exports, "getDefaultImageType", {
  enumerable: true,
  get: function get() {
    return _imageType.getDefaultImageType;
  }
});
Object.defineProperty(exports, "getImageData", {
  enumerable: true,
  get: function get() {
    return _parsedImageApi.getImageData;
  }
});
Object.defineProperty(exports, "getImageSize", {
  enumerable: true,
  get: function get() {
    return _parsedImageApi.getImageSize;
  }
});
Object.defineProperty(exports, "getImageType", {
  enumerable: true,
  get: function get() {
    return _parsedImageApi.getImageType;
  }
});
Object.defineProperty(exports, "getSupportedImageFormats", {
  enumerable: true,
  get: function get() {
    return _imageFormat.getSupportedImageFormats;
  }
});
Object.defineProperty(exports, "isImage", {
  enumerable: true,
  get: function get() {
    return _parsedImageApi.isImage;
  }
});
Object.defineProperty(exports, "isImageFormatSupported", {
  enumerable: true,
  get: function get() {
    return _imageFormat.isImageFormatSupported;
  }
});
Object.defineProperty(exports, "isImageTypeSupported", {
  enumerable: true,
  get: function get() {
    return _imageType.isImageTypeSupported;
  }
});
Object.defineProperty(exports, "loadImage", {
  enumerable: true,
  get: function get() {
    return _loadImage.loadImage;
  }
});
var _imageLoader = require("./image-loader");
var _imageWriter = require("./image-writer");
var _binaryImageApi = require("./lib/category-api/binary-image-api");
var _imageType = require("./lib/category-api/image-type");
var _parsedImageApi = require("./lib/category-api/parsed-image-api");
var _imageFormat = require("./lib/category-api/image-format");
var _loadImage = require("./lib/texture-api/load-image");
//# sourceMappingURL=index.js.map