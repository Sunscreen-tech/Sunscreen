"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.buildMapping = buildMapping;
exports.getDiffIcons = getDiffIcons;
exports.default = void 0;

var _classCallCheck2 = _interopRequireDefault(require("@babel/runtime/helpers/classCallCheck"));

var _createClass2 = _interopRequireDefault(require("@babel/runtime/helpers/createClass"));

var _defineProperty2 = _interopRequireDefault(require("@babel/runtime/helpers/defineProperty"));

var _core = require("@luma.gl/core");

var _core2 = require("@loaders.gl/core");

var _core3 = require("@deck.gl/core");

var _DEFAULT_TEXTURE_PARA;

function _createForOfIteratorHelper(o, allowArrayLike) { var it = typeof Symbol !== "undefined" && o[Symbol.iterator] || o["@@iterator"]; if (!it) { if (Array.isArray(o) || (it = _unsupportedIterableToArray(o)) || allowArrayLike && o && typeof o.length === "number") { if (it) o = it; var i = 0; var F = function F() {}; return { s: F, n: function n() { if (i >= o.length) return { done: true }; return { done: false, value: o[i++] }; }, e: function e(_e) { throw _e; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var normalCompletion = true, didErr = false, err; return { s: function s() { it = it.call(o); }, n: function n() { var step = it.next(); normalCompletion = step.done; return step; }, e: function e(_e2) { didErr = true; err = _e2; }, f: function f() { try { if (!normalCompletion && it.return != null) it.return(); } finally { if (didErr) throw err; } } }; }

function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }

function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }

function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) { symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); } keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { ownKeys(Object(source), true).forEach(function (key) { (0, _defineProperty2.default)(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }

var DEFAULT_CANVAS_WIDTH = 1024;
var DEFAULT_BUFFER = 4;

var noop = function noop() {};

var DEFAULT_TEXTURE_PARAMETERS = (_DEFAULT_TEXTURE_PARA = {}, (0, _defineProperty2.default)(_DEFAULT_TEXTURE_PARA, 10241, 9987), (0, _defineProperty2.default)(_DEFAULT_TEXTURE_PARA, 10240, 9729), (0, _defineProperty2.default)(_DEFAULT_TEXTURE_PARA, 10242, 33071), (0, _defineProperty2.default)(_DEFAULT_TEXTURE_PARA, 10243, 33071), _DEFAULT_TEXTURE_PARA);

function nextPowOfTwo(number) {
  return Math.pow(2, Math.ceil(Math.log2(number)));
}

function resizeImage(ctx, imageData, maxWidth, maxHeight) {
  var resizeRatio = Math.min(maxWidth / imageData.width, maxHeight / imageData.height);
  var width = Math.floor(imageData.width * resizeRatio);
  var height = Math.floor(imageData.height * resizeRatio);

  if (resizeRatio === 1) {
    return {
      data: imageData,
      width: width,
      height: height
    };
  }

  ctx.canvas.height = height;
  ctx.canvas.width = width;
  ctx.clearRect(0, 0, width, height);
  ctx.drawImage(imageData, 0, 0, imageData.width, imageData.height, 0, 0, width, height);
  return {
    data: ctx.canvas,
    width: width,
    height: height
  };
}

function getIconId(icon) {
  return icon && (icon.id || icon.url);
}

function resizeTexture(texture, width, height, parameters) {
  var oldWidth = texture.width;
  var oldHeight = texture.height;
  var newTexture = new _core.Texture2D(texture.gl, {
    width: width,
    height: height,
    parameters: parameters
  });
  (0, _core.copyToTexture)(texture, newTexture, {
    targetY: 0,
    width: oldWidth,
    height: oldHeight
  });
  texture.delete();
  return newTexture;
}

function buildRowMapping(mapping, columns, yOffset) {
  for (var i = 0; i < columns.length; i++) {
    var _columns$i = columns[i],
        icon = _columns$i.icon,
        xOffset = _columns$i.xOffset;
    var id = getIconId(icon);
    mapping[id] = _objectSpread(_objectSpread({}, icon), {}, {
      x: xOffset,
      y: yOffset
    });
  }
}

function buildMapping(_ref) {
  var icons = _ref.icons,
      buffer = _ref.buffer,
      _ref$mapping = _ref.mapping,
      mapping = _ref$mapping === void 0 ? {} : _ref$mapping,
      _ref$xOffset = _ref.xOffset,
      xOffset = _ref$xOffset === void 0 ? 0 : _ref$xOffset,
      _ref$yOffset = _ref.yOffset,
      yOffset = _ref$yOffset === void 0 ? 0 : _ref$yOffset,
      _ref$rowHeight = _ref.rowHeight,
      rowHeight = _ref$rowHeight === void 0 ? 0 : _ref$rowHeight,
      canvasWidth = _ref.canvasWidth;
  var columns = [];

  for (var i = 0; i < icons.length; i++) {
    var icon = icons[i];
    var id = getIconId(icon);

    if (!mapping[id]) {
      var height = icon.height,
          width = icon.width;

      if (xOffset + width + buffer > canvasWidth) {
        buildRowMapping(mapping, columns, yOffset);
        xOffset = 0;
        yOffset = rowHeight + yOffset + buffer;
        rowHeight = 0;
        columns = [];
      }

      columns.push({
        icon: icon,
        xOffset: xOffset
      });
      xOffset = xOffset + width + buffer;
      rowHeight = Math.max(rowHeight, height);
    }
  }

  if (columns.length > 0) {
    buildRowMapping(mapping, columns, yOffset);
  }

  return {
    mapping: mapping,
    rowHeight: rowHeight,
    xOffset: xOffset,
    yOffset: yOffset,
    canvasWidth: canvasWidth,
    canvasHeight: nextPowOfTwo(rowHeight + yOffset + buffer)
  };
}

function getDiffIcons(data, getIcon, cachedIcons) {
  if (!data || !getIcon) {
    return null;
  }

  cachedIcons = cachedIcons || {};
  var icons = {};

  var _createIterable = (0, _core3.createIterable)(data),
      iterable = _createIterable.iterable,
      objectInfo = _createIterable.objectInfo;

  var _iterator = _createForOfIteratorHelper(iterable),
      _step;

  try {
    for (_iterator.s(); !(_step = _iterator.n()).done;) {
      var object = _step.value;
      objectInfo.index++;
      var icon = getIcon(object, objectInfo);
      var id = getIconId(icon);

      if (!icon) {
        throw new Error('Icon is missing.');
      }

      if (!icon.url) {
        throw new Error('Icon url is missing.');
      }

      if (!icons[id] && (!cachedIcons[id] || icon.url !== cachedIcons[id].url)) {
        icons[id] = _objectSpread(_objectSpread({}, icon), {}, {
          source: object,
          sourceIndex: objectInfo.index
        });
      }
    }
  } catch (err) {
    _iterator.e(err);
  } finally {
    _iterator.f();
  }

  return icons;
}

var IconManager = function () {
  function IconManager(gl, _ref2) {
    var _ref2$onUpdate = _ref2.onUpdate,
        onUpdate = _ref2$onUpdate === void 0 ? noop : _ref2$onUpdate,
        _ref2$onError = _ref2.onError,
        onError = _ref2$onError === void 0 ? noop : _ref2$onError;
    (0, _classCallCheck2.default)(this, IconManager);
    (0, _defineProperty2.default)(this, "gl", void 0);
    (0, _defineProperty2.default)(this, "onUpdate", void 0);
    (0, _defineProperty2.default)(this, "onError", void 0);
    (0, _defineProperty2.default)(this, "_loadOptions", null);
    (0, _defineProperty2.default)(this, "_texture", null);
    (0, _defineProperty2.default)(this, "_externalTexture", null);
    (0, _defineProperty2.default)(this, "_mapping", {});
    (0, _defineProperty2.default)(this, "_textureParameters", null);
    (0, _defineProperty2.default)(this, "_pendingCount", 0);
    (0, _defineProperty2.default)(this, "_autoPacking", false);
    (0, _defineProperty2.default)(this, "_xOffset", 0);
    (0, _defineProperty2.default)(this, "_yOffset", 0);
    (0, _defineProperty2.default)(this, "_rowHeight", 0);
    (0, _defineProperty2.default)(this, "_buffer", DEFAULT_BUFFER);
    (0, _defineProperty2.default)(this, "_canvasWidth", DEFAULT_CANVAS_WIDTH);
    (0, _defineProperty2.default)(this, "_canvasHeight", 0);
    (0, _defineProperty2.default)(this, "_canvas", null);
    this.gl = gl;
    this.onUpdate = onUpdate;
    this.onError = onError;
  }

  (0, _createClass2.default)(IconManager, [{
    key: "finalize",
    value: function finalize() {
      var _this$_texture;

      (_this$_texture = this._texture) === null || _this$_texture === void 0 ? void 0 : _this$_texture.delete();
    }
  }, {
    key: "getTexture",
    value: function getTexture() {
      return this._texture || this._externalTexture;
    }
  }, {
    key: "getIconMapping",
    value: function getIconMapping(icon) {
      var id = this._autoPacking ? getIconId(icon) : icon;
      return this._mapping[id] || {};
    }
  }, {
    key: "setProps",
    value: function setProps(_ref3) {
      var loadOptions = _ref3.loadOptions,
          autoPacking = _ref3.autoPacking,
          iconAtlas = _ref3.iconAtlas,
          iconMapping = _ref3.iconMapping,
          textureParameters = _ref3.textureParameters;

      if (loadOptions) {
        this._loadOptions = loadOptions;
      }

      if (autoPacking !== undefined) {
        this._autoPacking = autoPacking;
      }

      if (iconMapping) {
        this._mapping = iconMapping;
      }

      if (iconAtlas) {
        var _this$_texture2;

        (_this$_texture2 = this._texture) === null || _this$_texture2 === void 0 ? void 0 : _this$_texture2.delete();
        this._texture = null;
        this._externalTexture = iconAtlas;
      }

      if (textureParameters) {
        this._textureParameters = textureParameters;
      }
    }
  }, {
    key: "isLoaded",
    get: function get() {
      return this._pendingCount === 0;
    }
  }, {
    key: "packIcons",
    value: function packIcons(data, getIcon) {
      if (!this._autoPacking || typeof document === 'undefined') {
        return;
      }

      var icons = Object.values(getDiffIcons(data, getIcon, this._mapping) || {});

      if (icons.length > 0) {
        var _buildMapping = buildMapping({
          icons: icons,
          buffer: this._buffer,
          canvasWidth: this._canvasWidth,
          mapping: this._mapping,
          rowHeight: this._rowHeight,
          xOffset: this._xOffset,
          yOffset: this._yOffset
        }),
            mapping = _buildMapping.mapping,
            xOffset = _buildMapping.xOffset,
            yOffset = _buildMapping.yOffset,
            rowHeight = _buildMapping.rowHeight,
            canvasHeight = _buildMapping.canvasHeight;

        this._rowHeight = rowHeight;
        this._mapping = mapping;
        this._xOffset = xOffset;
        this._yOffset = yOffset;
        this._canvasHeight = canvasHeight;

        if (!this._texture) {
          this._texture = new _core.Texture2D(this.gl, {
            width: this._canvasWidth,
            height: this._canvasHeight,
            parameters: this._textureParameters || DEFAULT_TEXTURE_PARAMETERS
          });
        }

        if (this._texture.height !== this._canvasHeight) {
          this._texture = resizeTexture(this._texture, this._canvasWidth, this._canvasHeight, this._textureParameters || DEFAULT_TEXTURE_PARAMETERS);
        }

        this.onUpdate();
        this._canvas = this._canvas || document.createElement('canvas');

        this._loadIcons(icons);
      }
    }
  }, {
    key: "_loadIcons",
    value: function _loadIcons(icons) {
      var _this = this;

      var ctx = this._canvas.getContext('2d', {
        willReadFrequently: true
      });

      var _iterator2 = _createForOfIteratorHelper(icons),
          _step2;

      try {
        var _loop = function _loop() {
          var icon = _step2.value;
          _this._pendingCount++;
          (0, _core2.load)(icon.url, _this._loadOptions).then(function (imageData) {
            var id = getIconId(icon);
            var iconDef = _this._mapping[id];
            var x = iconDef.x,
                y = iconDef.y,
                maxWidth = iconDef.width,
                maxHeight = iconDef.height;

            var _resizeImage = resizeImage(ctx, imageData, maxWidth, maxHeight),
                data = _resizeImage.data,
                width = _resizeImage.width,
                height = _resizeImage.height;

            _this._texture.setSubImageData({
              data: data,
              x: x + (maxWidth - width) / 2,
              y: y + (maxHeight - height) / 2,
              width: width,
              height: height
            });

            iconDef.width = width;
            iconDef.height = height;

            _this._texture.generateMipmap();

            _this.onUpdate();
          }).catch(function (error) {
            _this.onError({
              url: icon.url,
              source: icon.source,
              sourceIndex: icon.sourceIndex,
              loadOptions: _this._loadOptions,
              error: error
            });
          }).finally(function () {
            _this._pendingCount--;
          });
        };

        for (_iterator2.s(); !(_step2 = _iterator2.n()).done;) {
          _loop();
        }
      } catch (err) {
        _iterator2.e(err);
      } finally {
        _iterator2.f();
      }
    }
  }]);
  return IconManager;
}();

exports.default = IconManager;
//# sourceMappingURL=icon-manager.js.map