"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Tileset3DTraverser = void 0;
var _classCallCheck2 = _interopRequireDefault(require("@babel/runtime/helpers/classCallCheck"));
var _createClass2 = _interopRequireDefault(require("@babel/runtime/helpers/createClass"));
var _get2 = _interopRequireDefault(require("@babel/runtime/helpers/get"));
var _inherits2 = _interopRequireDefault(require("@babel/runtime/helpers/inherits"));
var _possibleConstructorReturn2 = _interopRequireDefault(require("@babel/runtime/helpers/possibleConstructorReturn"));
var _getPrototypeOf2 = _interopRequireDefault(require("@babel/runtime/helpers/getPrototypeOf"));
var _constants = require("../../constants");
var _tilesetTraverser = require("../tileset-traverser");
function _createSuper(Derived) { var hasNativeReflectConstruct = _isNativeReflectConstruct(); return function _createSuperInternal() { var Super = (0, _getPrototypeOf2.default)(Derived), result; if (hasNativeReflectConstruct) { var NewTarget = (0, _getPrototypeOf2.default)(this).constructor; result = Reflect.construct(Super, arguments, NewTarget); } else { result = Super.apply(this, arguments); } return (0, _possibleConstructorReturn2.default)(this, result); }; }
function _isNativeReflectConstruct() { if (typeof Reflect === "undefined" || !Reflect.construct) return false; if (Reflect.construct.sham) return false; if (typeof Proxy === "function") return true; try { Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], function () {})); return true; } catch (e) { return false; } }
var Tileset3DTraverser = function (_TilesetTraverser) {
  (0, _inherits2.default)(Tileset3DTraverser, _TilesetTraverser);
  var _super = _createSuper(Tileset3DTraverser);
  function Tileset3DTraverser() {
    (0, _classCallCheck2.default)(this, Tileset3DTraverser);
    return _super.apply(this, arguments);
  }
  (0, _createClass2.default)(Tileset3DTraverser, [{
    key: "compareDistanceToCamera",
    value: function compareDistanceToCamera(a, b) {
      return b._distanceToCamera === 0 && a._distanceToCamera === 0 ? b._centerZDepth - a._centerZDepth : b._distanceToCamera - a._distanceToCamera;
    }
  }, {
    key: "updateTileVisibility",
    value: function updateTileVisibility(tile, frameState) {
      (0, _get2.default)((0, _getPrototypeOf2.default)(Tileset3DTraverser.prototype), "updateTileVisibility", this).call(this, tile, frameState);
      if (!tile.isVisibleAndInRequestVolume) {
        return;
      }
      var hasChildren = tile.children.length > 0;
      if (tile.hasTilesetContent && hasChildren) {
        var firstChild = tile.children[0];
        this.updateTileVisibility(firstChild, frameState);
        tile._visible = firstChild._visible;
        return;
      }
      if (this.meetsScreenSpaceErrorEarly(tile, frameState)) {
        tile._visible = false;
        return;
      }
      var replace = tile.refine === _constants.TILE_REFINEMENT.REPLACE;
      var useOptimization = tile._optimChildrenWithinParent === _constants.TILE3D_OPTIMIZATION_HINT.USE_OPTIMIZATION;
      if (replace && useOptimization && hasChildren) {
        if (!this.anyChildrenVisible(tile, frameState)) {
          tile._visible = false;
          return;
        }
      }
    }
  }, {
    key: "meetsScreenSpaceErrorEarly",
    value: function meetsScreenSpaceErrorEarly(tile, frameState) {
      var parent = tile.parent;
      if (!parent || parent.hasTilesetContent || parent.refine !== _constants.TILE_REFINEMENT.ADD) {
        return false;
      }
      return !this.shouldRefine(tile, frameState, true);
    }
  }]);
  return Tileset3DTraverser;
}(_tilesetTraverser.TilesetTraverser);
exports.Tileset3DTraverser = Tileset3DTraverser;
//# sourceMappingURL=tileset-3d-traverser.js.map