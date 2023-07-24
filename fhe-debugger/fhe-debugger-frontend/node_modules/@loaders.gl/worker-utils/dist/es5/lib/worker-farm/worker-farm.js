"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _classCallCheck2 = _interopRequireDefault(require("@babel/runtime/helpers/classCallCheck"));
var _createClass2 = _interopRequireDefault(require("@babel/runtime/helpers/createClass"));
var _defineProperty2 = _interopRequireDefault(require("@babel/runtime/helpers/defineProperty"));
var _workerPool = _interopRequireDefault(require("./worker-pool"));
var _workerThread = _interopRequireDefault(require("./worker-thread"));
function _createForOfIteratorHelper(o, allowArrayLike) { var it = typeof Symbol !== "undefined" && o[Symbol.iterator] || o["@@iterator"]; if (!it) { if (Array.isArray(o) || (it = _unsupportedIterableToArray(o)) || allowArrayLike && o && typeof o.length === "number") { if (it) o = it; var i = 0; var F = function F() {}; return { s: F, n: function n() { if (i >= o.length) return { done: true }; return { done: false, value: o[i++] }; }, e: function e(_e) { throw _e; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var normalCompletion = true, didErr = false, err; return { s: function s() { it = it.call(o); }, n: function n() { var step = it.next(); normalCompletion = step.done; return step; }, e: function e(_e2) { didErr = true; err = _e2; }, f: function f() { try { if (!normalCompletion && it.return != null) it.return(); } finally { if (didErr) throw err; } } }; }
function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }
function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) arr2[i] = arr[i]; return arr2; }
function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); enumerableOnly && (symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; })), keys.push.apply(keys, symbols); } return keys; }
function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = null != arguments[i] ? arguments[i] : {}; i % 2 ? ownKeys(Object(source), !0).forEach(function (key) { (0, _defineProperty2.default)(target, key, source[key]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)) : ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } return target; }
var DEFAULT_PROPS = {
  maxConcurrency: 3,
  maxMobileConcurrency: 1,
  reuseWorkers: true,
  onDebug: function onDebug() {}
};
var WorkerFarm = function () {
  function WorkerFarm(props) {
    (0, _classCallCheck2.default)(this, WorkerFarm);
    (0, _defineProperty2.default)(this, "props", void 0);
    (0, _defineProperty2.default)(this, "workerPools", new Map());
    this.props = _objectSpread({}, DEFAULT_PROPS);
    this.setProps(props);
    this.workerPools = new Map();
  }
  (0, _createClass2.default)(WorkerFarm, [{
    key: "destroy",
    value: function destroy() {
      var _iterator = _createForOfIteratorHelper(this.workerPools.values()),
        _step;
      try {
        for (_iterator.s(); !(_step = _iterator.n()).done;) {
          var workerPool = _step.value;
          workerPool.destroy();
        }
      } catch (err) {
        _iterator.e(err);
      } finally {
        _iterator.f();
      }
      this.workerPools = new Map();
    }
  }, {
    key: "setProps",
    value: function setProps(props) {
      this.props = _objectSpread(_objectSpread({}, this.props), props);
      var _iterator2 = _createForOfIteratorHelper(this.workerPools.values()),
        _step2;
      try {
        for (_iterator2.s(); !(_step2 = _iterator2.n()).done;) {
          var workerPool = _step2.value;
          workerPool.setProps(this._getWorkerPoolProps());
        }
      } catch (err) {
        _iterator2.e(err);
      } finally {
        _iterator2.f();
      }
    }
  }, {
    key: "getWorkerPool",
    value: function getWorkerPool(options) {
      var name = options.name,
        source = options.source,
        url = options.url;
      var workerPool = this.workerPools.get(name);
      if (!workerPool) {
        workerPool = new _workerPool.default({
          name: name,
          source: source,
          url: url
        });
        workerPool.setProps(this._getWorkerPoolProps());
        this.workerPools.set(name, workerPool);
      }
      return workerPool;
    }
  }, {
    key: "_getWorkerPoolProps",
    value: function _getWorkerPoolProps() {
      return {
        maxConcurrency: this.props.maxConcurrency,
        maxMobileConcurrency: this.props.maxMobileConcurrency,
        reuseWorkers: this.props.reuseWorkers,
        onDebug: this.props.onDebug
      };
    }
  }], [{
    key: "isSupported",
    value: function isSupported() {
      return _workerThread.default.isSupported();
    }
  }, {
    key: "getWorkerFarm",
    value: function getWorkerFarm() {
      var props = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
      WorkerFarm._workerFarm = WorkerFarm._workerFarm || new WorkerFarm({});
      WorkerFarm._workerFarm.setProps(props);
      return WorkerFarm._workerFarm;
    }
  }]);
  return WorkerFarm;
}();
exports.default = WorkerFarm;
(0, _defineProperty2.default)(WorkerFarm, "_workerFarm", void 0);
//# sourceMappingURL=worker-farm.js.map