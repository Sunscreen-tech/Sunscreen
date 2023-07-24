"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.TilesetCache = void 0;
var _classCallCheck2 = _interopRequireDefault(require("@babel/runtime/helpers/classCallCheck"));
var _createClass2 = _interopRequireDefault(require("@babel/runtime/helpers/createClass"));
var _defineProperty2 = _interopRequireDefault(require("@babel/runtime/helpers/defineProperty"));
var _doublyLinkedList = require("../utils/doubly-linked-list");
var TilesetCache = function () {
  function TilesetCache() {
    (0, _classCallCheck2.default)(this, TilesetCache);
    (0, _defineProperty2.default)(this, "_list", void 0);
    (0, _defineProperty2.default)(this, "_sentinel", void 0);
    (0, _defineProperty2.default)(this, "_trimTiles", void 0);
    this._list = new _doublyLinkedList.DoublyLinkedList();
    this._sentinel = this._list.add('sentinel');
    this._trimTiles = false;
  }
  (0, _createClass2.default)(TilesetCache, [{
    key: "reset",
    value: function reset() {
      this._list.splice(this._list.tail, this._sentinel);
    }
  }, {
    key: "touch",
    value: function touch(tile) {
      var node = tile._cacheNode;
      if (node) {
        this._list.splice(this._sentinel, node);
      }
    }
  }, {
    key: "add",
    value: function add(tileset, tile, addCallback) {
      if (!tile._cacheNode) {
        tile._cacheNode = this._list.add(tile);
        if (addCallback) {
          addCallback(tileset, tile);
        }
      }
    }
  }, {
    key: "unloadTile",
    value: function unloadTile(tileset, tile, unloadCallback) {
      var node = tile._cacheNode;
      if (!node) {
        return;
      }
      this._list.remove(node);
      tile._cacheNode = null;
      if (unloadCallback) {
        unloadCallback(tileset, tile);
      }
    }
  }, {
    key: "unloadTiles",
    value: function unloadTiles(tileset, unloadCallback) {
      var trimTiles = this._trimTiles;
      this._trimTiles = false;
      var list = this._list;
      var maximumMemoryUsageInBytes = tileset.maximumMemoryUsage * 1024 * 1024;
      var sentinel = this._sentinel;
      var node = list.head;
      while (node !== sentinel && (tileset.gpuMemoryUsageInBytes > maximumMemoryUsageInBytes || trimTiles)) {
        var tile = node.item;
        node = node.next;
        this.unloadTile(tileset, tile, unloadCallback);
      }
    }
  }, {
    key: "trim",
    value: function trim() {
      this._trimTiles = true;
    }
  }]);
  return TilesetCache;
}();
exports.TilesetCache = TilesetCache;
//# sourceMappingURL=tileset-cache.js.map