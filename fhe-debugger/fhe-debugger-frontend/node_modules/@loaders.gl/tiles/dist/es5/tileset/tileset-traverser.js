"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.TilesetTraverser = exports.DEFAULT_PROPS = void 0;
var _classCallCheck2 = _interopRequireDefault(require("@babel/runtime/helpers/classCallCheck"));
var _createClass2 = _interopRequireDefault(require("@babel/runtime/helpers/createClass"));
var _defineProperty2 = _interopRequireDefault(require("@babel/runtime/helpers/defineProperty"));
var _managedArray = require("../utils/managed-array");
var _constants = require("../constants");
function _createForOfIteratorHelper(o, allowArrayLike) { var it = typeof Symbol !== "undefined" && o[Symbol.iterator] || o["@@iterator"]; if (!it) { if (Array.isArray(o) || (it = _unsupportedIterableToArray(o)) || allowArrayLike && o && typeof o.length === "number") { if (it) o = it; var i = 0; var F = function F() {}; return { s: F, n: function n() { if (i >= o.length) return { done: true }; return { done: false, value: o[i++] }; }, e: function e(_e) { throw _e; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var normalCompletion = true, didErr = false, err; return { s: function s() { it = it.call(o); }, n: function n() { var step = it.next(); normalCompletion = step.done; return step; }, e: function e(_e2) { didErr = true; err = _e2; }, f: function f() { try { if (!normalCompletion && it.return != null) it.return(); } finally { if (didErr) throw err; } } }; }
function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }
function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) arr2[i] = arr[i]; return arr2; }
function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); enumerableOnly && (symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; })), keys.push.apply(keys, symbols); } return keys; }
function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = null != arguments[i] ? arguments[i] : {}; i % 2 ? ownKeys(Object(source), !0).forEach(function (key) { (0, _defineProperty2.default)(target, key, source[key]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)) : ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } return target; }
var DEFAULT_PROPS = {
  loadSiblings: false,
  skipLevelOfDetail: false,
  maximumScreenSpaceError: 2,
  updateTransforms: true,
  onTraversalEnd: function onTraversalEnd() {},
  viewportTraversersMap: {},
  basePath: ''
};
exports.DEFAULT_PROPS = DEFAULT_PROPS;
var TilesetTraverser = function () {
  function TilesetTraverser(options) {
    (0, _classCallCheck2.default)(this, TilesetTraverser);
    (0, _defineProperty2.default)(this, "options", void 0);
    (0, _defineProperty2.default)(this, "root", null);
    (0, _defineProperty2.default)(this, "selectedTiles", {});
    (0, _defineProperty2.default)(this, "requestedTiles", {});
    (0, _defineProperty2.default)(this, "emptyTiles", {});
    (0, _defineProperty2.default)(this, "lastUpdate", new Date().getTime());
    (0, _defineProperty2.default)(this, "updateDebounceTime", 1000);
    (0, _defineProperty2.default)(this, "_traversalStack", new _managedArray.ManagedArray());
    (0, _defineProperty2.default)(this, "_emptyTraversalStack", new _managedArray.ManagedArray());
    (0, _defineProperty2.default)(this, "_frameNumber", null);
    this.options = _objectSpread(_objectSpread({}, DEFAULT_PROPS), options);
  }
  (0, _createClass2.default)(TilesetTraverser, [{
    key: "traversalFinished",
    value: function traversalFinished(frameState) {
      return true;
    }
  }, {
    key: "traverse",
    value: function traverse(root, frameState, options) {
      this.root = root;
      this.options = _objectSpread(_objectSpread({}, this.options), options);
      this.reset();
      this.updateTile(root, frameState);
      this._frameNumber = frameState.frameNumber;
      this.executeTraversal(root, frameState);
    }
  }, {
    key: "reset",
    value: function reset() {
      this.requestedTiles = {};
      this.selectedTiles = {};
      this.emptyTiles = {};
      this._traversalStack.reset();
      this._emptyTraversalStack.reset();
    }
  }, {
    key: "executeTraversal",
    value: function executeTraversal(root, frameState) {
      var stack = this._traversalStack;
      root._selectionDepth = 1;
      stack.push(root);
      while (stack.length > 0) {
        var tile = stack.pop();
        var shouldRefine = false;
        if (this.canTraverse(tile, frameState)) {
          this.updateChildTiles(tile, frameState);
          shouldRefine = this.updateAndPushChildren(tile, frameState, stack, tile.hasRenderContent ? tile._selectionDepth + 1 : tile._selectionDepth);
        }
        var parent = tile.parent;
        var parentRefines = Boolean(!parent || parent._shouldRefine);
        var stoppedRefining = !shouldRefine;
        if (!tile.hasRenderContent) {
          this.emptyTiles[tile.id] = tile;
          this.loadTile(tile, frameState);
          if (stoppedRefining) {
            this.selectTile(tile, frameState);
          }
        } else if (tile.refine === _constants.TILE_REFINEMENT.ADD) {
          this.loadTile(tile, frameState);
          this.selectTile(tile, frameState);
        } else if (tile.refine === _constants.TILE_REFINEMENT.REPLACE) {
          this.loadTile(tile, frameState);
          if (stoppedRefining) {
            this.selectTile(tile, frameState);
          }
        }
        this.touchTile(tile, frameState);
        tile._shouldRefine = shouldRefine && parentRefines;
      }
      var newTime = new Date().getTime();
      if (this.traversalFinished(frameState) || newTime - this.lastUpdate > this.updateDebounceTime) {
        this.lastUpdate = newTime;
        this.options.onTraversalEnd(frameState);
      }
    }
  }, {
    key: "updateChildTiles",
    value: function updateChildTiles(tile, frameState) {
      var children = tile.children;
      var _iterator = _createForOfIteratorHelper(children),
        _step;
      try {
        for (_iterator.s(); !(_step = _iterator.n()).done;) {
          var child = _step.value;
          this.updateTile(child, frameState);
        }
      } catch (err) {
        _iterator.e(err);
      } finally {
        _iterator.f();
      }
    }
  }, {
    key: "updateAndPushChildren",
    value: function updateAndPushChildren(tile, frameState, stack, depth) {
      var _this$options = this.options,
        loadSiblings = _this$options.loadSiblings,
        skipLevelOfDetail = _this$options.skipLevelOfDetail;
      var children = tile.children;
      children.sort(this.compareDistanceToCamera.bind(this));
      var checkRefines = tile.refine === _constants.TILE_REFINEMENT.REPLACE && tile.hasRenderContent && !skipLevelOfDetail;
      var hasVisibleChild = false;
      var refines = true;
      var _iterator2 = _createForOfIteratorHelper(children),
        _step2;
      try {
        for (_iterator2.s(); !(_step2 = _iterator2.n()).done;) {
          var child = _step2.value;
          child._selectionDepth = depth;
          if (child.isVisibleAndInRequestVolume) {
            if (stack.find(child)) {
              stack.delete(child);
            }
            stack.push(child);
            hasVisibleChild = true;
          } else if (checkRefines || loadSiblings) {
            this.loadTile(child, frameState);
            this.touchTile(child, frameState);
          }
          if (checkRefines) {
            var childRefines = void 0;
            if (!child._inRequestVolume) {
              childRefines = false;
            } else if (!child.hasRenderContent) {
              childRefines = this.executeEmptyTraversal(child, frameState);
            } else {
              childRefines = child.contentAvailable;
            }
            refines = refines && childRefines;
            if (!refines) {
              return false;
            }
          }
        }
      } catch (err) {
        _iterator2.e(err);
      } finally {
        _iterator2.f();
      }
      if (!hasVisibleChild) {
        refines = false;
      }
      return refines;
    }
  }, {
    key: "updateTile",
    value: function updateTile(tile, frameState) {
      this.updateTileVisibility(tile, frameState);
    }
  }, {
    key: "selectTile",
    value: function selectTile(tile, frameState) {
      if (this.shouldSelectTile(tile)) {
        tile._selectedFrame = frameState.frameNumber;
        this.selectedTiles[tile.id] = tile;
      }
    }
  }, {
    key: "loadTile",
    value: function loadTile(tile, frameState) {
      if (this.shouldLoadTile(tile)) {
        tile._requestedFrame = frameState.frameNumber;
        tile._priority = tile._getPriority();
        this.requestedTiles[tile.id] = tile;
      }
    }
  }, {
    key: "touchTile",
    value: function touchTile(tile, frameState) {
      tile.tileset._cache.touch(tile);
      tile._touchedFrame = frameState.frameNumber;
    }
  }, {
    key: "canTraverse",
    value: function canTraverse(tile, frameState) {
      var useParentMetric = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;
      var ignoreVisibility = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : false;
      if (!tile.hasChildren) {
        return false;
      }
      if (tile.hasTilesetContent) {
        return !tile.contentExpired;
      }
      if (!ignoreVisibility && !tile.isVisibleAndInRequestVolume) {
        return false;
      }
      return this.shouldRefine(tile, frameState, useParentMetric);
    }
  }, {
    key: "shouldLoadTile",
    value: function shouldLoadTile(tile) {
      return tile.hasUnloadedContent || tile.contentExpired;
    }
  }, {
    key: "shouldSelectTile",
    value: function shouldSelectTile(tile) {
      return tile.contentAvailable && !this.options.skipLevelOfDetail;
    }
  }, {
    key: "shouldRefine",
    value: function shouldRefine(tile, frameState) {
      var useParentMetric = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;
      var screenSpaceError = tile._screenSpaceError;
      if (useParentMetric) {
        screenSpaceError = tile.getScreenSpaceError(frameState, true);
      }
      return screenSpaceError > this.options.maximumScreenSpaceError;
    }
  }, {
    key: "updateTileVisibility",
    value: function updateTileVisibility(tile, frameState) {
      var viewportIds = [];
      if (this.options.viewportTraversersMap) {
        for (var key in this.options.viewportTraversersMap) {
          var value = this.options.viewportTraversersMap[key];
          if (value === frameState.viewport.id) {
            viewportIds.push(key);
          }
        }
      } else {
        viewportIds.push(frameState.viewport.id);
      }
      tile.updateVisibility(frameState, viewportIds);
    }
  }, {
    key: "compareDistanceToCamera",
    value: function compareDistanceToCamera(b, a) {
      return b._distanceToCamera - a._distanceToCamera;
    }
  }, {
    key: "anyChildrenVisible",
    value: function anyChildrenVisible(tile, frameState) {
      var anyVisible = false;
      var _iterator3 = _createForOfIteratorHelper(tile.children),
        _step3;
      try {
        for (_iterator3.s(); !(_step3 = _iterator3.n()).done;) {
          var child = _step3.value;
          child.updateVisibility(frameState);
          anyVisible = anyVisible || child.isVisibleAndInRequestVolume;
        }
      } catch (err) {
        _iterator3.e(err);
      } finally {
        _iterator3.f();
      }
      return anyVisible;
    }
  }, {
    key: "executeEmptyTraversal",
    value: function executeEmptyTraversal(root, frameState) {
      var allDescendantsLoaded = true;
      var stack = this._emptyTraversalStack;
      stack.push(root);
      while (stack.length > 0 && allDescendantsLoaded) {
        var tile = stack.pop();
        this.updateTile(tile, frameState);
        if (!tile.isVisibleAndInRequestVolume) {
          this.loadTile(tile, frameState);
        }
        this.touchTile(tile, frameState);
        var traverse = !tile.hasRenderContent && this.canTraverse(tile, frameState, false, true);
        if (traverse) {
          var children = tile.children;
          var _iterator4 = _createForOfIteratorHelper(children),
            _step4;
          try {
            for (_iterator4.s(); !(_step4 = _iterator4.n()).done;) {
              var child = _step4.value;
              if (stack.find(child)) {
                stack.delete(child);
              }
              stack.push(child);
            }
          } catch (err) {
            _iterator4.e(err);
          } finally {
            _iterator4.f();
          }
        } else if (!tile.contentAvailable) {
          allDescendantsLoaded = false;
        }
      }
      return allDescendantsLoaded;
    }
  }]);
  return TilesetTraverser;
}();
exports.TilesetTraverser = TilesetTraverser;
//# sourceMappingURL=tileset-traverser.js.map