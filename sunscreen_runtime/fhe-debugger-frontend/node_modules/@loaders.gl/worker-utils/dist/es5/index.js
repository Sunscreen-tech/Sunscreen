"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
Object.defineProperty(exports, "AsyncQueue", {
  enumerable: true,
  get: function get() {
    return _asyncQueue.default;
  }
});
Object.defineProperty(exports, "ChildProcessProxy", {
  enumerable: true,
  get: function get() {
    return _childProcessProxy.default;
  }
});
exports.NullWorker = void 0;
Object.defineProperty(exports, "WorkerBody", {
  enumerable: true,
  get: function get() {
    return _workerBody.default;
  }
});
Object.defineProperty(exports, "WorkerFarm", {
  enumerable: true,
  get: function get() {
    return _workerFarm.default;
  }
});
Object.defineProperty(exports, "WorkerJob", {
  enumerable: true,
  get: function get() {
    return _workerJob.default;
  }
});
Object.defineProperty(exports, "WorkerPool", {
  enumerable: true,
  get: function get() {
    return _workerPool.default;
  }
});
Object.defineProperty(exports, "WorkerThread", {
  enumerable: true,
  get: function get() {
    return _workerThread.default;
  }
});
Object.defineProperty(exports, "assert", {
  enumerable: true,
  get: function get() {
    return _assert.assert;
  }
});
Object.defineProperty(exports, "canProcessOnWorker", {
  enumerable: true,
  get: function get() {
    return _processOnWorker.canProcessOnWorker;
  }
});
Object.defineProperty(exports, "createWorker", {
  enumerable: true,
  get: function get() {
    return _createWorker.createWorker;
  }
});
Object.defineProperty(exports, "getLibraryUrl", {
  enumerable: true,
  get: function get() {
    return _libraryUtils.getLibraryUrl;
  }
});
Object.defineProperty(exports, "getTransferList", {
  enumerable: true,
  get: function get() {
    return _getTransferList.getTransferList;
  }
});
Object.defineProperty(exports, "getTransferListForWriter", {
  enumerable: true,
  get: function get() {
    return _getTransferList.getTransferListForWriter;
  }
});
Object.defineProperty(exports, "getWorkerURL", {
  enumerable: true,
  get: function get() {
    return _getWorkerUrl.getWorkerURL;
  }
});
Object.defineProperty(exports, "isBrowser", {
  enumerable: true,
  get: function get() {
    return _globals.isBrowser;
  }
});
Object.defineProperty(exports, "isWorker", {
  enumerable: true,
  get: function get() {
    return _globals.isWorker;
  }
});
Object.defineProperty(exports, "loadLibrary", {
  enumerable: true,
  get: function get() {
    return _libraryUtils.loadLibrary;
  }
});
Object.defineProperty(exports, "processOnWorker", {
  enumerable: true,
  get: function get() {
    return _processOnWorker.processOnWorker;
  }
});
Object.defineProperty(exports, "validateWorkerVersion", {
  enumerable: true,
  get: function get() {
    return _validateWorkerVersion.validateWorkerVersion;
  }
});
var _version = require("./lib/env-utils/version");
var _assert = require("./lib/env-utils/assert");
var _globals = require("./lib/env-utils/globals");
var _workerJob = _interopRequireDefault(require("./lib/worker-farm/worker-job"));
var _workerThread = _interopRequireDefault(require("./lib/worker-farm/worker-thread"));
var _workerFarm = _interopRequireDefault(require("./lib/worker-farm/worker-farm"));
var _workerPool = _interopRequireDefault(require("./lib/worker-farm/worker-pool"));
var _workerBody = _interopRequireDefault(require("./lib/worker-farm/worker-body"));
var _processOnWorker = require("./lib/worker-api/process-on-worker");
var _createWorker = require("./lib/worker-api/create-worker");
var _getWorkerUrl = require("./lib/worker-api/get-worker-url");
var _validateWorkerVersion = require("./lib/worker-api/validate-worker-version");
var _getTransferList = require("./lib/worker-utils/get-transfer-list");
var _libraryUtils = require("./lib/library-utils/library-utils");
var _asyncQueue = _interopRequireDefault(require("./lib/async-queue/async-queue"));
var _childProcessProxy = _interopRequireDefault(require("./lib/process-utils/child-process-proxy"));
var NullWorker = {
  id: 'null',
  name: 'null',
  module: 'worker-utils',
  version: _version.VERSION,
  options: {
    null: {}
  }
};
exports.NullWorker = NullWorker;
//# sourceMappingURL=index.js.map