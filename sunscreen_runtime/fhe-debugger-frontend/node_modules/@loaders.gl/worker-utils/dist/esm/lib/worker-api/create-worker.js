import AsyncQueue from '../async-queue/async-queue';
import WorkerBody from '../worker-farm/worker-body';
let requestId = 0;
let inputBatches;
let options;
export function createWorker(process, processInBatches) {
  if (!WorkerBody.inWorkerThread()) {
    return;
  }
  const context = {
    process: processOnMainThread
  };
  WorkerBody.onmessage = async (type, payload) => {
    try {
      switch (type) {
        case 'process':
          if (!process) {
            throw new Error('Worker does not support atomic processing');
          }
          const result = await process(payload.input, payload.options || {}, context);
          WorkerBody.postMessage('done', {
            result
          });
          break;
        case 'process-in-batches':
          if (!processInBatches) {
            throw new Error('Worker does not support batched processing');
          }
          inputBatches = new AsyncQueue();
          options = payload.options || {};
          const resultIterator = processInBatches(inputBatches, options, context);
          for await (const batch of resultIterator) {
            WorkerBody.postMessage('output-batch', {
              result: batch
            });
          }
          WorkerBody.postMessage('done', {});
          break;
        case 'input-batch':
          inputBatches.push(payload.input);
          break;
        case 'input-done':
          inputBatches.close();
          break;
        default:
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      WorkerBody.postMessage('error', {
        error: message
      });
    }
  };
}
function processOnMainThread(arrayBuffer) {
  let options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
  return new Promise((resolve, reject) => {
    const id = requestId++;
    const onMessage = (type, payload) => {
      if (payload.id !== id) {
        return;
      }
      switch (type) {
        case 'done':
          WorkerBody.removeEventListener(onMessage);
          resolve(payload.result);
          break;
        case 'error':
          WorkerBody.removeEventListener(onMessage);
          reject(payload.error);
          break;
        default:
      }
    };
    WorkerBody.addEventListener(onMessage);
    const payload = {
      id,
      input: arrayBuffer,
      options
    };
    WorkerBody.postMessage('process', payload);
  });
}
//# sourceMappingURL=create-worker.js.map