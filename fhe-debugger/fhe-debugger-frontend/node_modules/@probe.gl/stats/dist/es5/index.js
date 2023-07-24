"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
Object.defineProperty(exports, "Stat", {
  enumerable: true,
  get: function get() {
    return _stat.default;
  }
});
Object.defineProperty(exports, "Stats", {
  enumerable: true,
  get: function get() {
    return _stats.default;
  }
});
Object.defineProperty(exports, "_getHiResTimestamp", {
  enumerable: true,
  get: function get() {
    return _hiResTimestamp.default;
  }
});

var _stats = _interopRequireDefault(require("./lib/stats"));

var _stat = _interopRequireDefault(require("./lib/stat"));

var _hiResTimestamp = _interopRequireDefault(require("./utils/hi-res-timestamp"));
//# sourceMappingURL=index.js.map