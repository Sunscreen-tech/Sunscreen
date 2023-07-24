"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.REMOVED_LOADER_OPTIONS = exports.DEFAULT_LOADER_OPTIONS = void 0;
var _loaderUtils = require("@loaders.gl/loader-utils");
var _loggers = require("./loggers");
var DEFAULT_LOADER_OPTIONS = {
  fetch: null,
  mimeType: undefined,
  nothrow: false,
  log: new _loggers.ConsoleLog(),
  CDN: 'https://unpkg.com/@loaders.gl',
  worker: true,
  maxConcurrency: 3,
  maxMobileConcurrency: 1,
  reuseWorkers: _loaderUtils.isBrowser,
  _nodeWorkers: false,
  _workerType: '',
  limit: 0,
  _limitMB: 0,
  batchSize: 'auto',
  batchDebounceMs: 0,
  metadata: false,
  transforms: []
};
exports.DEFAULT_LOADER_OPTIONS = DEFAULT_LOADER_OPTIONS;
var REMOVED_LOADER_OPTIONS = {
  throws: 'nothrow',
  dataType: '(no longer used)',
  uri: 'baseUri',
  method: 'fetch.method',
  headers: 'fetch.headers',
  body: 'fetch.body',
  mode: 'fetch.mode',
  credentials: 'fetch.credentials',
  cache: 'fetch.cache',
  redirect: 'fetch.redirect',
  referrer: 'fetch.referrer',
  referrerPolicy: 'fetch.referrerPolicy',
  integrity: 'fetch.integrity',
  keepalive: 'fetch.keepalive',
  signal: 'fetch.signal'
};
exports.REMOVED_LOADER_OPTIONS = REMOVED_LOADER_OPTIONS;
//# sourceMappingURL=option-defaults.js.map