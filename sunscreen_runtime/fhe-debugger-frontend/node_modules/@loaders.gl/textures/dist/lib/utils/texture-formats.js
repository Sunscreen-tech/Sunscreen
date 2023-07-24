"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSupportedGPUTextureFormats = void 0;
const BROWSER_PREFIXES = ['', 'WEBKIT_', 'MOZ_'];
const WEBGL_EXTENSIONS = {
    /* eslint-disable camelcase */
    WEBGL_compressed_texture_s3tc: 'dxt',
    WEBGL_compressed_texture_s3tc_srgb: 'dxt-srgb',
    WEBGL_compressed_texture_etc1: 'etc1',
    WEBGL_compressed_texture_etc: 'etc2',
    WEBGL_compressed_texture_pvrtc: 'pvrtc',
    WEBGL_compressed_texture_atc: 'atc',
    WEBGL_compressed_texture_astc: 'astc',
    EXT_texture_compression_rgtc: 'rgtc'
    /* eslint-enable camelcase */
};
let formats = null;
/**
 * Returns a list of formats.
 * Creates a temporary WebGLRenderingContext if none is provided.
 *
 * @param gl - Optional context.
 */
function getSupportedGPUTextureFormats(gl) {
    if (!formats) {
        gl = gl || getWebGLContext() || undefined;
        formats = new Set();
        for (const prefix of BROWSER_PREFIXES) {
            for (const extension in WEBGL_EXTENSIONS) {
                if (gl && gl.getExtension(`${prefix}${extension}`)) {
                    const gpuTextureFormat = WEBGL_EXTENSIONS[extension];
                    formats.add(gpuTextureFormat);
                }
            }
        }
    }
    return formats;
}
exports.getSupportedGPUTextureFormats = getSupportedGPUTextureFormats;
/**
 * @returns {WebGLRenderingContext?}
 */
function getWebGLContext() {
    try {
        const canvas = document.createElement('canvas');
        return canvas.getContext('webgl');
    }
    catch (error) {
        return null;
    }
}
