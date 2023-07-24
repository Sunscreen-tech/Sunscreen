"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parentPort = exports.NodeWorkerType = exports.NodeWorker = exports.Worker = void 0;
// Browser fills for Node.js built-in `worker_threads` module.
// These fills are non-functional, and just intended to ensure that
// `import 'worker_threads` doesn't break browser builds.
// The replacement is done in package.json browser field
class Worker {
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    terminate() { }
}
exports.Worker = Worker;
exports.NodeWorker = Worker;
exports.NodeWorkerType = Worker;
exports.parentPort = null;
