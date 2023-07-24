"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const worker_pool_1 = __importDefault(require("./worker-pool"));
const worker_thread_1 = __importDefault(require("./worker-thread"));
const DEFAULT_PROPS = {
    maxConcurrency: 3,
    maxMobileConcurrency: 1,
    reuseWorkers: true,
    onDebug: () => { }
};
/**
 * Process multiple jobs with a "farm" of different workers in worker pools.
 */
class WorkerFarm {
    /** Checks if workers are supported on this platform */
    static isSupported() {
        return worker_thread_1.default.isSupported();
    }
    /** Get the singleton instance of the global worker farm */
    static getWorkerFarm(props = {}) {
        WorkerFarm._workerFarm = WorkerFarm._workerFarm || new WorkerFarm({});
        WorkerFarm._workerFarm.setProps(props);
        return WorkerFarm._workerFarm;
    }
    /** get global instance with WorkerFarm.getWorkerFarm() */
    constructor(props) {
        this.workerPools = new Map();
        this.props = { ...DEFAULT_PROPS };
        this.setProps(props);
        /** @type Map<string, WorkerPool>} */
        this.workerPools = new Map();
    }
    /**
     * Terminate all workers in the farm
     * @note Can free up significant memory
     */
    destroy() {
        for (const workerPool of this.workerPools.values()) {
            workerPool.destroy();
        }
        this.workerPools = new Map();
    }
    /**
     * Set props used when initializing worker pools
     * @param props
     */
    setProps(props) {
        this.props = { ...this.props, ...props };
        // Update worker pool props
        for (const workerPool of this.workerPools.values()) {
            workerPool.setProps(this._getWorkerPoolProps());
        }
    }
    /**
     * Returns a worker pool for the specified worker
     * @param options - only used first time for a specific worker name
     * @param options.name - the name of the worker - used to identify worker pool
     * @param options.url -
     * @param options.source -
     * @example
     *   const job = WorkerFarm.getWorkerFarm().getWorkerPool({name, url}).startJob(...);
     */
    getWorkerPool(options) {
        const { name, source, url } = options;
        let workerPool = this.workerPools.get(name);
        if (!workerPool) {
            workerPool = new worker_pool_1.default({
                name,
                source,
                url
            });
            workerPool.setProps(this._getWorkerPoolProps());
            this.workerPools.set(name, workerPool);
        }
        return workerPool;
    }
    _getWorkerPoolProps() {
        return {
            maxConcurrency: this.props.maxConcurrency,
            maxMobileConcurrency: this.props.maxMobileConcurrency,
            reuseWorkers: this.props.reuseWorkers,
            onDebug: this.props.onDebug
        };
    }
}
exports.default = WorkerFarm;
