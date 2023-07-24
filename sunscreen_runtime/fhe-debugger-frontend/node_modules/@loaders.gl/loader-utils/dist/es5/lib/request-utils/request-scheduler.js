"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _classCallCheck2 = _interopRequireDefault(require("@babel/runtime/helpers/classCallCheck"));
var _createClass2 = _interopRequireDefault(require("@babel/runtime/helpers/createClass"));
var _defineProperty2 = _interopRequireDefault(require("@babel/runtime/helpers/defineProperty"));
var _stats = require("@probe.gl/stats");
function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); enumerableOnly && (symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; })), keys.push.apply(keys, symbols); } return keys; }
function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = null != arguments[i] ? arguments[i] : {}; i % 2 ? ownKeys(Object(source), !0).forEach(function (key) { (0, _defineProperty2.default)(target, key, source[key]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)) : ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } return target; }
var STAT_QUEUED_REQUESTS = 'Queued Requests';
var STAT_ACTIVE_REQUESTS = 'Active Requests';
var STAT_CANCELLED_REQUESTS = 'Cancelled Requests';
var STAT_QUEUED_REQUESTS_EVER = 'Queued Requests Ever';
var STAT_ACTIVE_REQUESTS_EVER = 'Active Requests Ever';
var DEFAULT_PROPS = {
  id: 'request-scheduler',
  throttleRequests: true,
  maxRequests: 6
};
var RequestScheduler = function () {
  function RequestScheduler() {
    var props = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
    (0, _classCallCheck2.default)(this, RequestScheduler);
    (0, _defineProperty2.default)(this, "props", void 0);
    (0, _defineProperty2.default)(this, "stats", void 0);
    (0, _defineProperty2.default)(this, "activeRequestCount", 0);
    (0, _defineProperty2.default)(this, "requestQueue", []);
    (0, _defineProperty2.default)(this, "requestMap", new Map());
    (0, _defineProperty2.default)(this, "deferredUpdate", null);
    this.props = _objectSpread(_objectSpread({}, DEFAULT_PROPS), props);
    this.stats = new _stats.Stats({
      id: this.props.id
    });
    this.stats.get(STAT_QUEUED_REQUESTS);
    this.stats.get(STAT_ACTIVE_REQUESTS);
    this.stats.get(STAT_CANCELLED_REQUESTS);
    this.stats.get(STAT_QUEUED_REQUESTS_EVER);
    this.stats.get(STAT_ACTIVE_REQUESTS_EVER);
  }
  (0, _createClass2.default)(RequestScheduler, [{
    key: "scheduleRequest",
    value: function scheduleRequest(handle) {
      var getPriority = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : function () {
        return 0;
      };
      if (!this.props.throttleRequests) {
        return Promise.resolve({
          done: function done() {}
        });
      }
      if (this.requestMap.has(handle)) {
        return this.requestMap.get(handle);
      }
      var request = {
        handle: handle,
        priority: 0,
        getPriority: getPriority
      };
      var promise = new Promise(function (resolve) {
        request.resolve = resolve;
        return request;
      });
      this.requestQueue.push(request);
      this.requestMap.set(handle, promise);
      this._issueNewRequests();
      return promise;
    }
  }, {
    key: "_issueRequest",
    value: function _issueRequest(request) {
      var _this = this;
      var handle = request.handle,
        resolve = request.resolve;
      var isDone = false;
      var done = function done() {
        if (!isDone) {
          isDone = true;
          _this.requestMap.delete(handle);
          _this.activeRequestCount--;
          _this._issueNewRequests();
        }
      };
      this.activeRequestCount++;
      return resolve ? resolve({
        done: done
      }) : Promise.resolve({
        done: done
      });
    }
  }, {
    key: "_issueNewRequests",
    value: function _issueNewRequests() {
      var _this2 = this;
      if (!this.deferredUpdate) {
        this.deferredUpdate = setTimeout(function () {
          return _this2._issueNewRequestsAsync();
        }, 0);
      }
    }
  }, {
    key: "_issueNewRequestsAsync",
    value: function _issueNewRequestsAsync() {
      this.deferredUpdate = null;
      var freeSlots = Math.max(this.props.maxRequests - this.activeRequestCount, 0);
      if (freeSlots === 0) {
        return;
      }
      this._updateAllRequests();
      for (var i = 0; i < freeSlots; ++i) {
        var request = this.requestQueue.shift();
        if (request) {
          this._issueRequest(request);
        }
      }
    }
  }, {
    key: "_updateAllRequests",
    value: function _updateAllRequests() {
      var requestQueue = this.requestQueue;
      for (var i = 0; i < requestQueue.length; ++i) {
        var request = requestQueue[i];
        if (!this._updateRequest(request)) {
          requestQueue.splice(i, 1);
          this.requestMap.delete(request.handle);
          i--;
        }
      }
      requestQueue.sort(function (a, b) {
        return a.priority - b.priority;
      });
    }
  }, {
    key: "_updateRequest",
    value: function _updateRequest(request) {
      request.priority = request.getPriority(request.handle);
      if (request.priority < 0) {
        request.resolve(null);
        return false;
      }
      return true;
    }
  }]);
  return RequestScheduler;
}();
exports.default = RequestScheduler;
//# sourceMappingURL=request-scheduler.js.map