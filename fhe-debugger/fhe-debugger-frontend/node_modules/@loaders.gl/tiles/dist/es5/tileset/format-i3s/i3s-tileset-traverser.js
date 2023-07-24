"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.I3STilesetTraverser = void 0;
var _regenerator = _interopRequireDefault(require("@babel/runtime/regenerator"));
var _asyncToGenerator2 = _interopRequireDefault(require("@babel/runtime/helpers/asyncToGenerator"));
var _classCallCheck2 = _interopRequireDefault(require("@babel/runtime/helpers/classCallCheck"));
var _createClass2 = _interopRequireDefault(require("@babel/runtime/helpers/createClass"));
var _assertThisInitialized2 = _interopRequireDefault(require("@babel/runtime/helpers/assertThisInitialized"));
var _inherits2 = _interopRequireDefault(require("@babel/runtime/helpers/inherits"));
var _possibleConstructorReturn2 = _interopRequireDefault(require("@babel/runtime/helpers/possibleConstructorReturn"));
var _getPrototypeOf2 = _interopRequireDefault(require("@babel/runtime/helpers/getPrototypeOf"));
var _defineProperty2 = _interopRequireDefault(require("@babel/runtime/helpers/defineProperty"));
var _core = require("@loaders.gl/core");
var _tilesetTraverser = require("../tileset-traverser");
var _i3sLod = require("../helpers/i3s-lod");
var _tile3d = require("../tile-3d");
var _i3sTileManager = require("./i3s-tile-manager");
function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); enumerableOnly && (symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; })), keys.push.apply(keys, symbols); } return keys; }
function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = null != arguments[i] ? arguments[i] : {}; i % 2 ? ownKeys(Object(source), !0).forEach(function (key) { (0, _defineProperty2.default)(target, key, source[key]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)) : ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } return target; }
function _createForOfIteratorHelper(o, allowArrayLike) { var it = typeof Symbol !== "undefined" && o[Symbol.iterator] || o["@@iterator"]; if (!it) { if (Array.isArray(o) || (it = _unsupportedIterableToArray(o)) || allowArrayLike && o && typeof o.length === "number") { if (it) o = it; var i = 0; var F = function F() {}; return { s: F, n: function n() { if (i >= o.length) return { done: true }; return { done: false, value: o[i++] }; }, e: function e(_e) { throw _e; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var normalCompletion = true, didErr = false, err; return { s: function s() { it = it.call(o); }, n: function n() { var step = it.next(); normalCompletion = step.done; return step; }, e: function e(_e2) { didErr = true; err = _e2; }, f: function f() { try { if (!normalCompletion && it.return != null) it.return(); } finally { if (didErr) throw err; } } }; }
function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }
function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) arr2[i] = arr[i]; return arr2; }
function _createSuper(Derived) { var hasNativeReflectConstruct = _isNativeReflectConstruct(); return function _createSuperInternal() { var Super = (0, _getPrototypeOf2.default)(Derived), result; if (hasNativeReflectConstruct) { var NewTarget = (0, _getPrototypeOf2.default)(this).constructor; result = Reflect.construct(Super, arguments, NewTarget); } else { result = Super.apply(this, arguments); } return (0, _possibleConstructorReturn2.default)(this, result); }; }
function _isNativeReflectConstruct() { if (typeof Reflect === "undefined" || !Reflect.construct) return false; if (Reflect.construct.sham) return false; if (typeof Proxy === "function") return true; try { Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], function () {})); return true; } catch (e) { return false; } }
var I3STilesetTraverser = function (_TilesetTraverser) {
  (0, _inherits2.default)(I3STilesetTraverser, _TilesetTraverser);
  var _super = _createSuper(I3STilesetTraverser);
  function I3STilesetTraverser(options) {
    var _this;
    (0, _classCallCheck2.default)(this, I3STilesetTraverser);
    _this = _super.call(this, options);
    (0, _defineProperty2.default)((0, _assertThisInitialized2.default)(_this), "_tileManager", void 0);
    _this._tileManager = new _i3sTileManager.I3STileManager();
    return _this;
  }
  (0, _createClass2.default)(I3STilesetTraverser, [{
    key: "traversalFinished",
    value: function traversalFinished(frameState) {
      return !this._tileManager.hasPendingTiles(frameState.viewport.id, this._frameNumber || 0);
    }
  }, {
    key: "shouldRefine",
    value: function shouldRefine(tile, frameState) {
      tile._lodJudge = (0, _i3sLod.getLodStatus)(tile, frameState);
      return tile._lodJudge === 'DIG';
    }
  }, {
    key: "updateChildTiles",
    value: function updateChildTiles(tile, frameState) {
      var _this2 = this;
      var children = tile.header.children || [];
      var childTiles = tile.children;
      var tileset = tile.tileset;
      var _iterator = _createForOfIteratorHelper(children),
        _step;
      try {
        var _loop = function _loop() {
          var child = _step.value;
          var extendedId = "".concat(child.id, "-").concat(frameState.viewport.id);
          var childTile = childTiles && childTiles.find(function (t) {
            return t.id === extendedId;
          });
          if (!childTile) {
            var request = function request() {
              return _this2._loadTile(child.id, tileset);
            };
            var cachedRequest = _this2._tileManager.find(extendedId);
            if (!cachedRequest) {
              if (tileset.tileset.nodePages) {
                request = function request() {
                  return tileset.tileset.nodePagesTile.formTileFromNodePages(child.id);
                };
              }
              _this2._tileManager.add(request, extendedId, function (header) {
                return _this2._onTileLoad(header, tile, extendedId);
              }, frameState);
            } else {
              _this2._tileManager.update(extendedId, frameState);
            }
          } else if (childTile) {
            _this2.updateTile(childTile, frameState);
          }
        };
        for (_iterator.s(); !(_step = _iterator.n()).done;) {
          _loop();
        }
      } catch (err) {
        _iterator.e(err);
      } finally {
        _iterator.f();
      }
      return false;
    }
  }, {
    key: "_loadTile",
    value: function () {
      var _loadTile2 = (0, _asyncToGenerator2.default)(_regenerator.default.mark(function _callee(nodeId, tileset) {
        var loader, nodeUrl, options;
        return _regenerator.default.wrap(function _callee$(_context) {
          while (1) switch (_context.prev = _context.next) {
            case 0:
              loader = tileset.loader;
              nodeUrl = tileset.getTileUrl("".concat(tileset.url, "/nodes/").concat(nodeId));
              options = _objectSpread(_objectSpread({}, tileset.loadOptions), {}, {
                i3s: _objectSpread(_objectSpread({}, tileset.loadOptions.i3s), {}, {
                  isTileHeader: true
                })
              });
              _context.next = 5;
              return (0, _core.load)(nodeUrl, loader, options);
            case 5:
              return _context.abrupt("return", _context.sent);
            case 6:
            case "end":
              return _context.stop();
          }
        }, _callee);
      }));
      function _loadTile(_x, _x2) {
        return _loadTile2.apply(this, arguments);
      }
      return _loadTile;
    }()
  }, {
    key: "_onTileLoad",
    value: function _onTileLoad(header, tile, extendedId) {
      var childTile = new _tile3d.Tile3D(tile.tileset, header, tile, extendedId);
      tile.children.push(childTile);
      var frameState = this._tileManager.find(childTile.id).frameState;
      this.updateTile(childTile, frameState);
      if (this._frameNumber === frameState.frameNumber && (this.traversalFinished(frameState) || new Date().getTime() - this.lastUpdate > this.updateDebounceTime)) {
        this.executeTraversal(childTile, frameState);
      }
    }
  }]);
  return I3STilesetTraverser;
}(_tilesetTraverser.TilesetTraverser);
exports.I3STilesetTraverser = I3STilesetTraverser;
//# sourceMappingURL=i3s-tileset-traverser.js.map