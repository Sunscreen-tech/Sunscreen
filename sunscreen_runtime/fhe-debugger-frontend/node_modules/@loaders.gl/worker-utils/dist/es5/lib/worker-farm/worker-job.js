"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _classCallCheck2 = _interopRequireDefault(require("@babel/runtime/helpers/classCallCheck"));
var _createClass2 = _interopRequireDefault(require("@babel/runtime/helpers/createClass"));
var _defineProperty2 = _interopRequireDefault(require("@babel/runtime/helpers/defineProperty"));
var _assert = require("../env-utils/assert");
var WorkerJob = function () {
  function WorkerJob(jobName, workerThread) {
    var _this = this;
    (0, _classCallCheck2.default)(this, WorkerJob);
    (0, _defineProperty2.default)(this, "name", void 0);
    (0, _defineProperty2.default)(this, "workerThread", void 0);
    (0, _defineProperty2.default)(this, "isRunning", true);
    (0, _defineProperty2.default)(this, "result", void 0);
    (0, _defineProperty2.default)(this, "_resolve", function () {});
    (0, _defineProperty2.default)(this, "_reject", function () {});
    this.name = jobName;
    this.workerThread = workerThread;
    this.result = new Promise(function (resolve, reject) {
      _this._resolve = resolve;
      _this._reject = reject;
    });
  }
  (0, _createClass2.default)(WorkerJob, [{
    key: "postMessage",
    value: function postMessage(type, payload) {
      this.workerThread.postMessage({
        source: 'loaders.gl',
        type: type,
        payload: payload
      });
    }
  }, {
    key: "done",
    value: function done(value) {
      (0, _assert.assert)(this.isRunning);
      this.isRunning = false;
      this._resolve(value);
    }
  }, {
    key: "error",
    value: function error(_error) {
      (0, _assert.assert)(this.isRunning);
      this.isRunning = false;
      this._reject(_error);
    }
  }]);
  return WorkerJob;
}();
exports.default = WorkerJob;
//# sourceMappingURL=worker-job.js.map