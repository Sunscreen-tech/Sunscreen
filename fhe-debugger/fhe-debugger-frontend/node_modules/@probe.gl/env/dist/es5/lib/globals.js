"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.window = exports.self = exports.process = exports.global = exports.document = exports.console = void 0;

var _typeof2 = _interopRequireDefault(require("@babel/runtime/helpers/typeof"));

var globals = {
  self: typeof self !== 'undefined' && self,
  window: typeof window !== 'undefined' && window,
  global: typeof global !== 'undefined' && global,
  document: typeof document !== 'undefined' && document,
  process: (typeof process === "undefined" ? "undefined" : (0, _typeof2.default)(process)) === 'object' && process
};
var global_ = globalThis;
exports.global = global_;
var self_ = globals.self || globals.window || globals.global;
exports.self = self_;
var window_ = globals.window || globals.self || globals.global;
exports.window = window_;
var document_ = globals.document || {};
exports.document = document_;
var process_ = globals.process || {};
exports.process = process_;
var console_ = console;
exports.console = console_;
//# sourceMappingURL=globals.js.map