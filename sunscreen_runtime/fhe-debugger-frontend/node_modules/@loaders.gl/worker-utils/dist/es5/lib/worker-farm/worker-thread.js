"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _classCallCheck2 = _interopRequireDefault(require("@babel/runtime/helpers/classCallCheck"));
var _createClass2 = _interopRequireDefault(require("@babel/runtime/helpers/createClass"));
var _defineProperty2 = _interopRequireDefault(require("@babel/runtime/helpers/defineProperty"));
var _worker_threads = require("../node/worker_threads");
var _globals = require("../env-utils/globals");
var _assert = require("../env-utils/assert");
var _getLoadableWorkerUrl = require("../worker-utils/get-loadable-worker-url");
var _getTransferList = require("../worker-utils/get-transfer-list");
var NOOP = function NOOP() {};
var WorkerThread = function () {
  function WorkerThread(props) {
    (0, _classCallCheck2.default)(this, WorkerThread);
    (0, _defineProperty2.default)(this, "name", void 0);
    (0, _defineProperty2.default)(this, "source", void 0);
    (0, _defineProperty2.default)(this, "url", void 0);
    (0, _defineProperty2.default)(this, "terminated", false);
    (0, _defineProperty2.default)(this, "worker", void 0);
    (0, _defineProperty2.default)(this, "onMessage", void 0);
    (0, _defineProperty2.default)(this, "onError", void 0);
    (0, _defineProperty2.default)(this, "_loadableURL", '');
    var name = props.name,
      source = props.source,
      url = props.url;
    (0, _assert.assert)(source || url);
    this.name = name;
    this.source = source;
    this.url = url;
    this.onMessage = NOOP;
    this.onError = function (error) {
      return console.log(error);
    };
    this.worker = _globals.isBrowser ? this._createBrowserWorker() : this._createNodeWorker();
  }
  (0, _createClass2.default)(WorkerThread, [{
    key: "destroy",
    value: function destroy() {
      this.onMessage = NOOP;
      this.onError = NOOP;
      this.worker.terminate();
      this.terminated = true;
    }
  }, {
    key: "isRunning",
    get: function get() {
      return Boolean(this.onMessage);
    }
  }, {
    key: "postMessage",
    value: function postMessage(data, transferList) {
      transferList = transferList || (0, _getTransferList.getTransferList)(data);
      this.worker.postMessage(data, transferList);
    }
  }, {
    key: "_getErrorFromErrorEvent",
    value: function _getErrorFromErrorEvent(event) {
      var message = 'Failed to load ';
      message += "worker ".concat(this.name, " from ").concat(this.url, ". ");
      if (event.message) {
        message += "".concat(event.message, " in ");
      }
      if (event.lineno) {
        message += ":".concat(event.lineno, ":").concat(event.colno);
      }
      return new Error(message);
    }
  }, {
    key: "_createBrowserWorker",
    value: function _createBrowserWorker() {
      var _this = this;
      this._loadableURL = (0, _getLoadableWorkerUrl.getLoadableWorkerURL)({
        source: this.source,
        url: this.url
      });
      var worker = new Worker(this._loadableURL, {
        name: this.name
      });
      worker.onmessage = function (event) {
        if (!event.data) {
          _this.onError(new Error('No data received'));
        } else {
          _this.onMessage(event.data);
        }
      };
      worker.onerror = function (error) {
        _this.onError(_this._getErrorFromErrorEvent(error));
        _this.terminated = true;
      };
      worker.onmessageerror = function (event) {
        return console.error(event);
      };
      return worker;
    }
  }, {
    key: "_createNodeWorker",
    value: function _createNodeWorker() {
      var _this2 = this;
      var worker;
      if (this.url) {
        var absolute = this.url.includes(':/') || this.url.startsWith('/');
        var url = absolute ? this.url : "./".concat(this.url);
        worker = new _worker_threads.NodeWorker(url, {
          eval: false
        });
      } else if (this.source) {
        worker = new _worker_threads.NodeWorker(this.source, {
          eval: true
        });
      } else {
        throw new Error('no worker');
      }
      worker.on('message', function (data) {
        _this2.onMessage(data);
      });
      worker.on('error', function (error) {
        _this2.onError(error);
      });
      worker.on('exit', function (code) {});
      return worker;
    }
  }], [{
    key: "isSupported",
    value: function isSupported() {
      return typeof Worker !== 'undefined' && _globals.isBrowser || typeof _worker_threads.NodeWorker !== 'undefined' && !_globals.isBrowser;
    }
  }]);
  return WorkerThread;
}();
exports.default = WorkerThread;
//# sourceMappingURL=worker-thread.js.map