"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.zigZagDeltaDecode = exports.decompressTextureCoordinates = exports.compressTextureCoordinates = exports.octUnpack = exports.octPack = exports.octDecodeFloat = exports.octEncodeFloat = exports.octPackFloat = exports.octDecodeFromVector4 = exports.octDecode = exports.octDecodeInRange = exports.octEncodeToVector4 = exports.octEncode = exports.octEncodeInRange = exports.concatTypedArrays = exports.decodeRGB565 = exports.encodeRGB565 = exports.computeVertexNormals = exports.makePrimitiveIterator = exports.makeAttributeIterator = exports.isGeometry = exports.GLType = exports.GL_TYPE = exports.GL = void 0;
var constants_1 = require("./geometry/constants");
Object.defineProperty(exports, "GL", { enumerable: true, get: function () { return constants_1.GL; } });
// GL support
var constants_2 = require("./geometry/constants");
Object.defineProperty(exports, "GL_TYPE", { enumerable: true, get: function () { return constants_2.GL_TYPE; } });
var gl_type_1 = require("./geometry/gl/gl-type");
Object.defineProperty(exports, "GLType", { enumerable: true, get: function () { return __importDefault(gl_type_1).default; } });
// Geometry
var is_geometry_1 = require("./geometry/is-geometry");
Object.defineProperty(exports, "isGeometry", { enumerable: true, get: function () { return __importDefault(is_geometry_1).default; } });
// Iterators
var attribute_iterator_1 = require("./geometry/iterators/attribute-iterator");
Object.defineProperty(exports, "makeAttributeIterator", { enumerable: true, get: function () { return attribute_iterator_1.makeAttributeIterator; } });
var primitive_iterator_1 = require("./geometry/iterators/primitive-iterator");
Object.defineProperty(exports, "makePrimitiveIterator", { enumerable: true, get: function () { return primitive_iterator_1.makePrimitiveIterator; } });
// Helper methods
var compute_vertex_normals_1 = require("./geometry/attributes/compute-vertex-normals");
Object.defineProperty(exports, "computeVertexNormals", { enumerable: true, get: function () { return compute_vertex_normals_1.computeVertexNormals; } });
var rgb565_1 = require("./geometry/colors/rgb565");
Object.defineProperty(exports, "encodeRGB565", { enumerable: true, get: function () { return rgb565_1.encodeRGB565; } });
Object.defineProperty(exports, "decodeRGB565", { enumerable: true, get: function () { return rgb565_1.decodeRGB565; } });
// Typed array utils
var typed_array_utils_1 = require("./geometry/typed-arrays/typed-array-utils");
Object.defineProperty(exports, "concatTypedArrays", { enumerable: true, get: function () { return typed_array_utils_1.concatTypedArrays; } });
// Compression
var attribute_compression_1 = require("./geometry/compression/attribute-compression");
Object.defineProperty(exports, "octEncodeInRange", { enumerable: true, get: function () { return attribute_compression_1.octEncodeInRange; } });
Object.defineProperty(exports, "octEncode", { enumerable: true, get: function () { return attribute_compression_1.octEncode; } });
Object.defineProperty(exports, "octEncodeToVector4", { enumerable: true, get: function () { return attribute_compression_1.octEncodeToVector4; } });
Object.defineProperty(exports, "octDecodeInRange", { enumerable: true, get: function () { return attribute_compression_1.octDecodeInRange; } });
Object.defineProperty(exports, "octDecode", { enumerable: true, get: function () { return attribute_compression_1.octDecode; } });
Object.defineProperty(exports, "octDecodeFromVector4", { enumerable: true, get: function () { return attribute_compression_1.octDecodeFromVector4; } });
Object.defineProperty(exports, "octPackFloat", { enumerable: true, get: function () { return attribute_compression_1.octPackFloat; } });
Object.defineProperty(exports, "octEncodeFloat", { enumerable: true, get: function () { return attribute_compression_1.octEncodeFloat; } });
Object.defineProperty(exports, "octDecodeFloat", { enumerable: true, get: function () { return attribute_compression_1.octDecodeFloat; } });
Object.defineProperty(exports, "octPack", { enumerable: true, get: function () { return attribute_compression_1.octPack; } });
Object.defineProperty(exports, "octUnpack", { enumerable: true, get: function () { return attribute_compression_1.octUnpack; } });
Object.defineProperty(exports, "compressTextureCoordinates", { enumerable: true, get: function () { return attribute_compression_1.compressTextureCoordinates; } });
Object.defineProperty(exports, "decompressTextureCoordinates", { enumerable: true, get: function () { return attribute_compression_1.decompressTextureCoordinates; } });
Object.defineProperty(exports, "zigZagDeltaDecode", { enumerable: true, get: function () { return attribute_compression_1.zigZagDeltaDecode; } });
