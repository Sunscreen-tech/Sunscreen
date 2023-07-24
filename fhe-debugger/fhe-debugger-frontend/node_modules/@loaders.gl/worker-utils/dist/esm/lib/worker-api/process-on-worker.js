import WorkerFarm from '../worker-farm/worker-farm';
import { getWorkerURL, getWorkerName } from './get-worker-url';
import { getTransferListForWriter } from '../worker-utils/get-transfer-list';
export function canProcessOnWorker(worker, options) {
  if (!WorkerFarm.isSupported()) {
    return false;
  }
  return worker.worker && (options === null || options === void 0 ? void 0 : options.worker);
}
export async function processOnWorker(worker, data) {
  let options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
  let context = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : {};
  const name = getWorkerName(worker);
  const workerFarm = WorkerFarm.getWorkerFarm(options);
  const {
    source
  } = options;
  const workerPoolProps = {
    name,
    source
  };
  if (!source) {
    workerPoolProps.url = getWorkerURL(worker, options);
  }
  const workerPool = workerFarm.getWorkerPool(workerPoolProps);
  const jobName = options.jobName || worker.name;
  const job = await workerPool.startJob(jobName, onMessage.bind(null, context));
  const transferableOptions = getTransferListForWriter(options);
  job.postMessage('process', {
    input: data,
    options: transferableOptions
  });
  const result = await job.result;
  return result.result;
}
async function onMessage(context, job, type, payload) {
  switch (type) {
    case 'done':
      job.done(payload);
      break;
    case 'error':
      job.error(new Error(payload.error));
      break;
    case 'process':
      const {
        id,
        input,
        options
      } = payload;
      try {
        if (!context.process) {
          job.postMessage('error', {
            id,
            error: 'Worker not set up to process on main thread'
          });
          return;
        }
        const result = await context.process(input, options);
        job.postMessage('done', {
          id,
          result
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'unknown error';
        job.postMessage('error', {
          id,
          error: message
        });
      }
      break;
    default:
      console.warn("process-on-worker: unknown message ".concat(type));
  }
}
//# sourceMappingURL=process-on-worker.js.map