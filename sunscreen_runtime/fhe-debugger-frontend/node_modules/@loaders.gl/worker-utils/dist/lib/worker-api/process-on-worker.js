"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.processOnWorker = exports.canProcessOnWorker = void 0;
const worker_farm_1 = __importDefault(require("../worker-farm/worker-farm"));
const get_worker_url_1 = require("./get-worker-url");
const get_transfer_list_1 = require("../worker-utils/get-transfer-list");
/**
 * Determines if we can parse with worker
 * @param loader
 * @param data
 * @param options
 */
function canProcessOnWorker(worker, options) {
    if (!worker_farm_1.default.isSupported()) {
        return false;
    }
    return worker.worker && options?.worker;
}
exports.canProcessOnWorker = canProcessOnWorker;
/**
 * This function expects that the worker thread sends certain messages,
 * Creating such a worker can be automated if the worker is wrapper by a call to
 * createWorker in @loaders.gl/worker-utils.
 */
async function processOnWorker(worker, data, options = {}, context = {}) {
    const name = (0, get_worker_url_1.getWorkerName)(worker);
    const workerFarm = worker_farm_1.default.getWorkerFarm(options);
    const { source } = options;
    const workerPoolProps = { name, source };
    if (!source) {
        workerPoolProps.url = (0, get_worker_url_1.getWorkerURL)(worker, options);
    }
    const workerPool = workerFarm.getWorkerPool(workerPoolProps);
    const jobName = options.jobName || worker.name;
    const job = await workerPool.startJob(jobName, 
    // eslint-disable-next-line
    onMessage.bind(null, context));
    // Kick off the processing in the worker
    const transferableOptions = (0, get_transfer_list_1.getTransferListForWriter)(options);
    job.postMessage('process', { input: data, options: transferableOptions });
    const result = await job.result;
    return result.result;
}
exports.processOnWorker = processOnWorker;
/**
 * Job completes when we receive the result
 * @param job
 * @param message
 */
async function onMessage(context, job, type, payload) {
    switch (type) {
        case 'done':
            // Worker is done
            job.done(payload);
            break;
        case 'error':
            // Worker encountered an error
            job.error(new Error(payload.error));
            break;
        case 'process':
            // Worker is asking for us (main thread) to process something
            const { id, input, options } = payload;
            try {
                if (!context.process) {
                    job.postMessage('error', { id, error: 'Worker not set up to process on main thread' });
                    return;
                }
                const result = await context.process(input, options);
                job.postMessage('done', { id, result });
            }
            catch (error) {
                const message = error instanceof Error ? error.message : 'unknown error';
                job.postMessage('error', { id, error: message });
            }
            break;
        default:
            // eslint-disable-next-line
            console.warn(`process-on-worker: unknown message ${type}`);
    }
}
