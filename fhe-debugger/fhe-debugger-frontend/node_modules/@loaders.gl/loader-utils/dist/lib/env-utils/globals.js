"use strict";
// Purpose: include this in your module to avoid
// dependencies on micro modules like 'global' and 'is-browser';
Object.defineProperty(exports, "__esModule", { value: true });
exports.nodeVersion = exports.isWorker = exports.isBrowser = exports.document = exports.global = exports.window = exports.self = void 0;
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
/** true if running in a browser */
exports.isBrowser = 
// @ts-ignore process does not exist on browser
Boolean(typeof process !== 'object' || String(process) !== '[object process]' || process.browser);
/** true if running in a worker thread */
exports.isWorker = typeof importScripts === 'function';
// Extract node major version
const matches = typeof process !== 'undefined' && process.version && /v([0-9]*)/.exec(process.version);
/** Major Node version (as a number) */
exports.nodeVersion = (matches && parseFloat(matches[1])) || 0;
