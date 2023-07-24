import { isBrowser } from '@loaders.gl/worker-utils';
import { WorkerFarm, getWorkerURL } from '@loaders.gl/worker-utils';
export function canParseWithWorker(loader, options) {
  if (!WorkerFarm.isSupported()) {
    return false;
  }
  if (!isBrowser && !(options !== null && options !== void 0 && options._nodeWorkers)) {
    return false;
  }
  return loader.worker && (options === null || options === void 0 ? void 0 : options.worker);
}
export async function parseWithWorker(loader, data, options, context, parseOnMainThread) {
  const name = loader.id;
  const url = getWorkerURL(loader, options);
  const workerFarm = WorkerFarm.getWorkerFarm(options);
  const workerPool = workerFarm.getWorkerPool({
    name,
    url
  });
  options = JSON.parse(JSON.stringify(options));
  context = JSON.parse(JSON.stringify(context || {}));
  const job = await workerPool.startJob('process-on-worker', onMessage.bind(null, parseOnMainThread));
  job.postMessage('process', {
    input: data,
    options,
    context
  });
  const result = await job.result;
  return await result.result;
}
async function onMessage(parseOnMainThread, job, type, payload) {
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
        const result = await parseOnMainThread(input, options);
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
      console.warn("parse-with-worker unknown message ".concat(type));
  }
}
//# sourceMappingURL=parse-with-worker.js.map