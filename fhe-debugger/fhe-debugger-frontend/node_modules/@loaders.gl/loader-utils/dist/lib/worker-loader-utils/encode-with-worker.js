"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.canEncodeWithWorker = void 0;
const worker_utils_1 = require("@loaders.gl/worker-utils");
const globals_1 = require("../env-utils/globals");
/**
 * Determines if a loader can parse with worker
 * @param loader
 * @param options
 */
function canEncodeWithWorker(writer, options) {
    if (!worker_utils_1.WorkerFarm.isSupported()) {
        return false;
    }
    // Node workers are still experimental
    if (!globals_1.isBrowser && !options?._nodeWorkers) {
        return false;
    }
    return writer.worker && options?.worker;
}
exports.canEncodeWithWorker = canEncodeWithWorker;
