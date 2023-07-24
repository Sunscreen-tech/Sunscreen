"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports._unregisterLoaders = _unregisterLoaders;
exports.getRegisteredLoaders = getRegisteredLoaders;
exports.registerLoaders = registerLoaders;
var _normalizeLoader = require("../loader-utils/normalize-loader");
var _optionUtils = require("../loader-utils/option-utils");
function _createForOfIteratorHelper(o, allowArrayLike) { var it = typeof Symbol !== "undefined" && o[Symbol.iterator] || o["@@iterator"]; if (!it) { if (Array.isArray(o) || (it = _unsupportedIterableToArray(o)) || allowArrayLike && o && typeof o.length === "number") { if (it) o = it; var i = 0; var F = function F() {}; return { s: F, n: function n() { if (i >= o.length) return { done: true }; return { done: false, value: o[i++] }; }, e: function e(_e) { throw _e; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var normalCompletion = true, didErr = false, err; return { s: function s() { it = it.call(o); }, n: function n() { var step = it.next(); normalCompletion = step.done; return step; }, e: function e(_e2) { didErr = true; err = _e2; }, f: function f() { try { if (!normalCompletion && it.return != null) it.return(); } finally { if (didErr) throw err; } } }; }
function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }
function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) arr2[i] = arr[i]; return arr2; }
var getGlobalLoaderRegistry = function getGlobalLoaderRegistry() {
  var state = (0, _optionUtils.getGlobalLoaderState)();
  state.loaderRegistry = state.loaderRegistry || [];
  return state.loaderRegistry;
};
function registerLoaders(loaders) {
  var loaderRegistry = getGlobalLoaderRegistry();
  loaders = Array.isArray(loaders) ? loaders : [loaders];
  var _iterator = _createForOfIteratorHelper(loaders),
    _step;
  try {
    var _loop = function _loop() {
      var loader = _step.value;
      var normalizedLoader = (0, _normalizeLoader.normalizeLoader)(loader);
      if (!loaderRegistry.find(function (registeredLoader) {
        return normalizedLoader === registeredLoader;
      })) {
        loaderRegistry.unshift(normalizedLoader);
      }
    };
    for (_iterator.s(); !(_step = _iterator.n()).done;) {
      _loop();
    }
  } catch (err) {
    _iterator.e(err);
  } finally {
    _iterator.f();
  }
}
function getRegisteredLoaders() {
  return getGlobalLoaderRegistry();
}
function _unregisterLoaders() {
  var state = (0, _optionUtils.getGlobalLoaderState)();
  state.loaderRegistry = [];
}
//# sourceMappingURL=register-loaders.js.map