import { WorkerFarm } from '@loaders.gl/worker-utils';
import { isBrowser } from '../env-utils/globals';
export function canEncodeWithWorker(writer, options) {
  if (!WorkerFarm.isSupported()) {
    return false;
  }
  if (!isBrowser && !(options !== null && options !== void 0 && options._nodeWorkers)) {
    return false;
  }
  return writer.worker && (options === null || options === void 0 ? void 0 : options.worker);
}
//# sourceMappingURL=encode-with-worker.js.map