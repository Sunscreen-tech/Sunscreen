"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
Object.defineProperty(exports, "COLOR", {
  enumerable: true,
  get: function get() {
    return _color.COLOR;
  }
});
Object.defineProperty(exports, "LocalStorage", {
  enumerable: true,
  get: function get() {
    return _localStorage.LocalStorage;
  }
});
Object.defineProperty(exports, "Log", {
  enumerable: true,
  get: function get() {
    return _log.Log;
  }
});
Object.defineProperty(exports, "addColor", {
  enumerable: true,
  get: function get() {
    return _color.addColor;
  }
});
Object.defineProperty(exports, "autobind", {
  enumerable: true,
  get: function get() {
    return _autobind.autobind;
  }
});
exports.default = void 0;
Object.defineProperty(exports, "getHiResTimestamp", {
  enumerable: true,
  get: function get() {
    return _hiResTimestamp.getHiResTimestamp;
  }
});
Object.defineProperty(exports, "leftPad", {
  enumerable: true,
  get: function get() {
    return _formatters.leftPad;
  }
});
Object.defineProperty(exports, "rightPad", {
  enumerable: true,
  get: function get() {
    return _formatters.rightPad;
  }
});

var _log = require("./log");

var _color = require("./utils/color");

var _formatters = require("./utils/formatters");

var _autobind = require("./utils/autobind");

var _localStorage = require("./utils/local-storage");

var _hiResTimestamp = require("./utils/hi-res-timestamp");

require("./init");

var _default = new _log.Log({
  id: '@probe.gl/log'
});

exports.default = _default;
//# sourceMappingURL=index.js.map