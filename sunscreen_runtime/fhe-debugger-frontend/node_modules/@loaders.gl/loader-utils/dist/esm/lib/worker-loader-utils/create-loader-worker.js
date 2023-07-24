import { WorkerBody } from '@loaders.gl/worker-utils';
let requestId = 0;
export function createLoaderWorker(loader) {
  if (!WorkerBody.inWorkerThread()) {
    return;
  }
  WorkerBody.onmessage = async (type, payload) => {
    switch (type) {
      case 'process':
        try {
          const {
            input,
            options = {},
            context = {}
          } = payload;
          const result = await parseData({
            loader,
            arrayBuffer: input,
            options,
            context: {
              ...context,
              parse: parseOnMainThread
            }
          });
          WorkerBody.postMessage('done', {
            result
          });
        } catch (error) {
          const message = error instanceof Error ? error.message : '';
          WorkerBody.postMessage('error', {
            error: message
          });
        }
        break;
      default:
    }
  };
}
function parseOnMainThread(arrayBuffer, options) {
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
async function parseData(_ref) {
  let {
    loader,
    arrayBuffer,
    options,
    context
  } = _ref;
  let data;
  let parser;
  if (loader.parseSync || loader.parse) {
    data = arrayBuffer;
    parser = loader.parseSync || loader.parse;
  } else if (loader.parseTextSync) {
    const textDecoder = new TextDecoder();
    data = textDecoder.decode(arrayBuffer);
    parser = loader.parseTextSync;
  } else {
    throw new Error("Could not load data with ".concat(loader.name, " loader"));
  }
  options = {
    ...options,
    modules: loader && loader.options && loader.options.modules || {},
    worker: false
  };
  return await parser(data, {
    ...options
  }, context, loader);
}
//# sourceMappingURL=create-loader-worker.js.map