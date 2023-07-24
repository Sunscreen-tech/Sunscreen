"use strict";
// Purpose: include this in your module to avoids adding dependencies on
// micro modules like 'global' and 'is-browser';
Object.defineProperty(exports, "__esModule", { value: true });
exports.nodeVersion = exports.isMobile = exports.isWorker = exports.isBrowser = exports.document = exports.global = exports.window = exports.self = void 0;
/* eslint-disable no-restricted-globals */
const globals = {
    self: typeof self !== 'undefined' && self,
    window: typeof window !== 'undefined' && window,
    global: typeof global !== 'undefined' && global,
    document: typeof document !== 'undefined' && document
};
const self_ = globals.self || globals.window || globals.global || {};
exports.self = self_;
const window_ = globals.window || globals.self || globals.global || {};
exports.window = window_;
const global_ = globals.global || globals.self || globals.window || {};
exports.global = global_;
const document_ = globals.document || {};
exports.document = document_;
/** true if running in the browser, false if running in Node.js */
exports.isBrowser = 
// @ts-ignore process.browser
typeof process !== 'object' || String(process) !== '[object process]' || process.browser;
/** true if running on a worker thread */
exports.isWorker = typeof importScripts === 'function';
/** true if running on a mobile device */
exports.isMobile = typeof window !== 'undefined' && typeof window.orientation !== 'undefined';
// Extract node major version
const matches = typeof process !== 'undefined' && process.version && /v([0-9]*)/.exec(process.version);
/** Version of Node.js if running under Node, otherwise 0 */
exports.nodeVersion = (matches && parseFloat(matches[1])) || 0;
