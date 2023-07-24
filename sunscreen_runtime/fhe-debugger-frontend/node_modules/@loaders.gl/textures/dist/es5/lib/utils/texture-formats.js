"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getSupportedGPUTextureFormats = getSupportedGPUTextureFormats;
function _createForOfIteratorHelper(o, allowArrayLike) { var it = typeof Symbol !== "undefined" && o[Symbol.iterator] || o["@@iterator"]; if (!it) { if (Array.isArray(o) || (it = _unsupportedIterableToArray(o)) || allowArrayLike && o && typeof o.length === "number") { if (it) o = it; var i = 0; var F = function F() {}; return { s: F, n: function n() { if (i >= o.length) return { done: true }; return { done: false, value: o[i++] }; }, e: function e(_e) { throw _e; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var normalCompletion = true, didErr = false, err; return { s: function s() { it = it.call(o); }, n: function n() { var step = it.next(); normalCompletion = step.done; return step; }, e: function e(_e2) { didErr = true; err = _e2; }, f: function f() { try { if (!normalCompletion && it.return != null) it.return(); } finally { if (didErr) throw err; } } }; }
function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }
function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) arr2[i] = arr[i]; return arr2; }
var BROWSER_PREFIXES = ['', 'WEBKIT_', 'MOZ_'];
var WEBGL_EXTENSIONS = {
  WEBGL_compressed_texture_s3tc: 'dxt',
  WEBGL_compressed_texture_s3tc_srgb: 'dxt-srgb',
  WEBGL_compressed_texture_etc1: 'etc1',
  WEBGL_compressed_texture_etc: 'etc2',
  WEBGL_compressed_texture_pvrtc: 'pvrtc',
  WEBGL_compressed_texture_atc: 'atc',
  WEBGL_compressed_texture_astc: 'astc',
  EXT_texture_compression_rgtc: 'rgtc'
};
var formats = null;
function getSupportedGPUTextureFormats(gl) {
  if (!formats) {
    gl = gl || getWebGLContext() || undefined;
    formats = new Set();
    var _iterator = _createForOfIteratorHelper(BROWSER_PREFIXES),
      _step;
    try {
      for (_iterator.s(); !(_step = _iterator.n()).done;) {
        var prefix = _step.value;
        for (var extension in WEBGL_EXTENSIONS) {
          if (gl && gl.getExtension("".concat(prefix).concat(extension))) {
            var gpuTextureFormat = WEBGL_EXTENSIONS[extension];
            formats.add(gpuTextureFormat);
          }
        }
      }
    } catch (err) {
      _iterator.e(err);
    } finally {
      _iterator.f();
    }
  }
  return formats;
}
function getWebGLContext() {
  try {
    var canvas = document.createElement('canvas');
    return canvas.getContext('webgl');
  } catch (error) {
    return null;
  }
}
//# sourceMappingURL=texture-formats.js.map