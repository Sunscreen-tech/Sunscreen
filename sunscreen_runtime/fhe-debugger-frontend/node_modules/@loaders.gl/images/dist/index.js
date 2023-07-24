"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadImage = exports.isImageFormatSupported = exports.getSupportedImageFormats = exports.getImageData = exports.getImageSize = exports.getImageType = exports.isImage = exports.getDefaultImageType = exports.isImageTypeSupported = exports.getBinaryImageMetadata = exports.ImageWriter = exports.ImageLoader = void 0;
// LOADERS AND WRITERS
var image_loader_1 = require("./image-loader");
Object.defineProperty(exports, "ImageLoader", { enumerable: true, get: function () { return image_loader_1.ImageLoader; } });
var image_writer_1 = require("./image-writer");
Object.defineProperty(exports, "ImageWriter", { enumerable: true, get: function () { return image_writer_1.ImageWriter; } });
// IMAGE CATEGORY API
// Binary Image API
var binary_image_api_1 = require("./lib/category-api/binary-image-api");
Object.defineProperty(exports, "getBinaryImageMetadata", { enumerable: true, get: function () { return binary_image_api_1.getBinaryImageMetadata; } });
// Parsed Image API
var image_type_1 = require("./lib/category-api/image-type");
Object.defineProperty(exports, "isImageTypeSupported", { enumerable: true, get: function () { return image_type_1.isImageTypeSupported; } });
Object.defineProperty(exports, "getDefaultImageType", { enumerable: true, get: function () { return image_type_1.getDefaultImageType; } });
var parsed_image_api_1 = require("./lib/category-api/parsed-image-api");
Object.defineProperty(exports, "isImage", { enumerable: true, get: function () { return parsed_image_api_1.isImage; } });
Object.defineProperty(exports, "getImageType", { enumerable: true, get: function () { return parsed_image_api_1.getImageType; } });
Object.defineProperty(exports, "getImageSize", { enumerable: true, get: function () { return parsed_image_api_1.getImageSize; } });
Object.defineProperty(exports, "getImageData", { enumerable: true, get: function () { return parsed_image_api_1.getImageData; } });
// EXPERIMENTAL
var image_format_1 = require("./lib/category-api/image-format");
Object.defineProperty(exports, "getSupportedImageFormats", { enumerable: true, get: function () { return image_format_1.getSupportedImageFormats; } });
var image_format_2 = require("./lib/category-api/image-format");
Object.defineProperty(exports, "isImageFormatSupported", { enumerable: true, get: function () { return image_format_2.isImageFormatSupported; } });
// DEPRECATED - Remove in V4 (fix dependency in luma.gl)
var load_image_1 = require("./lib/texture-api/load-image");
Object.defineProperty(exports, "loadImage", { enumerable: true, get: function () { return load_image_1.loadImage; } });
