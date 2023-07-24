"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _classCallCheck2 = _interopRequireDefault(require("@babel/runtime/helpers/classCallCheck"));

var _createClass2 = _interopRequireDefault(require("@babel/runtime/helpers/createClass"));

var _inherits2 = _interopRequireDefault(require("@babel/runtime/helpers/inherits"));

var _possibleConstructorReturn2 = _interopRequireDefault(require("@babel/runtime/helpers/possibleConstructorReturn"));

var _getPrototypeOf2 = _interopRequireDefault(require("@babel/runtime/helpers/getPrototypeOf"));

var _defineProperty2 = _interopRequireDefault(require("@babel/runtime/helpers/defineProperty"));

var _core = require("@luma.gl/core");

var _core2 = require("@deck.gl/core");

var _columnLayer = _interopRequireDefault(require("./column-layer"));

function _createSuper(Derived) { var hasNativeReflectConstruct = _isNativeReflectConstruct(); return function _createSuperInternal() { var Super = (0, _getPrototypeOf2.default)(Derived), result; if (hasNativeReflectConstruct) { var NewTarget = (0, _getPrototypeOf2.default)(this).constructor; result = Reflect.construct(Super, arguments, NewTarget); } else { result = Super.apply(this, arguments); } return (0, _possibleConstructorReturn2.default)(this, result); }; }

function _isNativeReflectConstruct() { if (typeof Reflect === "undefined" || !Reflect.construct) return false; if (Reflect.construct.sham) return false; if (typeof Proxy === "function") return true; try { Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], function () {})); return true; } catch (e) { return false; } }

var defaultProps = {
  cellSize: {
    type: 'number',
    min: 0,
    value: 1000
  },
  offset: {
    type: 'array',
    value: [1, 1]
  }
};

var GridCellLayer = function (_ColumnLayer) {
  (0, _inherits2.default)(GridCellLayer, _ColumnLayer);

  var _super = _createSuper(GridCellLayer);

  function GridCellLayer() {
    (0, _classCallCheck2.default)(this, GridCellLayer);
    return _super.apply(this, arguments);
  }

  (0, _createClass2.default)(GridCellLayer, [{
    key: "getGeometry",
    value: function getGeometry(diskResolution) {
      return new _core.CubeGeometry();
    }
  }, {
    key: "draw",
    value: function draw(_ref) {
      var uniforms = _ref.uniforms;
      var _this$props = this.props,
          elevationScale = _this$props.elevationScale,
          extruded = _this$props.extruded,
          offset = _this$props.offset,
          coverage = _this$props.coverage,
          cellSize = _this$props.cellSize,
          angle = _this$props.angle,
          radiusUnits = _this$props.radiusUnits;
      this.state.model.setUniforms(uniforms).setUniforms({
        radius: cellSize / 2,
        radiusUnits: _core2.UNIT[radiusUnits],
        angle: angle,
        offset: offset,
        extruded: extruded,
        coverage: coverage,
        elevationScale: elevationScale,
        edgeDistance: 1,
        isWireframe: false
      }).draw();
    }
  }]);
  return GridCellLayer;
}(_columnLayer.default);

exports.default = GridCellLayer;
(0, _defineProperty2.default)(GridCellLayer, "layerName", 'GridCellLayer');
(0, _defineProperty2.default)(GridCellLayer, "defaultProps", defaultProps);
//# sourceMappingURL=grid-cell-layer.js.map