import { WorkerBody } from '@loaders.gl/worker-utils';
import { DracoWriter } from '../draco-writer';
(() => {
  if (!WorkerBody.inWorkerThread()) {
    return;
  }
  WorkerBody.onmessage = async (type, payload) => {
    switch (type) {
      case 'process':
        try {
          const {
            input,
            options
          } = payload;
          const result = await DracoWriter.encode(input, options);
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
})();
//# sourceMappingURL=draco-writer-worker.js.map