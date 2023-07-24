"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.I3STileManager = void 0;
var _classCallCheck2 = _interopRequireDefault(require("@babel/runtime/helpers/classCallCheck"));
var _createClass2 = _interopRequireDefault(require("@babel/runtime/helpers/createClass"));
var _defineProperty2 = _interopRequireDefault(require("@babel/runtime/helpers/defineProperty"));
var _i3sPendingTilesRegister = require("./i3s-pending-tiles-register");
var STATUS = {
  REQUESTED: 'REQUESTED',
  COMPLETED: 'COMPLETED',
  ERROR: 'ERROR'
};
var I3STileManager = function () {
  function I3STileManager() {
    (0, _classCallCheck2.default)(this, I3STileManager);
    (0, _defineProperty2.default)(this, "_statusMap", void 0);
    (0, _defineProperty2.default)(this, "pendingTilesRegister", new _i3sPendingTilesRegister.I3SPendingTilesRegister());
    this._statusMap = {};
  }
  (0, _createClass2.default)(I3STileManager, [{
    key: "add",
    value: function add(request, key, callback, frameState) {
      var _this = this;
      if (!this._statusMap[key]) {
        var frameNumber = frameState.frameNumber,
          id = frameState.viewport.id;
        this._statusMap[key] = {
          request: request,
          callback: callback,
          key: key,
          frameState: frameState,
          status: STATUS.REQUESTED
        };
        this.pendingTilesRegister.register(id, frameNumber);
        request().then(function (data) {
          _this._statusMap[key].status = STATUS.COMPLETED;
          var _this$_statusMap$key$ = _this._statusMap[key].frameState,
            actualFrameNumber = _this$_statusMap$key$.frameNumber,
            id = _this$_statusMap$key$.viewport.id;
          _this.pendingTilesRegister.deregister(id, actualFrameNumber);
          _this._statusMap[key].callback(data, frameState);
        }).catch(function (error) {
          _this._statusMap[key].status = STATUS.ERROR;
          var _this$_statusMap$key$2 = _this._statusMap[key].frameState,
            actualFrameNumber = _this$_statusMap$key$2.frameNumber,
            id = _this$_statusMap$key$2.viewport.id;
          _this.pendingTilesRegister.deregister(id, actualFrameNumber);
          callback(error);
        });
      }
    }
  }, {
    key: "update",
    value: function update(key, frameState) {
      if (this._statusMap[key]) {
        var _this$_statusMap$key$3 = this._statusMap[key].frameState,
          frameNumber = _this$_statusMap$key$3.frameNumber,
          id = _this$_statusMap$key$3.viewport.id;
        this.pendingTilesRegister.deregister(id, frameNumber);
        var newFrameNumber = frameState.frameNumber,
          newViewportId = frameState.viewport.id;
        this.pendingTilesRegister.register(newViewportId, newFrameNumber);
        this._statusMap[key].frameState = frameState;
      }
    }
  }, {
    key: "find",
    value: function find(key) {
      return this._statusMap[key];
    }
  }, {
    key: "hasPendingTiles",
    value: function hasPendingTiles(viewportId, frameNumber) {
      return !this.pendingTilesRegister.isZero(viewportId, frameNumber);
    }
  }]);
  return I3STileManager;
}();
exports.I3STileManager = I3STileManager;
//# sourceMappingURL=i3s-tile-manager.js.map