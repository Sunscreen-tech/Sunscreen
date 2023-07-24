import _defineProperty from "@babel/runtime/helpers/esm/defineProperty";
import WorkerPool from './worker-pool';
import WorkerThread from './worker-thread';
const DEFAULT_PROPS = {
  maxConcurrency: 3,
  maxMobileConcurrency: 1,
  reuseWorkers: true,
  onDebug: () => {}
};
export default class WorkerFarm {
  static isSupported() {
    return WorkerThread.isSupported();
  }
  static getWorkerFarm() {
    let props = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
    WorkerFarm._workerFarm = WorkerFarm._workerFarm || new WorkerFarm({});
    WorkerFarm._workerFarm.setProps(props);
    return WorkerFarm._workerFarm;
  }
  constructor(props) {
    _defineProperty(this, "props", void 0);
    _defineProperty(this, "workerPools", new Map());
    this.props = {
      ...DEFAULT_PROPS
    };
    this.setProps(props);
    this.workerPools = new Map();
  }
  destroy() {
    for (const workerPool of this.workerPools.values()) {
      workerPool.destroy();
    }
    this.workerPools = new Map();
  }
  setProps(props) {
    this.props = {
      ...this.props,
      ...props
    };
    for (const workerPool of this.workerPools.values()) {
      workerPool.setProps(this._getWorkerPoolProps());
    }
  }
  getWorkerPool(options) {
    const {
      name,
      source,
      url
    } = options;
    let workerPool = this.workerPools.get(name);
    if (!workerPool) {
      workerPool = new WorkerPool({
        name,
        source,
        url
      });
      workerPool.setProps(this._getWorkerPoolProps());
      this.workerPools.set(name, workerPool);
    }
    return workerPool;
  }
  _getWorkerPoolProps() {
    return {
      maxConcurrency: this.props.maxConcurrency,
      maxMobileConcurrency: this.props.maxMobileConcurrency,
      reuseWorkers: this.props.reuseWorkers,
      onDebug: this.props.onDebug
    };
  }
}
_defineProperty(WorkerFarm, "_workerFarm", void 0);
//# sourceMappingURL=worker-farm.js.map