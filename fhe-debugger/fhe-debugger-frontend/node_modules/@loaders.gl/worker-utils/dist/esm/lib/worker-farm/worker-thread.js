import _defineProperty from "@babel/runtime/helpers/esm/defineProperty";
import { NodeWorker } from '../node/worker_threads';
import { isBrowser } from '../env-utils/globals';
import { assert } from '../env-utils/assert';
import { getLoadableWorkerURL } from '../worker-utils/get-loadable-worker-url';
import { getTransferList } from '../worker-utils/get-transfer-list';
const NOOP = () => {};
export default class WorkerThread {
  static isSupported() {
    return typeof Worker !== 'undefined' && isBrowser || typeof NodeWorker !== 'undefined' && !isBrowser;
  }
  constructor(props) {
    _defineProperty(this, "name", void 0);
    _defineProperty(this, "source", void 0);
    _defineProperty(this, "url", void 0);
    _defineProperty(this, "terminated", false);
    _defineProperty(this, "worker", void 0);
    _defineProperty(this, "onMessage", void 0);
    _defineProperty(this, "onError", void 0);
    _defineProperty(this, "_loadableURL", '');
    const {
      name,
      source,
      url
    } = props;
    assert(source || url);
    this.name = name;
    this.source = source;
    this.url = url;
    this.onMessage = NOOP;
    this.onError = error => console.log(error);
    this.worker = isBrowser ? this._createBrowserWorker() : this._createNodeWorker();
  }
  destroy() {
    this.onMessage = NOOP;
    this.onError = NOOP;
    this.worker.terminate();
    this.terminated = true;
  }
  get isRunning() {
    return Boolean(this.onMessage);
  }
  postMessage(data, transferList) {
    transferList = transferList || getTransferList(data);
    this.worker.postMessage(data, transferList);
  }
  _getErrorFromErrorEvent(event) {
    let message = 'Failed to load ';
    message += "worker ".concat(this.name, " from ").concat(this.url, ". ");
    if (event.message) {
      message += "".concat(event.message, " in ");
    }
    if (event.lineno) {
      message += ":".concat(event.lineno, ":").concat(event.colno);
    }
    return new Error(message);
  }
  _createBrowserWorker() {
    this._loadableURL = getLoadableWorkerURL({
      source: this.source,
      url: this.url
    });
    const worker = new Worker(this._loadableURL, {
      name: this.name
    });
    worker.onmessage = event => {
      if (!event.data) {
        this.onError(new Error('No data received'));
      } else {
        this.onMessage(event.data);
      }
    };
    worker.onerror = error => {
      this.onError(this._getErrorFromErrorEvent(error));
      this.terminated = true;
    };
    worker.onmessageerror = event => console.error(event);
    return worker;
  }
  _createNodeWorker() {
    let worker;
    if (this.url) {
      const absolute = this.url.includes(':/') || this.url.startsWith('/');
      const url = absolute ? this.url : "./".concat(this.url);
      worker = new NodeWorker(url, {
        eval: false
      });
    } else if (this.source) {
      worker = new NodeWorker(this.source, {
        eval: true
      });
    } else {
      throw new Error('no worker');
    }
    worker.on('message', data => {
      this.onMessage(data);
    });
    worker.on('error', error => {
      this.onError(error);
    });
    worker.on('exit', code => {});
    return worker;
  }
}
//# sourceMappingURL=worker-thread.js.map