"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.window = exports.self = exports.nodeVersion = exports.isWorker = exports.isBrowser = exports.global = exports.document = void 0;
var _typeof2 = _interopRequireDefault(require("@babel/runtime/helpers/typeof"));
var globals = {
  self: typeof self !== 'undefined' && self,
  window: typeof window !== 'undefined' && window,
  global: typeof global !== 'undefined' && global,
  document: typeof document !== 'undefined' && document
};
var self_ = globals.self || globals.window || globals.global || {};
exports.self = self_;
var window_ = globals.window || globals.self || globals.global || {};
exports.window = window_;
var global_ = globals.global || globals.self || globals.window || {};
exports.global = global_;
var document_ = globals.document || {};
exports.document = document_;
var isBrowser = Boolean((typeof process === "undefined" ? "undefined" : (0, _typeof2.default)(process)) !== 'object' || String(process) !== '[object process]' || process.browser);
exports.isBrowser = isBrowser;
var isWorker = typeof importScripts === 'function';
exports.isWorker = isWorker;
var matches = typeof process !== 'undefined' && process.version && /v([0-9]*)/.exec(process.version);
var nodeVersion = matches && parseFloat(matches[1]) || 0;
exports.nodeVersion = nodeVersion;
//# sourceMappingURL=globals.js.map