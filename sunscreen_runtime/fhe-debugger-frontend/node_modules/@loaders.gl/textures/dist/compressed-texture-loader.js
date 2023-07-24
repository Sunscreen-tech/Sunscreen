"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports._TypecheckCompressedTextureLoader = exports._TypecheckCompressedTextureWorkerLoader = exports.CompressedTextureLoader = exports.CompressedTextureWorkerLoader = void 0;
const version_1 = require("./lib/utils/version");
const parse_compressed_texture_1 = require("./lib/parsers/parse-compressed-texture");
const parse_basis_1 = __importDefault(require("./lib/parsers/parse-basis"));
const DEFAULT_TEXTURE_LOADER_OPTIONS = {
    'compressed-texture': {
        libraryPath: 'libs/',
        useBasis: false
    }
};
/**
 * Worker Loader for KTX, DDS, and PVR texture container formats
 */
exports.CompressedTextureWorkerLoader = {
    name: 'Texture Containers',
    id: 'compressed-texture',
    module: 'textures',
    version: version_1.VERSION,
    worker: true,
    extensions: [
        'ktx',
        'ktx2',
        'dds',
        'pvr' // WEBGL_compressed_texture_pvrtc
    ],
    mimeTypes: [
        'image/ktx2',
        'image/ktx',
        'image/vnd-ms.dds',
        'image/x-dds',
        'application/octet-stream'
    ],
    binary: true,
    options: DEFAULT_TEXTURE_LOADER_OPTIONS
};
/**
 * Loader for KTX, DDS, and PVR texture container formats
 */
exports.CompressedTextureLoader = {
    ...exports.CompressedTextureWorkerLoader,
    parse: async (arrayBuffer, options) => {
        if (options['compressed-texture'].useBasis) {
            options.basis = {
                format: {
                    alpha: 'BC3',
                    noAlpha: 'BC1'
                },
                ...options.basis,
                containerFormat: 'ktx2',
                module: 'encoder'
            };
            return (await (0, parse_basis_1.default)(arrayBuffer, options))[0];
        }
        return (0, parse_compressed_texture_1.parseCompressedTexture)(arrayBuffer);
    }
};
// TYPE TESTS - TODO find a better way than exporting junk
exports._TypecheckCompressedTextureWorkerLoader = exports.CompressedTextureWorkerLoader;
exports._TypecheckCompressedTextureLoader = exports.CompressedTextureLoader;
