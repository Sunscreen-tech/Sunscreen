"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NullWorker = exports.ChildProcessProxy = exports.AsyncQueue = exports.loadLibrary = exports.getLibraryUrl = exports.getTransferListForWriter = exports.getTransferList = exports.validateWorkerVersion = exports.getWorkerURL = exports.createWorker = exports.canProcessOnWorker = exports.processOnWorker = exports.WorkerBody = exports.WorkerPool = exports.WorkerFarm = exports.WorkerThread = exports.WorkerJob = exports.isWorker = exports.isBrowser = exports.assert = void 0;
const version_1 = require("./lib/env-utils/version");
// GENERAL UTILS
var assert_1 = require("./lib/env-utils/assert");
Object.defineProperty(exports, "assert", { enumerable: true, get: function () { return assert_1.assert; } });
var globals_1 = require("./lib/env-utils/globals");
Object.defineProperty(exports, "isBrowser", { enumerable: true, get: function () { return globals_1.isBrowser; } });
Object.defineProperty(exports, "isWorker", { enumerable: true, get: function () { return globals_1.isWorker; } });
// WORKER UTILS - TYPES
var worker_job_1 = require("./lib/worker-farm/worker-job");
Object.defineProperty(exports, "WorkerJob", { enumerable: true, get: function () { return __importDefault(worker_job_1).default; } });
var worker_thread_1 = require("./lib/worker-farm/worker-thread");
Object.defineProperty(exports, "WorkerThread", { enumerable: true, get: function () { return __importDefault(worker_thread_1).default; } });
// WORKER FARMS
var worker_farm_1 = require("./lib/worker-farm/worker-farm");
Object.defineProperty(exports, "WorkerFarm", { enumerable: true, get: function () { return __importDefault(worker_farm_1).default; } });
var worker_pool_1 = require("./lib/worker-farm/worker-pool");
Object.defineProperty(exports, "WorkerPool", { enumerable: true, get: function () { return __importDefault(worker_pool_1).default; } });
var worker_body_1 = require("./lib/worker-farm/worker-body");
Object.defineProperty(exports, "WorkerBody", { enumerable: true, get: function () { return __importDefault(worker_body_1).default; } });
var process_on_worker_1 = require("./lib/worker-api/process-on-worker");
Object.defineProperty(exports, "processOnWorker", { enumerable: true, get: function () { return process_on_worker_1.processOnWorker; } });
Object.defineProperty(exports, "canProcessOnWorker", { enumerable: true, get: function () { return process_on_worker_1.canProcessOnWorker; } });
var create_worker_1 = require("./lib/worker-api/create-worker");
Object.defineProperty(exports, "createWorker", { enumerable: true, get: function () { return create_worker_1.createWorker; } });
// WORKER UTILS - EXPORTS
var get_worker_url_1 = require("./lib/worker-api/get-worker-url");
Object.defineProperty(exports, "getWorkerURL", { enumerable: true, get: function () { return get_worker_url_1.getWorkerURL; } });
var validate_worker_version_1 = require("./lib/worker-api/validate-worker-version");
Object.defineProperty(exports, "validateWorkerVersion", { enumerable: true, get: function () { return validate_worker_version_1.validateWorkerVersion; } });
var get_transfer_list_1 = require("./lib/worker-utils/get-transfer-list");
Object.defineProperty(exports, "getTransferList", { enumerable: true, get: function () { return get_transfer_list_1.getTransferList; } });
Object.defineProperty(exports, "getTransferListForWriter", { enumerable: true, get: function () { return get_transfer_list_1.getTransferListForWriter; } });
// LIBRARY UTILS
var library_utils_1 = require("./lib/library-utils/library-utils");
Object.defineProperty(exports, "getLibraryUrl", { enumerable: true, get: function () { return library_utils_1.getLibraryUrl; } });
Object.defineProperty(exports, "loadLibrary", { enumerable: true, get: function () { return library_utils_1.loadLibrary; } });
// PARSER UTILS
var async_queue_1 = require("./lib/async-queue/async-queue");
Object.defineProperty(exports, "AsyncQueue", { enumerable: true, get: function () { return __importDefault(async_queue_1).default; } });
// PROCESS UTILS
var child_process_proxy_1 = require("./lib/process-utils/child-process-proxy");
Object.defineProperty(exports, "ChildProcessProxy", { enumerable: true, get: function () { return __importDefault(child_process_proxy_1).default; } });
// WORKER OBJECTS
/** A null worker to test that worker processing is functional */
exports.NullWorker = {
    id: 'null',
    name: 'null',
    module: 'worker-utils',
    version: version_1.VERSION,
    options: {
        null: {}
    }
};
