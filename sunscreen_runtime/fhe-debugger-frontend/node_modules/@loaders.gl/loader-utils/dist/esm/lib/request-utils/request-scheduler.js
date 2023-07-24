import _defineProperty from "@babel/runtime/helpers/esm/defineProperty";
import { Stats } from '@probe.gl/stats';
const STAT_QUEUED_REQUESTS = 'Queued Requests';
const STAT_ACTIVE_REQUESTS = 'Active Requests';
const STAT_CANCELLED_REQUESTS = 'Cancelled Requests';
const STAT_QUEUED_REQUESTS_EVER = 'Queued Requests Ever';
const STAT_ACTIVE_REQUESTS_EVER = 'Active Requests Ever';
const DEFAULT_PROPS = {
  id: 'request-scheduler',
  throttleRequests: true,
  maxRequests: 6
};
export default class RequestScheduler {
  constructor() {
    let props = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
    _defineProperty(this, "props", void 0);
    _defineProperty(this, "stats", void 0);
    _defineProperty(this, "activeRequestCount", 0);
    _defineProperty(this, "requestQueue", []);
    _defineProperty(this, "requestMap", new Map());
    _defineProperty(this, "deferredUpdate", null);
    this.props = {
      ...DEFAULT_PROPS,
      ...props
    };
    this.stats = new Stats({
      id: this.props.id
    });
    this.stats.get(STAT_QUEUED_REQUESTS);
    this.stats.get(STAT_ACTIVE_REQUESTS);
    this.stats.get(STAT_CANCELLED_REQUESTS);
    this.stats.get(STAT_QUEUED_REQUESTS_EVER);
    this.stats.get(STAT_ACTIVE_REQUESTS_EVER);
  }
  scheduleRequest(handle) {
    let getPriority = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : () => 0;
    if (!this.props.throttleRequests) {
      return Promise.resolve({
        done: () => {}
      });
    }
    if (this.requestMap.has(handle)) {
      return this.requestMap.get(handle);
    }
    const request = {
      handle,
      priority: 0,
      getPriority
    };
    const promise = new Promise(resolve => {
      request.resolve = resolve;
      return request;
    });
    this.requestQueue.push(request);
    this.requestMap.set(handle, promise);
    this._issueNewRequests();
    return promise;
  }
  _issueRequest(request) {
    const {
      handle,
      resolve
    } = request;
    let isDone = false;
    const done = () => {
      if (!isDone) {
        isDone = true;
        this.requestMap.delete(handle);
        this.activeRequestCount--;
        this._issueNewRequests();
      }
    };
    this.activeRequestCount++;
    return resolve ? resolve({
      done
    }) : Promise.resolve({
      done
    });
  }
  _issueNewRequests() {
    if (!this.deferredUpdate) {
      this.deferredUpdate = setTimeout(() => this._issueNewRequestsAsync(), 0);
    }
  }
  _issueNewRequestsAsync() {
    this.deferredUpdate = null;
    const freeSlots = Math.max(this.props.maxRequests - this.activeRequestCount, 0);
    if (freeSlots === 0) {
      return;
    }
    this._updateAllRequests();
    for (let i = 0; i < freeSlots; ++i) {
      const request = this.requestQueue.shift();
      if (request) {
        this._issueRequest(request);
      }
    }
  }
  _updateAllRequests() {
    const requestQueue = this.requestQueue;
    for (let i = 0; i < requestQueue.length; ++i) {
      const request = requestQueue[i];
      if (!this._updateRequest(request)) {
        requestQueue.splice(i, 1);
        this.requestMap.delete(request.handle);
        i--;
      }
    }
    requestQueue.sort((a, b) => a.priority - b.priority);
  }
  _updateRequest(request) {
    request.priority = request.getPriority(request.handle);
    if (request.priority < 0) {
      request.resolve(null);
      return false;
    }
    return true;
  }
}
//# sourceMappingURL=request-scheduler.js.map