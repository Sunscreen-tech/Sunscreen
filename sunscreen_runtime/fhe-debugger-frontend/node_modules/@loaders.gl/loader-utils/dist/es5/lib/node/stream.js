"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.isSupported = exports.Transform = void 0;
var _stream = _interopRequireDefault(require("stream"));
var Transform;
exports.Transform = Transform;
var isSupported = Boolean(_stream.default);
exports.isSupported = isSupported;
try {
  exports.Transform = Transform = _stream.default.Transform;
} catch (_unused) {}
//# sourceMappingURL=stream.js.map