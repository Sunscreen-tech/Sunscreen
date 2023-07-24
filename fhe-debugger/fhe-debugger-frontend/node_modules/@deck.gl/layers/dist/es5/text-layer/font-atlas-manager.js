"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.setFontAtlasCacheLimit = setFontAtlasCacheLimit;
exports.default = exports.DEFAULT_FONT_SETTINGS = void 0;

var _classCallCheck2 = _interopRequireDefault(require("@babel/runtime/helpers/classCallCheck"));

var _createClass2 = _interopRequireDefault(require("@babel/runtime/helpers/createClass"));

var _defineProperty2 = _interopRequireDefault(require("@babel/runtime/helpers/defineProperty"));

var _tinySdf = _interopRequireDefault(require("@mapbox/tiny-sdf"));

var _core = require("@deck.gl/core");

var _utils = require("./utils");

var _lruCache = _interopRequireDefault(require("./lru-cache"));

function _createForOfIteratorHelper(o, allowArrayLike) { var it = typeof Symbol !== "undefined" && o[Symbol.iterator] || o["@@iterator"]; if (!it) { if (Array.isArray(o) || (it = _unsupportedIterableToArray(o)) || allowArrayLike && o && typeof o.length === "number") { if (it) o = it; var i = 0; var F = function F() {}; return { s: F, n: function n() { if (i >= o.length) return { done: true }; return { done: false, value: o[i++] }; }, e: function e(_e) { throw _e; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var normalCompletion = true, didErr = false, err; return { s: function s() { it = it.call(o); }, n: function n() { var step = it.next(); normalCompletion = step.done; return step; }, e: function e(_e2) { didErr = true; err = _e2; }, f: function f() { try { if (!normalCompletion && it.return != null) it.return(); } finally { if (didErr) throw err; } } }; }

function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }

function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }

function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) { symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); } keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { ownKeys(Object(source), true).forEach(function (key) { (0, _defineProperty2.default)(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }

function getDefaultCharacterSet() {
  var charSet = [];

  for (var i = 32; i < 128; i++) {
    charSet.push(String.fromCharCode(i));
  }

  return charSet;
}

var DEFAULT_FONT_SETTINGS = {
  fontFamily: 'Monaco, monospace',
  fontWeight: 'normal',
  characterSet: getDefaultCharacterSet(),
  fontSize: 64,
  buffer: 4,
  sdf: false,
  cutoff: 0.25,
  radius: 12,
  smoothing: 0.1
};
exports.DEFAULT_FONT_SETTINGS = DEFAULT_FONT_SETTINGS;
var MAX_CANVAS_WIDTH = 1024;
var BASELINE_SCALE = 0.9;
var HEIGHT_SCALE = 1.2;
var CACHE_LIMIT = 3;
var cache = new _lruCache.default(CACHE_LIMIT);

function getNewChars(cacheKey, characterSet) {
  var newCharSet;

  if (typeof characterSet === 'string') {
    newCharSet = new Set(Array.from(characterSet));
  } else {
    newCharSet = new Set(characterSet);
  }

  var cachedFontAtlas = cache.get(cacheKey);

  if (!cachedFontAtlas) {
    return newCharSet;
  }

  for (var char in cachedFontAtlas.mapping) {
    if (newCharSet.has(char)) {
      newCharSet.delete(char);
    }
  }

  return newCharSet;
}

function populateAlphaChannel(alphaChannel, imageData) {
  for (var i = 0; i < alphaChannel.length; i++) {
    imageData.data[4 * i + 3] = alphaChannel[i];
  }
}

function setTextStyle(ctx, fontFamily, fontSize, fontWeight) {
  ctx.font = "".concat(fontWeight, " ").concat(fontSize, "px ").concat(fontFamily);
  ctx.fillStyle = '#000';
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
}

function setFontAtlasCacheLimit(limit) {
  _core.log.assert(Number.isFinite(limit) && limit >= CACHE_LIMIT, 'Invalid cache limit');

  cache = new _lruCache.default(limit);
}

var FontAtlasManager = function () {
  function FontAtlasManager() {
    (0, _classCallCheck2.default)(this, FontAtlasManager);
    (0, _defineProperty2.default)(this, "props", _objectSpread({}, DEFAULT_FONT_SETTINGS));
    (0, _defineProperty2.default)(this, "_key", void 0);
    (0, _defineProperty2.default)(this, "_atlas", void 0);
  }

  (0, _createClass2.default)(FontAtlasManager, [{
    key: "texture",
    get: function get() {
      return this._atlas;
    }
  }, {
    key: "mapping",
    get: function get() {
      return this._atlas && this._atlas.mapping;
    }
  }, {
    key: "scale",
    get: function get() {
      var _this$props = this.props,
          fontSize = _this$props.fontSize,
          buffer = _this$props.buffer;
      return (fontSize * HEIGHT_SCALE + buffer * 2) / fontSize;
    }
  }, {
    key: "setProps",
    value: function setProps() {
      var props = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
      Object.assign(this.props, props);
      this._key = this._getKey();
      var charSet = getNewChars(this._key, this.props.characterSet);
      var cachedFontAtlas = cache.get(this._key);

      if (cachedFontAtlas && charSet.size === 0) {
        if (this._atlas !== cachedFontAtlas) {
          this._atlas = cachedFontAtlas;
        }

        return;
      }

      var fontAtlas = this._generateFontAtlas(charSet, cachedFontAtlas);

      this._atlas = fontAtlas;
      cache.set(this._key, fontAtlas);
    }
  }, {
    key: "_generateFontAtlas",
    value: function _generateFontAtlas(characterSet, cachedFontAtlas) {
      var _this$props2 = this.props,
          fontFamily = _this$props2.fontFamily,
          fontWeight = _this$props2.fontWeight,
          fontSize = _this$props2.fontSize,
          buffer = _this$props2.buffer,
          sdf = _this$props2.sdf,
          radius = _this$props2.radius,
          cutoff = _this$props2.cutoff;
      var canvas = cachedFontAtlas && cachedFontAtlas.data;

      if (!canvas) {
        canvas = document.createElement('canvas');
        canvas.width = MAX_CANVAS_WIDTH;
      }

      var ctx = canvas.getContext('2d', {
        willReadFrequently: true
      });
      setTextStyle(ctx, fontFamily, fontSize, fontWeight);

      var _buildMapping = (0, _utils.buildMapping)(_objectSpread({
        getFontWidth: function getFontWidth(char) {
          return ctx.measureText(char).width;
        },
        fontHeight: fontSize * HEIGHT_SCALE,
        buffer: buffer,
        characterSet: characterSet,
        maxCanvasWidth: MAX_CANVAS_WIDTH
      }, cachedFontAtlas && {
        mapping: cachedFontAtlas.mapping,
        xOffset: cachedFontAtlas.xOffset,
        yOffset: cachedFontAtlas.yOffset
      })),
          mapping = _buildMapping.mapping,
          canvasHeight = _buildMapping.canvasHeight,
          xOffset = _buildMapping.xOffset,
          yOffset = _buildMapping.yOffset;

      if (canvas.height !== canvasHeight) {
        var imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        canvas.height = canvasHeight;
        ctx.putImageData(imageData, 0, 0);
      }

      setTextStyle(ctx, fontFamily, fontSize, fontWeight);

      if (sdf) {
        var tinySDF = new _tinySdf.default({
          fontSize: fontSize,
          buffer: buffer,
          radius: radius,
          cutoff: cutoff,
          fontFamily: fontFamily,
          fontWeight: "".concat(fontWeight)
        });

        var _iterator = _createForOfIteratorHelper(characterSet),
            _step;

        try {
          for (_iterator.s(); !(_step = _iterator.n()).done;) {
            var char = _step.value;

            var _tinySDF$draw = tinySDF.draw(char),
                data = _tinySDF$draw.data,
                width = _tinySDF$draw.width,
                height = _tinySDF$draw.height,
                glyphTop = _tinySDF$draw.glyphTop;

            mapping[char].width = width;
            mapping[char].layoutOffsetY = fontSize * BASELINE_SCALE - glyphTop;

            var _imageData = ctx.createImageData(width, height);

            populateAlphaChannel(data, _imageData);
            ctx.putImageData(_imageData, mapping[char].x, mapping[char].y);
          }
        } catch (err) {
          _iterator.e(err);
        } finally {
          _iterator.f();
        }
      } else {
        var _iterator2 = _createForOfIteratorHelper(characterSet),
            _step2;

        try {
          for (_iterator2.s(); !(_step2 = _iterator2.n()).done;) {
            var _char = _step2.value;
            ctx.fillText(_char, mapping[_char].x, mapping[_char].y + buffer + fontSize * BASELINE_SCALE);
          }
        } catch (err) {
          _iterator2.e(err);
        } finally {
          _iterator2.f();
        }
      }

      return {
        xOffset: xOffset,
        yOffset: yOffset,
        mapping: mapping,
        data: canvas,
        width: canvas.width,
        height: canvas.height
      };
    }
  }, {
    key: "_getKey",
    value: function _getKey() {
      var _this$props3 = this.props,
          fontFamily = _this$props3.fontFamily,
          fontWeight = _this$props3.fontWeight,
          fontSize = _this$props3.fontSize,
          buffer = _this$props3.buffer,
          sdf = _this$props3.sdf,
          radius = _this$props3.radius,
          cutoff = _this$props3.cutoff;

      if (sdf) {
        return "".concat(fontFamily, " ").concat(fontWeight, " ").concat(fontSize, " ").concat(buffer, " ").concat(radius, " ").concat(cutoff);
      }

      return "".concat(fontFamily, " ").concat(fontWeight, " ").concat(fontSize, " ").concat(buffer);
    }
  }]);
  return FontAtlasManager;
}();

exports.default = FontAtlasManager;
//# sourceMappingURL=font-atlas-manager.js.map