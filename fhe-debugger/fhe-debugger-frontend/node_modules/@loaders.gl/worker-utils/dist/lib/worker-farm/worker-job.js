"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const assert_1 = require("../env-utils/assert");
/**
 * Represents one Job handled by a WorkerPool or WorkerFarm
 */
class WorkerJob {
    constructor(jobName, workerThread) {
        this.isRunning = true;
        this._resolve = () => { };
        this._reject = () => { };
        this.name = jobName;
        this.workerThread = workerThread;
        this.result = new Promise((resolve, reject) => {
            this._resolve = resolve;
            this._reject = reject;
        });
    }
    /**
     * Send a message to the job's worker thread
     * @param data any data structure, ideally consisting mostly of transferrable objects
     */
    postMessage(type, payload) {
        this.workerThread.postMessage({
            source: 'loaders.gl',
            type,
            payload
        });
    }
    /**
     * Call to resolve the `result` Promise with the supplied value
     */
    done(value) {
        (0, assert_1.assert)(this.isRunning);
        this.isRunning = false;
        this._resolve(value);
    }
    /**
     * Call to reject the `result` Promise with the supplied error
     */
    error(error) {
        (0, assert_1.assert)(this.isRunning);
        this.isRunning = false;
        this._reject(error);
    }
}
exports.default = WorkerJob;
