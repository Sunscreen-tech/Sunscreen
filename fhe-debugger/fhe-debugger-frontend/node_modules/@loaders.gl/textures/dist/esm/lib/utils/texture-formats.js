const BROWSER_PREFIXES = ['', 'WEBKIT_', 'MOZ_'];
const WEBGL_EXTENSIONS = {
  WEBGL_compressed_texture_s3tc: 'dxt',
  WEBGL_compressed_texture_s3tc_srgb: 'dxt-srgb',
  WEBGL_compressed_texture_etc1: 'etc1',
  WEBGL_compressed_texture_etc: 'etc2',
  WEBGL_compressed_texture_pvrtc: 'pvrtc',
  WEBGL_compressed_texture_atc: 'atc',
  WEBGL_compressed_texture_astc: 'astc',
  EXT_texture_compression_rgtc: 'rgtc'
};
let formats = null;
export function getSupportedGPUTextureFormats(gl) {
  if (!formats) {
    gl = gl || getWebGLContext() || undefined;
    formats = new Set();
    for (const prefix of BROWSER_PREFIXES) {
      for (const extension in WEBGL_EXTENSIONS) {
        if (gl && gl.getExtension("".concat(prefix).concat(extension))) {
          const gpuTextureFormat = WEBGL_EXTENSIONS[extension];
          formats.add(gpuTextureFormat);
        }
      }
    }
  }
  return formats;
}
function getWebGLContext() {
  try {
    const canvas = document.createElement('canvas');
    return canvas.getContext('webgl');
  } catch (error) {
    return null;
  }
}
//# sourceMappingURL=texture-formats.js.map