"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports._TypecheckGLBLoader = exports.GLTFWriter = void 0;
const version_1 = require("./lib/utils/version");
const encode_gltf_1 = require("./lib/encoders/encode-gltf");
/**
 * GLTF exporter
 */
exports.GLTFWriter = {
    name: 'glTF',
    id: 'gltf',
    module: 'gltf',
    version: version_1.VERSION,
    extensions: ['glb'],
    mimeTypes: ['model/gltf-binary'],
    binary: true,
    encodeSync,
    options: {
        gltf: {}
    }
};
function encodeSync(gltf, options = {}) {
    const { byteOffset = 0 } = options;
    // Calculate length, then create arraybuffer and encode
    const byteLength = (0, encode_gltf_1.encodeGLTFSync)(gltf, null, byteOffset, options);
    const arrayBuffer = new ArrayBuffer(byteLength);
    const dataView = new DataView(arrayBuffer);
    (0, encode_gltf_1.encodeGLTFSync)(gltf, dataView, byteOffset, options);
    return arrayBuffer;
}
// TYPE TESTS - TODO find a better way than exporting junk
exports._TypecheckGLBLoader = exports.GLTFWriter;
