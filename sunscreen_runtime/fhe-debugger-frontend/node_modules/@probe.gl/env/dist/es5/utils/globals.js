"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.VERSION = void 0;
Object.defineProperty(exports, "console", {
  enumerable: true,
  get: function get() {
    return _globals.console;
  }
});
Object.defineProperty(exports, "document", {
  enumerable: true,
  get: function get() {
    return _globals.document;
  }
});
Object.defineProperty(exports, "global", {
  enumerable: true,
  get: function get() {
    return _globals.global;
  }
});
exports.isBrowser = void 0;
Object.defineProperty(exports, "process", {
  enumerable: true,
  get: function get() {
    return _globals.process;
  }
});
Object.defineProperty(exports, "self", {
  enumerable: true,
  get: function get() {
    return _globals.self;
  }
});
Object.defineProperty(exports, "window", {
  enumerable: true,
  get: function get() {
    return _globals.window;
  }
});

var _isBrowser = _interopRequireDefault(require("../lib/is-browser"));

var _globals = require("../lib/globals");

var VERSION = typeof __VERSION__ !== 'undefined' ? __VERSION__ : 'untranspiled source';
exports.VERSION = VERSION;
var isBrowser = (0, _isBrowser.default)();
exports.isBrowser = isBrowser;
//# sourceMappingURL=globals.js.map