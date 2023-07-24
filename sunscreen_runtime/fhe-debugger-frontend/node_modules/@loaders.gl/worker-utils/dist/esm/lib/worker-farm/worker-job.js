import _defineProperty from "@babel/runtime/helpers/esm/defineProperty";
import { assert } from '../env-utils/assert';
export default class WorkerJob {
  constructor(jobName, workerThread) {
    _defineProperty(this, "name", void 0);
    _defineProperty(this, "workerThread", void 0);
    _defineProperty(this, "isRunning", true);
    _defineProperty(this, "result", void 0);
    _defineProperty(this, "_resolve", () => {});
    _defineProperty(this, "_reject", () => {});
    this.name = jobName;
    this.workerThread = workerThread;
    this.result = new Promise((resolve, reject) => {
      this._resolve = resolve;
      this._reject = reject;
    });
  }
  postMessage(type, payload) {
    this.workerThread.postMessage({
      source: 'loaders.gl',
      type,
      payload
    });
  }
  done(value) {
    assert(this.isRunning);
    this.isRunning = false;
    this._resolve(value);
  }
  error(error) {
    assert(this.isRunning);
    this.isRunning = false;
    this._reject(error);
  }
}
//# sourceMappingURL=worker-job.js.map