"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.REMOVED_LOADER_OPTIONS = exports.DEFAULT_LOADER_OPTIONS = void 0;
const loader_utils_1 = require("@loaders.gl/loader-utils");
const loggers_1 = require("./loggers");
exports.DEFAULT_LOADER_OPTIONS = {
    // baseUri
    fetch: null,
    mimeType: undefined,
    nothrow: false,
    log: new loggers_1.ConsoleLog(),
    CDN: 'https://unpkg.com/@loaders.gl',
    worker: true,
    maxConcurrency: 3,
    maxMobileConcurrency: 1,
    reuseWorkers: loader_utils_1.isBrowser,
    _nodeWorkers: false,
    _workerType: '',
    limit: 0,
    _limitMB: 0,
    batchSize: 'auto',
    batchDebounceMs: 0,
    metadata: false,
    transforms: []
};
exports.REMOVED_LOADER_OPTIONS = {
    throws: 'nothrow',
    dataType: '(no longer used)',
    uri: 'baseUri',
    // Warn if fetch options are used on top-level
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
