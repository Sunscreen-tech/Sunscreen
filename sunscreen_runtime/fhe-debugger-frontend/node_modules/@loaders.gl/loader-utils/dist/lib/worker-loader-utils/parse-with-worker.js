"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseWithWorker = exports.canParseWithWorker = void 0;
const worker_utils_1 = require("@loaders.gl/worker-utils");
const worker_utils_2 = require("@loaders.gl/worker-utils");
/**
 * Determines if a loader can parse with worker
 * @param loader
 * @param options
 */
function canParseWithWorker(loader, options) {
    if (!worker_utils_2.WorkerFarm.isSupported()) {
        return false;
    }
    // Node workers are still experimental
    if (!worker_utils_1.isBrowser && !options?._nodeWorkers) {
        return false;
    }
    return loader.worker && options?.worker;
}
exports.canParseWithWorker = canParseWithWorker;
/**
 * this function expects that the worker function sends certain messages,
 * this can be automated if the worker is wrapper by a call to createLoaderWorker in @loaders.gl/loader-utils.
 */
async function parseWithWorker(loader, data, options, context, parseOnMainThread) {
    const name = loader.id; // TODO
    const url = (0, worker_utils_2.getWorkerURL)(loader, options);
    const workerFarm = worker_utils_2.WorkerFarm.getWorkerFarm(options);
    const workerPool = workerFarm.getWorkerPool({ name, url });
    // options.log object contains functions which cannot be transferred
    // context.fetch & context.parse functions cannot be transferred
    // TODO - decide how to handle logging on workers
    options = JSON.parse(JSON.stringify(options));
    context = JSON.parse(JSON.stringify(context || {}));
    const job = await workerPool.startJob('process-on-worker', 
    // @ts-expect-error
    onMessage.bind(null, parseOnMainThread) // eslint-disable-line @typescript-eslint/no-misused-promises
    );
    job.postMessage('process', {
        // @ts-ignore
        input: data,
        options,
        context
    });
    const result = await job.result;
    // TODO - what is going on here?
    return await result.result;
}
exports.parseWithWorker = parseWithWorker;
/**
 * Handle worker's responses to the main thread
 * @param job
 * @param type
 * @param payload
 */
async function onMessage(parseOnMainThread, job, type, payload) {
    switch (type) {
        case 'done':
            job.done(payload);
            break;
        case 'error':
            job.error(new Error(payload.error));
            break;
        case 'process':
            // Worker is asking for main thread to parseO
            const { id, input, options } = payload;
            try {
                const result = await parseOnMainThread(input, options);
                job.postMessage('done', { id, result });
            }
            catch (error) {
                const message = error instanceof Error ? error.message : 'unknown error';
                job.postMessage('error', { id, error: message });
            }
            break;
        default:
            // eslint-disable-next-line
            console.warn(`parse-with-worker unknown message ${type}`);
    }
}
