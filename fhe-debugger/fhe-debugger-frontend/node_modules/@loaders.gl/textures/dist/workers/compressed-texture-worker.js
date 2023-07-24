"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const loader_utils_1 = require("@loaders.gl/loader-utils");
const compressed_texture_loader_1 = require("../compressed-texture-loader");
(0, loader_utils_1.createLoaderWorker)(compressed_texture_loader_1.CompressedTextureLoader);
