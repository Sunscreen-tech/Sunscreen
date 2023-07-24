"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.parentPort = exports.Worker = exports.NodeWorkerType = exports.NodeWorker = void 0;
var _classCallCheck2 = _interopRequireDefault(require("@babel/runtime/helpers/classCallCheck"));
var _createClass2 = _interopRequireDefault(require("@babel/runtime/helpers/createClass"));
var Worker = function () {
  function Worker() {
    (0, _classCallCheck2.default)(this, Worker);
  }
  (0, _createClass2.default)(Worker, [{
    key: "terminate",
    value: function terminate() {}
  }]);
  return Worker;
}();
exports.NodeWorkerType = exports.NodeWorker = exports.Worker = Worker;
var parentPort = null;
exports.parentPort = parentPort;
//# sourceMappingURL=worker_threads-browser.js.map