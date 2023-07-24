"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

var _typeof = require("@babel/runtime/helpers/typeof");

Object.defineProperty(exports, "__esModule", {
  value: true
});
Object.defineProperty(exports, "VERSION", {
  enumerable: true,
  get: function get() {
    return _globals.VERSION;
  }
});
Object.defineProperty(exports, "assert", {
  enumerable: true,
  get: function get() {
    return _assert.default;
  }
});
Object.defineProperty(exports, "console", {
  enumerable: true,
  get: function get() {
    return _globals2.console;
  }
});
Object.defineProperty(exports, "document", {
  enumerable: true,
  get: function get() {
    return _globals2.document;
  }
});
Object.defineProperty(exports, "getBrowser", {
  enumerable: true,
  get: function get() {
    return _getBrowser.default;
  }
});
Object.defineProperty(exports, "global", {
  enumerable: true,
  get: function get() {
    return _globals2.global;
  }
});
Object.defineProperty(exports, "isBrowser", {
  enumerable: true,
  get: function get() {
    return _isBrowser.default;
  }
});
Object.defineProperty(exports, "isBrowserMainThread", {
  enumerable: true,
  get: function get() {
    return _isBrowser.isBrowserMainThread;
  }
});
Object.defineProperty(exports, "isElectron", {
  enumerable: true,
  get: function get() {
    return _isElectron.default;
  }
});
Object.defineProperty(exports, "isMobile", {
  enumerable: true,
  get: function get() {
    return _getBrowser.isMobile;
  }
});
Object.defineProperty(exports, "process", {
  enumerable: true,
  get: function get() {
    return _globals2.process;
  }
});
Object.defineProperty(exports, "self", {
  enumerable: true,
  get: function get() {
    return _globals2.self;
  }
});
Object.defineProperty(exports, "window", {
  enumerable: true,
  get: function get() {
    return _globals2.window;
  }
});

var _globals = require("./utils/globals");

var _globals2 = require("./lib/globals");

var _isBrowser = _interopRequireWildcard(require("./lib/is-browser"));

var _getBrowser = _interopRequireWildcard(require("./lib/get-browser"));

var _isElectron = _interopRequireDefault(require("./lib/is-electron"));

var _assert = _interopRequireDefault(require("./utils/assert"));

function _getRequireWildcardCache(nodeInterop) { if (typeof WeakMap !== "function") return null; var cacheBabelInterop = new WeakMap(); var cacheNodeInterop = new WeakMap(); return (_getRequireWildcardCache = function _getRequireWildcardCache(nodeInterop) { return nodeInterop ? cacheNodeInterop : cacheBabelInterop; })(nodeInterop); }

function _interopRequireWildcard(obj, nodeInterop) { if (!nodeInterop && obj && obj.__esModule) { return obj; } if (obj === null || _typeof(obj) !== "object" && typeof obj !== "function") { return { default: obj }; } var cache = _getRequireWildcardCache(nodeInterop); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (key !== "default" && Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj.default = obj; if (cache) { cache.set(obj, newObj); } return newObj; }
//# sourceMappingURL=index.js.map