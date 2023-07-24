"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.I3SPendingTilesRegister = void 0;
var _classCallCheck2 = _interopRequireDefault(require("@babel/runtime/helpers/classCallCheck"));
var _createClass2 = _interopRequireDefault(require("@babel/runtime/helpers/createClass"));
var _defineProperty2 = _interopRequireDefault(require("@babel/runtime/helpers/defineProperty"));
var I3SPendingTilesRegister = function () {
  function I3SPendingTilesRegister() {
    (0, _classCallCheck2.default)(this, I3SPendingTilesRegister);
    (0, _defineProperty2.default)(this, "frameNumberMap", new Map());
  }
  (0, _createClass2.default)(I3SPendingTilesRegister, [{
    key: "register",
    value: function register(viewportId, frameNumber) {
      var viewportMap = this.frameNumberMap.get(viewportId) || new Map();
      var oldCount = viewportMap.get(frameNumber) || 0;
      viewportMap.set(frameNumber, oldCount + 1);
      this.frameNumberMap.set(viewportId, viewportMap);
    }
  }, {
    key: "deregister",
    value: function deregister(viewportId, frameNumber) {
      var viewportMap = this.frameNumberMap.get(viewportId);
      if (!viewportMap) {
        return;
      }
      var oldCount = viewportMap.get(frameNumber) || 1;
      viewportMap.set(frameNumber, oldCount - 1);
    }
  }, {
    key: "isZero",
    value: function isZero(viewportId, frameNumber) {
      var _this$frameNumberMap$;
      var count = ((_this$frameNumberMap$ = this.frameNumberMap.get(viewportId)) === null || _this$frameNumberMap$ === void 0 ? void 0 : _this$frameNumberMap$.get(frameNumber)) || 0;
      return count === 0;
    }
  }]);
  return I3SPendingTilesRegister;
}();
exports.I3SPendingTilesRegister = I3SPendingTilesRegister;
//# sourceMappingURL=i3s-pending-tiles-register.js.map